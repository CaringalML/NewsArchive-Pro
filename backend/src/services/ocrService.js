/**
 * OCR Service
 * Business logic for OCR processing with AWS Textract and Comprehend
 */

const textractService = require('./textractService');
const comprehendService = require('./comprehendService');
const db = require('../database');
const { logger } = require('../utils/logger');

/**
 * Process document with OCR and NLP
 * @param {object} params - Processing parameters
 */
exports.processDocument = async ({ pageId, s3Key, userId, jobId }) => {
  try {
    // Update page status if provided
    if (pageId) {
      await db.pages.updateStatus(pageId, userId, 'ocr_processing');
    }

    // Process with Textract
    logger.info('Starting Textract processing', { s3Key });
    const textractResult = await textractService.analyzeDocument(s3Key);
    
    if (!textractResult.success) {
      throw new Error(`Textract processing failed: ${textractResult.error}`);
    }

    logger.info('Textract completed', {
      textLength: textractResult.text.length,
      confidence: textractResult.confidence
    });

    // Save OCR results
    if (pageId) {
      await db.ocrResults.upsert({
        page_id: pageId,
        user_id: userId,
        formatted_text: textractResult.text,
        confidence_score: textractResult.confidence,
        raw_text: { blocks: textractResult.blocks || [] },
        aws_job_id: jobId
      });
    }

    // Process with Comprehend if we have text
    let comprehendResult = null;
    if (textractResult.text && textractResult.text.trim()) {
      logger.info('Starting Comprehend processing');
      comprehendResult = await comprehendService.analyzeText(textractResult.text);
      
      if (comprehendResult.success && pageId) {
        // Save metadata
        await db.pageMetadata.upsert({
          page_id: pageId,
          user_id: userId,
          language: comprehendResult.language,
          entities: comprehendResult.entities,
          key_phrases: comprehendResult.keyPhrases,
          sentiment: comprehendResult.sentiment
        });
      }
    }

    // Update job status
    await db.processingJobs.updateByJobId(jobId, userId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      result_data: {
        textract: {
          success: textractResult.success,
          text: textractResult.text,
          confidence: textractResult.confidence,
          blockCount: textractResult.blockCount
        },
        comprehend: comprehendResult
      }
    });

    // Update page status to qa_review
    if (pageId) {
      await db.pages.updateStatus(pageId, userId, 'qa_review');
      
      // Check if all pages in the batch are ready for QA review
      await this.checkAndUpdateBatchStatus(pageId, userId);
    }

  } catch (error) {
    logger.error('OCR processing failed', { error: error.message, jobId });
    
    // Update job and page status
    await db.processingJobs.updateByJobId(jobId, userId, {
      status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString()
    });

    if (pageId) {
      await db.pages.updateStatus(pageId, userId, 'error');
    }

    throw error;
  }
};

/**
 * Check if all pages in batch are processed and update batch status
 * @param {string} pageId - Page ID
 * @param {string} userId - User ID
 */
exports.checkAndUpdateBatchStatus = async (pageId, userId) => {
  try {
    // Get page details to find batch
    const page = await db.pages.findById(pageId, userId);
    if (!page) return;

    // Count pages in batch by status
    const batchStats = await db.pages.getBatchStats(page.batch_id, userId);
    
    const totalPages = batchStats.total || 0;
    const processedPages = (batchStats.qa_review || 0) + (batchStats.approved || 0) + (batchStats.complete || 0);
    
    // If all pages are processed, update batch status
    if (totalPages > 0 && processedPages >= totalPages) {
      await db.batches.updateStatus(page.batch_id, userId, 'qa_review');
      logger.info('Batch ready for QA review', { 
        batchId: page.batch_id, 
        totalPages, 
        processedPages 
      });
    }
  } catch (error) {
    logger.error('Failed to check batch status', { error: error.message, pageId });
  }
};