const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'CORS preflight' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { pageId, s3Key, s3Bucket, userId } = body;

    // Validate required fields
    if (!s3Key || !userId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required fields',
          message: 's3Key and userId are required'
        })
      };
    }

    // Generate job ID
    const jobId = `job-${Date.now()}-${uuidv4()}`;

    // Create processing job in database
    const { error: dbError } = await supabase
      .from('processing_jobs')
      .insert({
        page_id: pageId || null,
        job_type: 'textract',
        aws_job_id: jobId,
        status: 'processing',
        started_at: new Date().toISOString(),
        s3_key: s3Key,
        s3_bucket: s3Bucket || process.env.S3_BUCKET,
        user_id: userId
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to create processing job');
    }

    // Send message to SQS queue
    const queueUrl = process.env.PROCESSING_QUEUE_URL;
    if (!queueUrl) {
      throw new Error('PROCESSING_QUEUE_URL environment variable not set');
    }

    const messageBody = JSON.stringify({
      pageId,
      s3Key,
      s3Bucket: s3Bucket || process.env.S3_BUCKET,
      userId,
      jobId
    });

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: messageBody
    });

    await sqsClient.send(command);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: {
          jobId,
          status: 'processing'
        },
        message: 'Processing job queued successfully'
      })
    };

  } catch (error) {
    console.error('Error:', error);
    
    // Update job status to failed if we have a jobId
    const body = JSON.parse(event.body || '{}');
    if (body.pageId) {
      try {
        await supabase
          .from('processing_jobs')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('page_id', body.pageId)
          .eq('job_type', 'textract');
      } catch (updateError) {
        console.error('Failed to update job status:', updateError);
      }
    }

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};