/**
 * Lambda #2: Batch Job Submitter
 * Polls SQS queue and submits AWS Batch jobs for OCR processing
 */

const AWS = require('aws-sdk');

const batch = new AWS.Batch({
    region: process.env.AWS_REGION || 'ap-southeast-2'
});

const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION || 'ap-southeast-2',
    maxRetries: 3
});

const sqs = new AWS.SQS({
    region: process.env.AWS_REGION || 'ap-southeast-2'
});

exports.handler = async (event) => {
    console.log('🚀 Batch Job Submitter triggered');
    console.log('📨 SQS Event:', JSON.stringify(event, null, 2));

    try {
        const promises = event.Records.map(async (record) => {
            const messageBody = JSON.parse(record.body);
            const { job_id, user_id, s3_bucket, s3_key, file_name, file_size } = messageBody;

            console.log(`🔄 Processing job submission for job_id: ${job_id}`);

            // Update job status to 'queued' in DynamoDB
            await updateJobStatus(job_id, 'queued', { 
                message: 'Job submitted to Batch queue',
                updated_at: new Date().toISOString()
            });

            // Submit Batch job
            const jobParams = {
                jobName: `ocr-job-${job_id}`,
                jobQueue: process.env.BATCH_JOB_QUEUE,
                jobDefinition: process.env.BATCH_JOB_DEFINITION,
                parameters: {
                    jobId: job_id,
                    userId: user_id,
                    s3Bucket: s3_bucket,
                    s3Key: s3_key,
                    fileName: file_name,
                    fileSize: file_size.toString()
                },
                tags: {
                    JobId: job_id,
                    UserId: user_id,
                    Service: 'newsarchive-ocr'
                }
            };

            console.log('📦 Submitting Batch job:', jobParams.jobName);
            const batchResponse = await batch.submitJob(jobParams).promise();
            
            console.log(`✅ Batch job submitted successfully: ${batchResponse.jobId}`);

            // Update DynamoDB with Batch job ID
            await updateJobStatus(job_id, 'submitted', {
                batch_job_id: batchResponse.jobId,
                batch_job_name: batchResponse.jobName,
                message: 'Batch job submitted successfully',
                updated_at: new Date().toISOString()
            });

            console.log(`🎯 Job ${job_id} successfully submitted to Batch as ${batchResponse.jobId}`);
        });

        await Promise.all(promises);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Batch jobs submitted successfully',
                processedMessages: event.Records.length
            })
        };

    } catch (error) {
        console.error('❌ Error submitting Batch jobs:', error);
        
        // Update job status to failed if we have job_id
        if (event.Records.length > 0) {
            try {
                const record = event.Records[0];
                const messageBody = JSON.parse(record.body);
                const { job_id } = messageBody;
                
                await updateJobStatus(job_id, 'failed', {
                    error: error.message,
                    message: 'Failed to submit Batch job',
                    updated_at: new Date().toISOString()
                });
            } catch (updateError) {
                console.error('❌ Failed to update job status:', updateError);
            }
        }
        
        throw error;
    }
};

/**
 * Update job status in DynamoDB
 */
async function updateJobStatus(jobId, status, additionalFields = {}) {
    const updateParams = {
        TableName: process.env.DYNAMODB_TABLE_OCR_JOBS,
        Key: {
            job_id: jobId
        },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: {
            '#status': 'status'
        },
        ExpressionAttributeValues: {
            ':status': status
        }
    };

    // Add additional fields to update
    Object.keys(additionalFields).forEach((key, index) => {
        updateParams.UpdateExpression += `, #${key} = :${key}`;
        updateParams.ExpressionAttributeNames[`#${key}`] = key;
        updateParams.ExpressionAttributeValues[`:${key}`] = additionalFields[key];
    });

    console.log(`📝 Updating job ${jobId} status to: ${status}`);
    await dynamodb.update(updateParams).promise();
}