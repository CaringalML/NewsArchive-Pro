const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const Busboy = require('busboy');

// Import DynamoDB helper functions
const {
    createUser,
    getUser,
    getUserByEmail,
    createLocation,
    getLocation,
    getLocationsByUser,
    createOCRJob,
    getOCRJob,
    updateOCRJob,
    getOCRJobsByUser,
    getOCRJobsByStatus,
    getOCRJobsByLocation
} = require('./dynamodb-client');

// AWS SDK clients
const region = process.env.AWS_REGION || 'ap-southeast-2';
const sqsClient = new SQSClient({ region });
const s3Client = new S3Client({ region });

// Environment variables
const S3_BUCKET = process.env.S3_BUCKET || 'newsarchivepro-images-1747a635';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || 'dnit1caol1xgt.cloudfront.net';
const OCR_QUEUE_URL = process.env.OCR_QUEUE_URL;
const NOTIFICATION_QUEUE_URL = process.env.NOTIFICATION_QUEUE_URL;

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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
        if (requestPath.startsWith('/users/') && httpMethod === 'GET' && !requestPath.includes('/email/') && !requestPath.includes('/locations')) {
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
                
                // Create OCR job record
                const jobData = {
                    user_id: userId,
                    filename: file.filename,
                    s3_key: s3Key,
                    status: 'pending'
                };
                
                const ocrJob = await createOCRJob(jobData);
                
                // Send message to SQS for OCR processing if queue URL is configured
                if (OCR_QUEUE_URL) {
                    const message = {
                        job_id: ocrJob.job_id,
                        created_at: ocrJob.created_at,
                        s3_bucket: S3_BUCKET,
                        s3_key: s3Key,
                        user_id: userId,
                        filename: file.filename
                    };
                    
                    const sqsCommand = new SendMessageCommand({
                        QueueUrl: OCR_QUEUE_URL,
                        MessageBody: JSON.stringify(message),
                        MessageAttributes: {
                            'jobId': {
                                StringValue: ocrJob.job_id,
                                DataType: 'String'
                            },
                            'priority': {
                                StringValue: 'high',
                                DataType: 'String'
                            }
                        }
                    });
                    
                    await sqsClient.send(sqsCommand);
                    console.log('Message sent to OCR queue for immediate processing');
                    
                    // Update job status to queued
                    await updateOCRJob(ocrJob.job_id, ocrJob.created_at, {
                        status: 'queued',
                        queued_at: new Date().toISOString()
                    });
                }
                
                // Generate CloudFront URL
                const cloudfrontUrl = `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
                
                return {
                    statusCode: 201,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: 'Image uploaded successfully and queued for processing',
                        data: {
                            job_id: ocrJob.job_id,
                            created_at: ocrJob.created_at,
                            s3_key: s3Key,
                            cloudfront_url: cloudfrontUrl,
                            status: OCR_QUEUE_URL ? 'queued' : 'pending'
                        },
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
                
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: 'OCR job retrieved successfully',
                        data: job,
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
                    'GET /ocr-jobs/:userId',
                    'GET /ocr-job/:jobId/:createdAt'
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