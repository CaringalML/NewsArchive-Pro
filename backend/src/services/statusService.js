/**
 * Status Service
 * Business logic for processing status queries
 */

const db = require('../database');

/**
 * Get job status with related data
 * @param {string} jobId - Job ID
 * @returns {object} Job status and results
 */
exports.getJobStatus = async (jobId) => {
  // Get processing job
  const job = await db.processingJobs.findByJobId(jobId);
  
  if (!job) {
    return null;
  }

  // Prepare response
  const result = {
    success: true,
    data: {
      jobId: job.aws_job_id,
      status: job.status,
      jobType: job.job_type,
      pageId: job.page_id,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      errorMessage: job.error_message
    }
  };

  // Get OCR results and metadata if job is completed
  if (job.page_id && job.status === 'completed') {
    const [ocrResults, pageMetadata] = await Promise.all([
      db.ocrResults.findByPageId(job.page_id),
      db.pageMetadata.findByPageId(job.page_id)
    ]);

    if (ocrResults) {
      result.data.text = ocrResults.formatted_text;
      result.data.confidence = ocrResults.confidence_score;
    }

    if (pageMetadata) {
      result.data.entities = pageMetadata.entities;
      result.data.keyPhrases = pageMetadata.key_phrases;
      result.data.sentiment = pageMetadata.sentiment;
    }
  }

  // Map status for frontend compatibility
  const statusMap = {
    'processing': 'PROCESSING',
    'completed': 'SUCCEEDED',
    'failed': 'FAILED'
  };
  
  result.status = statusMap[job.status] || job.status.toUpperCase();

  return result;
};