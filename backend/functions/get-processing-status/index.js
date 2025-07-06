const { createClient } = require('@supabase/supabase-js');

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
    // Get job ID from path parameters
    const jobId = event.pathParameters?.jobId;
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required parameter',
          message: 'jobId is required in path'
        })
      };
    }

    // Get processing job from database
    const { data: jobs, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('aws_job_id', jobId)
      .single();

    if (error) {
      console.error('Database error:', error);
      
      if (error.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Job not found',
            message: 'Processing job not found'
          })
        };
      }
      
      throw error;
    }

    // Calculate progress based on status
    let progress = 0;
    let message = 'Processing job is queued';
    
    switch (jobs.status) {
      case 'processing':
        progress = 50;
        message = 'Processing document...';
        break;
      case 'completed':
        progress = 100;
        message = 'Processing completed successfully';
        break;
      case 'failed':
        progress = 0;
        message = 'Processing failed';
        break;
    }

    // Get OCR results if processing is completed
    let ocrResults = null;
    if (jobs.status === 'completed' && jobs.page_id) {
      const { data: ocr } = await supabase
        .from('ocr_results')
        .select('*')
        .eq('page_id', jobs.page_id)
        .single();
      ocrResults = ocr;
    }

    // Get metadata if processing is completed
    let metadata = null;
    if (jobs.status === 'completed' && jobs.page_id) {
      const { data: meta } = await supabase
        .from('page_metadata')
        .select('*')
        .eq('page_id', jobs.page_id)
        .single();
      metadata = meta;
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        status: jobs.status === 'completed' ? 'SUCCEEDED' : jobs.status.toUpperCase(),
        text: ocrResults?.formatted_text || '',
        confidence: ocrResults?.confidence_score || 0,
        rawResult: jobs.result_data || {},
        entities: metadata?.entities || [],
        keyPhrases: metadata?.key_phrases || [],
        sentiment: metadata?.sentiment || null,
        jobId: jobs.aws_job_id,
        progress,
        message,
        startedAt: jobs.started_at,
        completedAt: jobs.completed_at,
        errorMessage: jobs.error_message
      })
    };

  } catch (error) {
    console.error('Error:', error);
    
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