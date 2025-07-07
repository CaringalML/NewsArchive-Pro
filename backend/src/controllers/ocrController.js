/**
 * OCR Controller
 * Handles OCR processing from SQS events
 */

const ocrService = require('../services/ocrService');
const { logger } = require('../utils/logger');

/**
 * Process OCR for documents from SQS queue
 * @param {object} event - SQS event
 * @returns {void}
 */
exports.processOcr = async (event) => {
  logger.info('Processing OCR batch', { recordCount: event.Records.length });

  // Process each SQS message
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      const { pageId, s3Key, userId, jobId } = message;

      logger.info('Processing document', { pageId, s3Key, userId, jobId });

      // Process the document
      await ocrService.processDocument({
        pageId,
        s3Key,
        userId,
        jobId
      });

      logger.info('Document processed successfully', { pageId });

    } catch (error) {
      logger.error('Failed to process document', { 
        error: error.message,
        record: record.body 
      });
      
      // Let SQS handle retries by not throwing
      // The message will be retried based on queue configuration
    }
  }
};