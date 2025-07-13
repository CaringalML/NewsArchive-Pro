/**
 * Lambda #1: S3 Event Handler
 * Triggered by S3 ObjectCreated events
 * Pushes job metadata to SQS for Batch processing
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION || 'ap-southeast-2',
    maxRetries: 3,
    retryDelayOptions: {
        customBackoff: function(retryCount) {
            return Math.pow(2, retryCount) * 100;
        }
    }
});

const sqs = new AWS.SQS({
    region: process.env.AWS_REGION || 'ap-southeast-2'
});

exports.handler = async (event) => {
    console.log('📧 S3 Event received:', JSON.stringify(event, null, 2));
    
    try {
        const promises = event.Records.map(async (record) => {
            if (record.eventSource !== 'aws:s3' || !record.eventName.startsWith('ObjectCreated')) {
                console.log('⏭️ Skipping non-S3 ObjectCreated event');
                return;
            }

            const bucket = record.s3.bucket.name;
            const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
            const size = record.s3.object.size;

            console.log(`📁 Processing S3 object: s3://${bucket}/${key} (${size} bytes)`);

            // Extract metadata from S3 key (expecting format: uploads/{userId}/{fileName})
            const keyParts = key.split('/');
            if (keyParts.length < 3 || keyParts[0] !== 'uploads') {
                console.log('⚠️ Invalid S3 key format, expected: uploads/{userId}/{fileName}');
                return;
            }

            const userId = keyParts[1];
            const fileName = keyParts.slice(2).join('/');
            const jobId = uuidv4();
            const timestamp = new Date().toISOString();

            // Create OCR job record in DynamoDB
            const ocrJob = {
                job_id: jobId,
                created_at: timestamp,
                user_id: userId,
                file_name: fileName,
                s3_bucket: bucket,
                s3_key: key,
                file_size: size,
                status: 'pending',
                batch_job_id: null,
                updated_at: timestamp
            };

            console.log('💾 Creating OCR job record in DynamoDB:', jobId);
            await dynamodb.put({
                TableName: process.env.DYNAMODB_TABLE_OCR_JOBS,
                Item: ocrJob
            }).promise();

            // Send message to SQS for Batch processing
            const sqsMessage = {
                job_id: jobId,
                user_id: userId,
                s3_bucket: bucket,
                s3_key: key,
                file_name: fileName,
                file_size: size,
                timestamp: timestamp
            };

            console.log('📤 Sending message to SQS queue');
            await sqs.sendMessage({
                QueueUrl: process.env.SQS_QUEUE_URL,
                MessageBody: JSON.stringify(sqsMessage),
                MessageAttributes: {
                    'job_id': {
                        DataType: 'String',
                        StringValue: jobId
                    },
                    'user_id': {
                        DataType: 'String',
                        StringValue: userId
                    }
                }
            }).promise();

            console.log(`✅ Successfully processed S3 event for job ${jobId}`);
        });

        await Promise.all(promises);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'S3 events processed successfully',
                processedRecords: event.Records.length
            })
        };

    } catch (error) {
        console.error('❌ Error processing S3 event:', error);
        
        // Re-throw error to trigger Lambda retry mechanism
        throw error;
    }
};