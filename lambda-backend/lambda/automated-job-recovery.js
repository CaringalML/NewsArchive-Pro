const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { TextractClient, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');
const { getOCRJobsByStatus, updateOCRJob } = require('./dynamodb-client');

// Configuration
const region = process.env.AWS_REGION || 'ap-southeast-2';
const sqsClient = new SQSClient({ region });
const textractClient = new TextractClient({ region });

const OCR_QUEUE_URL = process.env.OCR_QUEUE_URL || 'https://sqs.ap-southeast-2.amazonaws.com/939737198590/newsarchivepro-ocr-queue';

// Helper function to check if a job is stuck
function isJobStuck(job, status, maxAgeMinutes) {
    const jobAge = Date.now() - new Date(job.created_at).getTime();
    const maxAge = maxAgeMinutes * 60 * 1000;
    return jobAge > maxAge;
}

// Automated job recovery system
async function runJobRecovery() {
    try {
        console.log(`🤖 [${new Date().toISOString()}] Automated Job Recovery System started`);
        
        // 1. Find stuck "pending" jobs (should have started processing within 5 minutes)
        const pendingJobs = await getOCRJobsByStatus('pending', 50);
        const stuckPendingJobs = pendingJobs.filter(job => isJobStuck(job, 'pending', 5));
        
        if (stuckPendingJobs.length > 0) {
            console.log(`🔄 Found ${stuckPendingJobs.length} stuck "pending" jobs - triggering processing`);
            
            for (const job of stuckPendingJobs) {
                try {
                    // Re-trigger processing by sending SQS message
                    const sqsMessage = {
                        QueueUrl: OCR_QUEUE_URL,
                        MessageBody: JSON.stringify({
                            jobId: job.job_id,
                            createdAt: job.created_at,
                            s3Bucket: job.s3_bucket || process.env.S3_BUCKET,
                            s3Key: job.s3_key,
                            userId: job.user_id,
                            originalFilename: job.filename,
                            mimeType: job.mime_type,
                            fileSize: job.file_size,
                            ocrSettings: job.ocr_settings || {},
                            timestamp: new Date().toISOString(),
                            recoveryAttempt: true
                        })
                    };
                    
                    await sqsClient.send(new SendMessageCommand(sqsMessage));
                    console.log(`📤 Re-triggered processing for job ${job.job_id}`);
                    
                    // Update job status
                    await updateOCRJob(job.job_id, job.created_at, {
                        processing_stage: 'recovery_triggered',
                        recovery_attempted_at: new Date().toISOString()
                    });
                    
                } catch (error) {
                    console.error(`❌ Failed to re-trigger job ${job.job_id}:`, error.message);
                }
            }
        }
        
        // 2. Find stuck "processing" jobs with Textract job IDs (should complete within 10 minutes)
        const processingJobs = await getOCRJobsByStatus('processing', 50);
        const stuckProcessingJobs = processingJobs.filter(job => 
            job.textract_job_id && isJobStuck(job, 'processing', 10)
        );
        
        if (stuckProcessingJobs.length > 0) {
            console.log(`🔍 Found ${stuckProcessingJobs.length} stuck "processing" jobs - checking Textract status`);
            
            for (const job of stuckProcessingJobs) {
                try {
                    console.log(`🔍 Checking Textract job ${job.textract_job_id} for OCR job ${job.job_id}`);
                    
                    const textractResult = await textractClient.send(
                        new GetDocumentTextDetectionCommand({ JobId: job.textract_job_id })
                    );
                    
                    if (textractResult.JobStatus === 'SUCCEEDED') {
                        // Extract text and complete the job
                        const extractedText = textractResult.Blocks
                            ?.filter(block => block.BlockType === 'LINE')
                            ?.map(block => block.Text)
                            ?.join('\n') || '';
                        
                        const confidenceScores = textractResult.Blocks
                            ?.filter(block => block.Confidence)
                            ?.map(block => block.Confidence) || [];
                        const avgConfidence = confidenceScores.length > 0 
                            ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
                            : null;
                        
                        await updateOCRJob(job.job_id, job.created_at, {
                            status: 'completed',
                            processing_stage: 'auto_recovered',
                            extracted_text: extractedText,
                            confidence_score: avgConfidence,
                            textract_response: JSON.stringify({
                                JobId: textractResult.JobId,
                                BlockCount: textractResult.Blocks?.length || 0,
                                JobStatus: textractResult.JobStatus
                            }),
                            textract_completed_at: new Date().toISOString(),
                            completed_at: new Date().toISOString(),
                            recovery_note: 'Auto-recovered by job recovery system'
                        });
                        
                        console.log(`✅ Auto-completed job ${job.job_id}: "${extractedText.substring(0, 50)}..." (${avgConfidence?.toFixed(1)}% confidence)`);
                        
                    } else if (textractResult.JobStatus === 'FAILED') {
                        await updateOCRJob(job.job_id, job.created_at, {
                            status: 'failed',
                            processing_stage: 'auto_recovery_failed',
                            error: textractResult.StatusMessage || 'Textract failed',
                            textract_completed_at: new Date().toISOString(),
                            failed_at: new Date().toISOString()
                        });
                        console.log(`❌ Auto-failed job ${job.job_id}: ${textractResult.StatusMessage}`);
                        
                    } else {
                        console.log(`⏳ Job ${job.job_id} still processing: ${textractResult.JobStatus}`);
                        
                        // If it's been processing for too long, mark as timed out
                        if (isJobStuck(job, 'processing', 30)) { // 30 minutes
                            await updateOCRJob(job.job_id, job.created_at, {
                                status: 'failed',
                                processing_stage: 'timeout',
                                error: 'Textract processing timeout after 30 minutes',
                                failed_at: new Date().toISOString()
                            });
                            console.log(`⏰ Timed out job ${job.job_id} after 30 minutes`);
                        }
                    }
                    
                } catch (error) {
                    console.error(`❌ Error checking job ${job.job_id}:`, error.message);
                    
                    // If Textract job not found, mark as failed
                    if (error.name === 'InvalidJobIdException') {
                        await updateOCRJob(job.job_id, job.created_at, {
                            status: 'failed',
                            processing_stage: 'invalid_textract_job',
                            error: 'Textract job not found',
                            failed_at: new Date().toISOString()
                        });
                        console.log(`❌ Marked job ${job.job_id} as failed: Invalid Textract job ID`);
                    }
                }
            }
        }
        
        // 3. Find very old pending/processing jobs (older than 1 hour) and mark as failed
        const allPendingAndProcessing = [
            ...pendingJobs.filter(job => isJobStuck(job, 'pending', 60)),
            ...processingJobs.filter(job => isJobStuck(job, 'processing', 60))
        ];
        
        if (allPendingAndProcessing.length > 0) {
            console.log(`⏰ Found ${allPendingAndProcessing.length} jobs older than 1 hour - marking as failed`);
            
            for (const job of allPendingAndProcessing) {
                try {
                    await updateOCRJob(job.job_id, job.created_at, {
                        status: 'failed',
                        processing_stage: 'abandoned',
                        error: 'Job abandoned after 1 hour without completion',
                        failed_at: new Date().toISOString()
                    });
                    console.log(`❌ Marked abandoned job ${job.job_id} as failed`);
                } catch (error) {
                    console.error(`❌ Failed to mark job ${job.job_id} as abandoned:`, error.message);
                }
            }
        }
        
        // Summary
        const totalChecked = pendingJobs.length + processingJobs.length;
        const totalRecovered = stuckPendingJobs.length + stuckProcessingJobs.length;
        console.log(`📊 Job Recovery Summary: Checked ${totalChecked} jobs, recovered/processed ${totalRecovered} stuck jobs`);
        
    } catch (error) {
        console.error('❌ Job recovery system error:', error);
        throw error;
    }
}

// Lambda handler for scheduled execution
exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        await runJobRecovery();
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Job recovery completed successfully',
                timestamp: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Job recovery failed',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

// Export for testing
module.exports.runJobRecovery = runJobRecovery;