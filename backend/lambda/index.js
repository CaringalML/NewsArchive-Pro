const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const Busboy = require('busboy');

// Import DynamoDB helper functions
const {
    createUser,
    getUser,
    getUserByEmail,
    createOCRJob,
    getOCRJob,
    updateOCRJob,
    deleteOCRJob,
    deleteOCRGroup,
    getOCRJobsByUser,
    getOCRJobsByStatus
} = require('./dynamodb-client');

// Import intelligent OCR router
const { intelligentOCRRouter } = require('./intelligent-ocr-router');

// AWS SDK clients
const region = process.env.AWS_REGION || 'ap-southeast-2';
const sqsClient = new SQSClient({ region });
const s3Client = new S3Client({ region });
const dynamoDbClient = new DynamoDBClient({ region });
const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient);

// Environment variables
const S3_BUCKET = process.env.S3_BUCKET || 'newsarchivepro-images-1747a635';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || 'dnit1caol1xgt.cloudfront.net';
const OCR_QUEUE_URL = process.env.OCR_QUEUE_URL;
const NOTIFICATION_QUEUE_URL = process.env.NOTIFICATION_QUEUE_URL;

// DynamoDB Tables
const TABLES = {
    USERS: process.env.USERS_TABLE || 'newsarchivepro-users',
    OCR_JOBS: process.env.OCR_JOBS_TABLE || 'newsarchivepro-ocr-jobs'
};

// Helper function to parse multipart form data
function parseMultipartForm(event) {
    return new Promise((resolve, reject) => {
        // Check multiple header formats
        const contentType = event.headers['content-type'] || 
                          event.headers['Content-Type'] || 
                          event.headers['CONTENT-TYPE'];
        
        const boundary = contentType?.match(/boundary=([^;]+)/)?.[1];
        
        if (!boundary) {
            console.error('No boundary found in content-type. Available headers:', Object.keys(event.headers));
            reject(new Error(`No boundary found in content-type. Content-Type: ${contentType}`));
            return;
        }

        const busboy = Busboy({ 
            headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
            limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
        });

        const fields = {};
        const files = {};

        busboy.on('field', (fieldname, val) => {
            fields[fieldname] = val;
        });

        busboy.on('file', (fieldname, file, info) => {
            const { filename, encoding, mimeType } = info;
            const chunks = [];
            
            file.on('data', (chunk) => {
                chunks.push(chunk);
            });
            
            file.on('end', () => {
                files[fieldname] = {
                    filename: filename || 'uploaded-file',
                    encoding,
                    mimeType,
                    buffer: Buffer.concat(chunks)
                };
            });
        });

        busboy.on('finish', () => {
            resolve({ fields, files });
        });

        busboy.on('error', reject);

        // Write the body to busboy
        const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
        busboy.write(body);
        busboy.end();
    });
}

// Helper function to upload file to S3
async function uploadFileToS3(buffer, key, contentType) {
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
            'uploaded-by': 'lambda-api',
            'upload-time': new Date().toISOString()
        }
    });
    
    return await s3Client.send(command);
}

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // Extract the path and HTTP method from the request
    // Handle both API Gateway v1 and v2 event structures
    let requestPath = event.rawPath || event.requestContext?.http?.path || event.requestContext?.path || event.path || '/';
    const httpMethod = event.requestContext?.http?.method || event.requestContext?.httpMethod || event.httpMethod || 'GET';
    
    // Strip the stage prefix if present (e.g., /dev/images -> /images)
    const stageName = event.requestContext?.stage || 'dev';
    if (requestPath.startsWith(`/${stageName}/`)) {
        requestPath = requestPath.substring(stageName.length + 1);
    } else if (requestPath.startsWith(`/${stageName}`)) {
        requestPath = requestPath.substring(stageName.length);
    }
    
    // Ensure path starts with /
    if (!requestPath.startsWith('/')) {
        requestPath = '/' + requestPath;
    }
    
    // Log essential request info for debugging
    console.log(`${httpMethod} ${requestPath}`);
    
    // CORS headers for all responses
    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    try {
        // Handle preflight OPTIONS requests
        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'CORS preflight' })
            };
        }

        // Route: GET /newsarchivepro
        if (requestPath === '/newsarchivepro' && httpMethod === 'GET') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'NewsArchivePro API is running!',
                    path: requestPath,
                    method: httpMethod,
                    timestamp: new Date().toISOString(),
                    requestId: event.requestContext?.requestId || 'unknown'
                })
            };
        }

        // Route: GET /users - Get all users (Note: DynamoDB doesn't support getting all items easily, might need to implement pagination)
        if (requestPath === '/users' && httpMethod === 'GET') {
            try {
                console.log('Getting users from DynamoDB...');
                // Note: This is not recommended for production as it scans the entire table
                // Consider implementing pagination or specific query patterns
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: 'Users list endpoint - please use specific user queries',
                        info: 'DynamoDB is optimized for key-based queries, not full table scans',
                        timestamp: new Date().toISOString()
                    })
                };
            } catch (error) {
                console.error('DynamoDB error:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Database Error',
                        message: error.message,
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }

        // Route: POST /users - Create a new user
        if (requestPath === '/users' && httpMethod === 'POST') {
            try {
                const requestBody = JSON.parse(event.body || '{}');
                const { name, email, message } = requestBody;
                
                // Validate required fields
                if (!name || !email) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            error: 'Bad Request',
                            message: 'Name and email are required fields',
                            required: ['name', 'email'],
                            optional: ['message']
                        })
                    };
                }

                // Check if user with email already exists
                const existingUser = await getUserByEmail(email);
                if (existingUser) {
                    return {
                        statusCode: 409,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            error: 'Conflict',
                            message: 'User with this email already exists'
                        })
                    };
                }

                // Create new user
                const userData = {
                    user_id: uuidv4(),
                    name,
                    email,
                    message: message || ''
                };

                const newUser = await createUser(userData);
                
                return {
                    statusCode: 201,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: 'User created successfully',
                        data: newUser,
                        timestamp: new Date().toISOString()
                    })
                };
            } catch (error) {
                console.error('DynamoDB error:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Database Error',
                        message: error.message,
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }

        // Route: GET /users/email/:email - Get user by email
        if (requestPath.match(/^\/users\/email\/[^\/]+$/) && httpMethod === 'GET') {
            const email = decodeURIComponent(requestPath.split('/')[3]);
            
            if (!email) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Bad Request',
                        message: 'Invalid email'
                    })
                };
            }

            try {
                const user = await getUserByEmail(email);
                
                if (!user) {
                    return {
                        statusCode: 404,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            error: 'Not Found',
                            message: 'User not found'
                        })
                    };
                }
                
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: 'User retrieved successfully',
                        data: user,
                        timestamp: new Date().toISOString()
                    })
                };
            } catch (error) {
                console.error('DynamoDB error:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Database Error',
                        message: error.message,
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }

        // Route: GET /users/:id - Get user by ID
        if (requestPath.startsWith('/users/') && httpMethod === 'GET' && !requestPath.includes('/email/')) {
            const userId = requestPath.split('/')[2];
            
            if (!userId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Bad Request',
                        message: 'Invalid user ID'
                    })
                };
            }

            try {
                const user = await getUser(userId);
                
                if (!user) {
                    return {
                        statusCode: 404,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            error: 'Not Found',
                            message: 'User not found'
                        })
                    };
                }
                
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: 'User retrieved successfully',
                        data: user,
                        timestamp: new Date().toISOString()
                    })
                };
            } catch (error) {
                console.error('DynamoDB error:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Database Error',
                        message: error.message,
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }


        // Route: POST /images - Upload image and trigger OCR
        if (requestPath === '/images' && httpMethod === 'POST') {
            try {
                console.log('Processing image upload request...');
                
                // Parse multipart form data
                const { fields, files } = await parseMultipartForm(event);
                console.log(`Parsed form data: ${Object.keys(fields).length} fields, ${Object.keys(files).length} files`);
                
                // Get the uploaded file
                const fileKey = Object.keys(files)[0];
                if (!fileKey) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            error: 'Bad Request',
                            message: 'No file uploaded'
                        })
                    };
                }
                
                const file = files[fileKey];
                const userId = fields.user_id || fields.userId;
                if (!userId) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            error: 'Bad Request',
                            message: 'user_id is required'
                        })
                    };
                }
                
                // Generate unique S3 key
                const fileExtension = file.filename.split('.').pop() || 'jpg';
                const s3Key = `uploads/${userId}/${uuidv4()}.${fileExtension}`;
                
                // Upload to S3
                console.log('Uploading to S3:', { bucket: S3_BUCKET, key: s3Key });
                await uploadFileToS3(file.buffer, s3Key, file.mimeType);
                
                // Parse OCR settings if provided
                let ocrSettings = {};
                if (fields.ocrSettings) {
                    try {
                        ocrSettings = JSON.parse(fields.ocrSettings);
                    } catch (e) {
                        console.log('Failed to parse ocrSettings:', e);
                    }
                }
                
                // Create OCR job record with multi-page document support
                const jobData = {
                    user_id: userId,
                    filename: file.filename,
                    s3_key: s3Key,
                    status: 'pending'
                };
                
                // Add multi-page document fields if present
                if (ocrSettings.groupId) {
                    jobData.group_id = ocrSettings.groupId;
                    jobData.page_number = ocrSettings.pageNumber || 1;
                    jobData.is_multi_page = true;
                }
                
                // Add other OCR settings
                if (ocrSettings.collectionName) {
                    jobData.collection_name = ocrSettings.collectionName;
                }
                
                const ocrJob = await createOCRJob(jobData);
                
                // Initialize routing result
                let routingResult = null;
                
                // Use intelligent routing to decide between Lambda and Batch processing
                if (OCR_QUEUE_URL) {
                    console.log(`🧠 Analyzing processing requirements for job ${ocrJob.job_id}`);
                    
                    const routingData = {
                        job_id: ocrJob.job_id,
                        created_at: ocrJob.created_at,
                        s3_bucket: S3_BUCKET,
                        s3_key: s3Key,
                        user_id: userId,
                        filename: file.filename,
                        file_size: file.buffer.length,
                        group_id: jobData.group_id || null,
                        page_number: jobData.page_number || null,
                        is_multi_page: jobData.is_multi_page || false,
                        page_count: jobData.page_count || 1
                    };
                    
                    // Route the job intelligently
                    routingResult = await intelligentOCRRouter.routeOCRJob(routingData);
                    
                    console.log(`📋 Job ${ocrJob.job_id} routed to ${routingResult.route} processing:`, {
                        processor: routingResult.processor,
                        estimatedTime: routingResult.estimatedTime,
                        queueType: routingResult.queueType
                    });
                }
                
                // Generate CloudFront URL
                const cloudfrontUrl = `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
                
                // Prepare response data
                let responseData = {
                    job_id: ocrJob.job_id,
                    created_at: ocrJob.created_at,
                    s3_key: s3Key,
                    cloudfront_url: cloudfrontUrl,
                    status: OCR_QUEUE_URL ? 'queued' : 'pending'
                };

                // Add routing information if available
                if (routingResult) {
                    responseData.processing = {
                        route: routingResult.route,
                        processor: routingResult.processor,
                        estimated_time: routingResult.estimatedTime,
                        queue_type: routingResult.queueType,
                        batch_job_id: routingResult.batchJobId || null
                    };
                }
                
                return {
                    statusCode: 201,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: `Image uploaded successfully and ${routingResult ? `routed to ${routingResult.route} processing` : 'queued for processing'}`,
                        data: responseData,
                        timestamp: new Date().toISOString()
                    })
                };
            } catch (error) {
                console.error('Error processing image upload:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Internal Server Error',
                        message: error.message,
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }

        // Route: GET /ocr-jobs/:userId - Get OCR jobs for a user
        if (requestPath.match(/^\/ocr-jobs\/[^\/]+$/) && httpMethod === 'GET') {
            const userId = requestPath.split('/')[2];
            
            try {
                const jobs = await getOCRJobsByUser(userId);
                
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: 'OCR jobs retrieved successfully',
                        data: jobs,
                        count: jobs.length,
                        timestamp: new Date().toISOString()
                    })
                };
            } catch (error) {
                console.error('DynamoDB error:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Database Error',
                        message: error.message,
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }

        // Route: GET /ocr-job/:jobId/:createdAt - Get specific OCR job status
        if (requestPath.match(/^\/ocr-job\/[^\/]+\/[^\/]+$/) && httpMethod === 'GET') {
            const pathParts = requestPath.split('/');
            const jobId = pathParts[2];
            const createdAt = decodeURIComponent(pathParts[3]);
            
            try {
                const job = await getOCRJob(jobId, createdAt);
                
                if (!job) {
                    return {
                        statusCode: 404,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            error: 'Not Found',
                            message: 'OCR job not found'
                        })
                    };
                }

                // Parse and format the metadata for better display
                let formattedJob = { ...job };
                
                // Parse JSON fields if they exist
                if (job.entities && typeof job.entities === 'string') {
                    try {
                        formattedJob.entities = JSON.parse(job.entities);
                    } catch (e) {
                        console.error('Error parsing entities:', e);
                    }
                }
                
                if (job.key_phrases && typeof job.key_phrases === 'string') {
                    try {
                        formattedJob.key_phrases = JSON.parse(job.key_phrases);
                    } catch (e) {
                        console.error('Error parsing key_phrases:', e);
                    }
                }
                
                if (job.sentiment && typeof job.sentiment === 'string') {
                    try {
                        formattedJob.sentiment = JSON.parse(job.sentiment);
                    } catch (e) {
                        console.error('Error parsing sentiment:', e);
                    }
                }
                
                if (job.metadata_summary && typeof job.metadata_summary === 'string') {
                    try {
                        formattedJob.metadata_summary = JSON.parse(job.metadata_summary);
                    } catch (e) {
                        console.error('Error parsing metadata_summary:', e);
                    }
                }
                
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: 'OCR job retrieved successfully',
                        data: formattedJob,
                        timestamp: new Date().toISOString()
                    })
                };
            } catch (error) {
                console.error('DynamoDB error:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Database Error',
                        message: error.message,
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }

        // Route: POST /processing-recommendation - Get processing route recommendation
        if (requestPath === '/processing-recommendation' && httpMethod === 'POST') {
            try {
                const requestBody = JSON.parse(event.body || '{}');
                const { fileSize, isMultiPage, pageCount, filename } = requestBody;
                
                if (!fileSize) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            error: 'Bad Request',
                            message: 'fileSize is required'
                        })
                    };
                }
                
                const mockJobData = {
                    file_size: fileSize,
                    is_multi_page: isMultiPage || false,
                    page_count: pageCount || 1,
                    filename: filename || 'document.jpg'
                };
                
                const recommendation = intelligentOCRRouter.getRouteRecommendation(mockJobData);
                
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: 'Processing recommendation generated',
                        data: {
                            recommendation: recommendation.recommendation,
                            processor: recommendation.processor,
                            complexity: recommendation.complexity,
                            estimated_time: `${recommendation.estimatedTime}s`,
                            factors: recommendation.factors
                        },
                        timestamp: new Date().toISOString()
                    })
                };
            } catch (error) {
                console.error('Error generating processing recommendation:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Internal Server Error',
                        message: error.message,
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }

        // Route: GET /document/:groupId - Get all pages of a multi-page document
        if (requestPath.match(/^\/document\/[^\/]+$/) && httpMethod === 'GET') {
            const groupId = requestPath.split('/')[2];
            
            try {
                const params = {
                    TableName: TABLES.OCR_JOBS,
                    IndexName: 'group-index',
                    KeyConditionExpression: 'group_id = :groupId',
                    ExpressionAttributeValues: {
                        ':groupId': groupId
                    },
                    ScanIndexForward: true // Sort by page number ascending
                };
                
                const result = await dynamoDb.send(new QueryCommand(params));
                const pages = result.Items || [];
                
                // Sort pages by page_number
                pages.sort((a, b) => (a.page_number || 0) - (b.page_number || 0));
                
                // Combine text from all pages
                const combinedText = pages
                    .filter(page => page.corrected_text || page.extracted_text)
                    .map(page => page.corrected_text || page.extracted_text)
                    .join('\n\n--- Page Break ---\n\n');
                
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: 'Multi-page document retrieved successfully',
                        data: {
                            group_id: groupId,
                            total_pages: pages.length,
                            pages: pages,
                            combined_text: combinedText
                        },
                        timestamp: new Date().toISOString()
                    })
                };
            } catch (error) {
                console.error('Error retrieving multi-page document:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Database Error',
                        message: error.message,
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }

        // Route: PUT /ocr-job/:jobId/:createdAt - Update OCR job
        if (requestPath.match(/^\/ocr-job\/[^\/]+\/[^\/]+$/) && httpMethod === 'PUT') {
            const pathParts = requestPath.split('/');
            const jobId = pathParts[2];
            const createdAt = decodeURIComponent(pathParts[3]);
            
            try {
                const requestBody = JSON.parse(event.body || '{}');
                
                // Validate that we have some fields to update
                if (Object.keys(requestBody).length === 0) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            error: 'Bad Request',
                            message: 'No fields provided for update'
                        })
                    };
                }
                
                const updatedJob = await updateOCRJob(jobId, createdAt, requestBody);
                
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: 'OCR job updated successfully',
                        data: updatedJob,
                        timestamp: new Date().toISOString()
                    })
                };
            } catch (error) {
                console.error('Error updating OCR job:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Database Error',
                        message: error.message,
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }

        // Route: DELETE /ocr-job/:jobId/:createdAt - Delete single OCR job
        if (requestPath.match(/^\/ocr-job\/[^\/]+\/[^\/]+$/) && httpMethod === 'DELETE') {
            const pathParts = requestPath.split('/');
            const jobId = pathParts[2];
            const createdAt = decodeURIComponent(pathParts[3]);
            
            try {
                const deletedJob = await deleteOCRJob(jobId, createdAt);
                
                if (!deletedJob) {
                    return {
                        statusCode: 404,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            error: 'Not Found',
                            message: 'OCR job not found'
                        })
                    };
                }
                
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: 'OCR job deleted successfully',
                        data: deletedJob,
                        timestamp: new Date().toISOString()
                    })
                };
            } catch (error) {
                console.error('Error deleting OCR job:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Database Error',
                        message: error.message,
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }

        // Route: DELETE /ocr-group/:groupId - Delete entire OCR group
        if (requestPath.match(/^\/ocr-group\/[^\/]+$/) && httpMethod === 'DELETE') {
            const groupId = requestPath.split('/')[2];
            
            try {
                const deleteResult = await deleteOCRGroup(groupId);
                
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: `OCR group deleted successfully`,
                        data: deleteResult,
                        timestamp: new Date().toISOString()
                    })
                };
            } catch (error) {
                console.error('Error deleting OCR group:', error);
                
                if (error.message.includes('No jobs found')) {
                    return {
                        statusCode: 404,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            error: 'Not Found',
                            message: error.message
                        })
                    };
                }
                
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Database Error',
                        message: error.message,
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }

        // Route not found
        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Not Found',
                message: `Route ${httpMethod} ${requestPath} not found`,
                availableRoutes: [
                    'GET /newsarchivepro',
                    'GET /users',
                    'POST /users',
                    'GET /users/:id',
                    'GET /users/email/:email',
                    'POST /images',
                    'POST /processing-recommendation',
                    'GET /ocr-jobs/:userId',
                    'GET /ocr-job/:jobId/:createdAt',
                    'PUT /ocr-job/:jobId/:createdAt',
                    'DELETE /ocr-job/:jobId/:createdAt',
                    'DELETE /ocr-group/:groupId',
                    'GET /document/:groupId'
                ]
            })
        };

    } catch (error) {
        console.error('Unhandled error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal Server Error',
                message: error.message || 'An unexpected error occurred',
                timestamp: new Date().toISOString(),
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};