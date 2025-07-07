/**
 * Document Service
 * Business logic for document processing
 */

const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const db = require('../database');

const sqsClient = new SQSClient({ region: config.aws.region });

/**
 * Initiate document processing
 * @param {object} params - Processing parameters
 * @returns {object} Job information
 */
exports.initiateProcessing = async ({ pageId, s3Key, s3Bucket, userId }) => {
  // Generate job ID
  const jobId = `job-${Date.now()}-${uuidv4()}`;

  // Create processing job in database
  const job = await db.processingJobs.create({
    page_id: pageId || null,
    job_type: 'textract',
    aws_job_id: jobId,
    status: 'processing',
    started_at: new Date().toISOString(),
    s3_key: s3Key,
    s3_bucket: s3Bucket || config.aws.s3Bucket,
    user_id: userId
  });

  // Send message to SQS queue
  const messageBody = JSON.stringify({
    pageId,
    s3Key,
    s3Bucket: s3Bucket || config.aws.s3Bucket,
    userId,
    jobId
  });

  const command = new SendMessageCommand({
    QueueUrl: config.aws.processingQueueUrl,
    MessageBody: messageBody
  });

  await sqsClient.send(command);

  return {
    jobId,
    status: 'processing'
  };
};

/**
 * Mark job as failed
 * @param {string} pageId - Page ID
 * @param {string} errorMessage - Error message
 */
exports.markJobFailed = async (pageId, errorMessage) => {
  try {
    await db.processingJobs.updateByPageId(pageId, {
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to update job status:', error);
  }
};