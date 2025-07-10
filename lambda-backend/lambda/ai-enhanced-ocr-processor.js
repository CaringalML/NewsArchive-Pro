const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');
const { correctOCRText, documentTypeEnhancements } = require('./enhanced-rule-based-corrector');
const { getOCRJob, updateOCRJob } = require('./dynamodb-client');
const https = require('https');
const http = require('http');

// AWS SDK clients
const region = process.env.AWS_REGION || 'ap-southeast-2';
const s3Client = new S3Client({ region });
const textractClient = new TextractClient({ region });

// Helper function to detect document type from filename or content
function detectDocumentType(filename, extractedText) {
    const lowerFilename = filename?.toLowerCase() || '';
    const lowerText = extractedText?.toLowerCase() || '';
    
    // Check filename patterns
    if (lowerFilename.includes('invoice') || lowerFilename.includes('receipt')) {
        return 'invoice';
    }
    if (lowerFilename.includes('card') || lowerFilename.includes('id')) {
        return 'idCard';
    }
    if (lowerFilename.includes('business') || lowerFilename.includes('contact')) {
        return 'businessCard';
    }
    
    // Check content patterns
    if (lowerText.includes('invoice') || lowerText.includes('total') || lowerText.includes('amount')) {
        return 'invoice';
    }
    if (lowerText.includes('name:') || lowerText.includes('address:') || lowerText.includes('id:')) {
        return 'idCard';
    }
    if (lowerText.includes('email') || lowerText.includes('phone') || lowerText.includes('mobile')) {
        return 'businessCard';
    }
    
    return 'general';
}

// Helper function to download image from URL
async function downloadImage(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        
        protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${response.statusCode}`));
                return;
            }
            
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const contentType = response.headers['content-type'] || 'image/jpeg';
                resolve({ buffer, contentType });
            });
        }).on('error', reject);
    });
}

// Helper function to upload image to S3
async function uploadToS3(buffer, bucket, key, contentType) {
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
            'uploaded-by': 'ai-enhanced-ocr-processor',
            'upload-time': new Date().toISOString()
        }
    });
    
    return await s3Client.send(command);
}

// Helper function to start Textract processing
async function startTextractJob(bucket, key, jobType = 'DOCUMENT_TEXT_DETECTION') {
    const params = {
        DocumentLocation: {
            S3Object: {
                Bucket: bucket,
                Name: key
            }
        },
        JobTag: `ai-enhanced-ocr-${Date.now()}`
    };
    
    if (jobType === 'DOCUMENT_ANALYSIS') {
        params.FeatureTypes = ['TABLES', 'FORMS'];
    }
    
    const command = new StartDocumentTextDetectionCommand(params);
    return await textractClient.send(command);
}

// Helper function to get Textract results
async function getTextractResults(jobId) {
    const command = new GetDocumentTextDetectionCommand({
        JobId: jobId
    });
    return await textractClient.send(command);
}

// Optimized fast polling with smart backoff
async function waitForTextractCompletion(jobId, maxWaitTime = 180000) { // 3 minutes max
    const startTime = Date.now();
    let waitTime = 500; // Start with 500ms - much faster!
    let attempts = 0;
    
    console.log(`⚡ Fast polling for Textract job: ${jobId}`);
    
    while (Date.now() - startTime < maxWaitTime) {
        attempts++;
        
        try {
            const results = await getTextractResults(jobId);
            
            console.log(`📋 Attempt ${attempts}: ${results.JobStatus} (${Math.round((Date.now() - startTime) / 1000)}s)`);
            
            if (results.JobStatus === 'SUCCEEDED') {
                console.log(`✅ Textract completed in ${attempts} attempts (${Math.round((Date.now() - startTime) / 1000)}s)`);
                return results;
            } else if (results.JobStatus === 'FAILED') {
                throw new Error(`Textract job failed: ${results.StatusMessage}`);
            }
            
            // Still in progress - optimized wait pattern
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Optimized backoff: 500ms → 1s → 2s → 3s → 5s (max)
            if (attempts < 3) {
                waitTime = 500; // First 3 attempts: 500ms
            } else if (attempts < 6) {
                waitTime = 1000; // Next 3 attempts: 1s
            } else if (attempts < 10) {
                waitTime = 2000; // Next 4 attempts: 2s
            } else {
                waitTime = 5000; // After that: 5s
            }
            
        } catch (error) {
            if (error.name === 'InvalidJobIdException') {
                throw new Error(`Invalid Textract job ID: ${jobId}`);
            }
            
            console.log(`⚠️ Polling attempt ${attempts} failed: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    throw new Error(`⏰ Textract job ${jobId} timed out after ${Math.round(maxWaitTime / 1000)} seconds`);
}

// Extract and format text from Textract results
function extractTextFromResults(results) {
    const extractedText = results.Blocks
        ?.filter(block => block.BlockType === 'LINE')
        ?.map(block => block.Text)
        ?.join('\n') || '';
    
    const confidenceScores = results.Blocks
        ?.filter(block => block.Confidence)
        ?.map(block => block.Confidence) || [];
    
    const avgConfidence = confidenceScores.length > 0 
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
        : null;
    
    return { extractedText, avgConfidence };
}

// Update DynamoDB with error handling and retries
async function updateDynamoDBJob(jobId, createdAt, updates, description) {
    const maxRetries = 3;
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            await updateOCRJob(jobId, createdAt, updates);
            console.log(`💾 Database updated: ${description}`);
            return;
        } catch (error) {
            lastError = error;
            console.log(`⚠️ Database update failed (attempt ${i + 1}): ${error.message}`);
            
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 1s, 2s, 3s delays
            }
        }
    }
    
    throw new Error(`Database update failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Process individual OCR job with AI enhancement
async function processOCRJob(jobData) {
    const { jobId, createdAt, s3Bucket, s3Key, userId, ocrSettings, imageUrl, originalFilename } = jobData;
    
    try {
        console.log(`🚀 Starting AI-enhanced OCR processing for job ${jobId} (user ${userId})`);
        
        // Update job status to processing
        await updateDynamoDBJob(
            jobId,
            createdAt,
            {
                status: 'processing',
                processing_stage: 'ai_enhanced_processing',
                textract_started_at: new Date().toISOString()
            },
            `Job ${jobId} marked as processing`
        );
        
        // Check if file exists in S3 or needs download
        let fileExists = false;
        if (s3Key && !imageUrl) {
            try {
                await s3Client.send(new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key }));
                fileExists = true;
                console.log(`📁 File verified in S3: ${s3Key}`);
            } catch (error) {
                console.log(`📁 File not found in S3: ${s3Key}, will try to download from URL`);
            }
        }
        
        // Download and upload if necessary
        if (!fileExists && imageUrl) {
            console.log(`⬇️ Downloading image from URL: ${imageUrl}`);
            
            await updateDynamoDBJob(
                jobId,
                createdAt,
                {
                    processing_stage: 'downloading_image'
                },
                `Job ${jobId} downloading image`
            );
            
            const { buffer, contentType } = await downloadImage(imageUrl);
            
            console.log(`⬆️ Uploading to S3: ${s3Bucket}/${s3Key}`);
            await uploadToS3(buffer, s3Bucket, s3Key, contentType);
            
            await updateDynamoDBJob(
                jobId,
                createdAt,
                {
                    processing_stage: 'image_uploaded',
                    upload_completed_at: new Date().toISOString(),
                    file_size: buffer.length,
                    mime_type: contentType
                },
                `Job ${jobId} image uploaded`
            );
            
        } else if (!fileExists) {
            throw new Error('No image source available - neither S3 file nor imageUrl provided');
        }
        
        // Start Textract processing
        console.log(`🔍 Starting Textract job for: ${s3Key}`);
        const textractResponse = await startTextractJob(
            s3Bucket, 
            s3Key, 
            ocrSettings?.analysisType || 'DOCUMENT_TEXT_DETECTION'
        );
        
        // Update job with Textract job ID
        await updateDynamoDBJob(
            jobId,
            createdAt,
            {
                processing_stage: 'textract_processing',
                textract_job_id: textractResponse.JobId,
                textract_started_at: new Date().toISOString()
            },
            `Job ${jobId} Textract started`
        );
        
        console.log(`🤖 Textract job started: ${textractResponse.JobId}`);
        
        // Wait for completion with smart polling
        const results = await waitForTextractCompletion(textractResponse.JobId);
        
        // Extract text and confidence
        const { extractedText, avgConfidence } = extractTextFromResults(results);
        
        console.log(`📝 Raw OCR text (${extractedText.length} chars): "${extractedText.substring(0, 100)}..."`);
        console.log(`📊 OCR confidence: ${avgConfidence?.toFixed(2)}%`);
        
        // Apply AI autocorrection
        console.log(`🧠 Applying AI autocorrection...`);
        await updateDynamoDBJob(
            jobId,
            createdAt,
            {
                processing_stage: 'ai_correction'
            },
            `Job ${jobId} AI correction started`
        );
        
        // Detect document type
        const documentType = detectDocumentType(originalFilename, extractedText);
        console.log(`📄 Detected document type: ${documentType}`);
        
        // Apply intelligent rule-based correction
        let correctionResult = correctOCRText(extractedText, {
            preserveCase: true,
            preserveFormat: true,
            aggressiveCorrection: true
        });
        
        // Apply document-specific enhancements
        if (documentTypeEnhancements[documentType]) {
            const enhanced = documentTypeEnhancements[documentType](correctionResult.corrected);
            correctionResult = {
                ...correctionResult,
                corrected: enhanced
            };
        }
        
        const finalText = correctionResult.corrected;
        const correctionConfidence = correctionResult.confidence;
        
        console.log(`✨ AI-corrected text: "${finalText.substring(0, 100)}..."`);
        console.log(`🎯 Correction confidence: ${(correctionConfidence * 100).toFixed(1)}%`);
        console.log(`🔧 Correction model: ${correctionResult.model}`);
        
        // Calculate combined confidence score
        const combinedConfidence = (avgConfidence * 0.7 + correctionConfidence * 100 * 0.3) / 100;
        
        // Update job with final results
        await updateDynamoDBJob(
            jobId,
            createdAt,
            {
                status: 'completed',
                processing_stage: 'completed',
                extracted_text: extractedText,
                corrected_text: finalText,
                confidence_score: avgConfidence,
                correction_confidence: correctionConfidence,
                correction_model: correctionResult.model,
                document_type: documentType,
                textract_response: JSON.stringify({
                    JobId: textractResponse.JobId,
                    BlockCount: results.Blocks?.length || 0,
                    ProcessingTime: Date.now() - new Date(jobData.createdAt).getTime()
                }),
                textract_completed_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                combined_confidence: combinedConfidence,
                corrections_applied: correctionResult.corrections || 0,
                ai_enhancements: {
                    documentType,
                    corrections: correctionResult.corrections,
                    confidence: correctionConfidence,
                    model: correctionResult.model
                }
            },
            `Job ${jobId} completed successfully`
        );
        
        console.log(`✅ AI-enhanced OCR processing completed for job ${jobId}`);
        console.log(`📈 Combined confidence: ${(combinedConfidence * 100).toFixed(1)}%`);
        
        return {
            success: true,
            jobId,
            extractedText,
            correctedText: finalText,
            confidence: combinedConfidence,
            documentType,
            correctionModel: correctionResult.model
        };
        
    } catch (error) {
        console.error(`❌ Error processing AI-enhanced OCR job ${jobId}:`, error);
        
        // Update job status to failed
        try {
            await updateDynamoDBJob(
                jobId,
                createdAt,
                {
                    status: 'failed',
                    processing_stage: 'failed',
                    error: error.message,
                    failed_at: new Date().toISOString()
                },
                `Job ${jobId} marked as failed`
            );
        } catch (updateError) {
            console.error(`Failed to update job status to failed:`, updateError);
        }
        
        throw error;
    }
}

// Lambda handler function for SQS messages
exports.handler = async (event) => {
    console.log('🚀 OCR Processor Lambda triggered for immediate processing');
    console.log(`📦 Processing ${event.Records.length} message(s)`);
    
    const results = [];
    const batchItemFailures = [];
    
    // Process each SQS message
    for (const record of event.Records) {
        let messageBody;
        let jobId = 'unknown';
        
        try {
            messageBody = JSON.parse(record.body);
            jobId = messageBody.job_id;
            
            console.log(`🔄 Starting immediate processing for job: ${jobId}`);
            
            // Validate required fields
            if (!messageBody.job_id || !messageBody.created_at || !messageBody.s3_bucket || !messageBody.s3_key) {
                throw new Error('Missing required fields in message body');
            }
            
            // Process the OCR job
            const jobData = {
                jobId: messageBody.job_id,
                createdAt: messageBody.created_at,
                s3Bucket: messageBody.s3_bucket,
                s3Key: messageBody.s3_key,
                userId: messageBody.user_id,
                locationId: messageBody.location_id,
                originalFilename: messageBody.filename || 'unknown.jpg'
            };
            
            const result = await processOCRJob(jobData);
            results.push({
                messageId: record.messageId,
                success: true,
                jobId: messageBody.job_id,
                result: result
            });
            
            console.log(`✅ Successfully processed OCR job: ${messageBody.job_id} in immediate mode`);
            
        } catch (error) {
            console.error(`❌ Failed to process OCR job ${jobId}:`, error);
            
            // Add to batch item failures to prevent reprocessing successful messages
            batchItemFailures.push({
                itemIdentifier: record.messageId
            });
            
            results.push({
                messageId: record.messageId,
                success: false,
                jobId: jobId,
                error: error.message
            });
            
            // Try to update job status to failed if we have the job info
            if (messageBody && messageBody.job_id && messageBody.created_at) {
                try {
                    await updateDynamoDBJob(
                        messageBody.job_id,
                        messageBody.created_at,
                        {
                            status: 'failed',
                            processing_stage: 'lambda_error',
                            error: error.message,
                            failed_at: new Date().toISOString()
                        },
                        `Job ${messageBody.job_id} failed in Lambda handler`
                    );
                } catch (updateError) {
                    console.error(`Failed to update job status to failed:`, updateError);
                }
            }
        }
    }
    
    // Return batch item failures to handle partial batch failures properly
    const response = {
        statusCode: 200,
        body: JSON.stringify({
            message: 'OCR processing completed with immediate polling',
            processed: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results: results
        })
    };
    
    // If there are failures, include batchItemFailures in response
    if (batchItemFailures.length > 0) {
        response.batchItemFailures = batchItemFailures;
        console.log(`⚠️ ${batchItemFailures.length} message(s) will be retried or moved to DLQ`);
    }
    
    return response;
};

// Export the main processing function
module.exports = {
    ...module.exports,
    processOCRJob,
    detectDocumentType,
    waitForTextractCompletion,
    extractTextFromResults
};