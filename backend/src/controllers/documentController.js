/**
 * Document Controller
 * Handles document processing initiation
 */

const documentService = require('../services/documentService');
const { validateRequest } = require('../utils/validators');
const { ApiResponse } = require('../utils/apiResponse');

/**
 * Initiate document processing
 * @param {object} event - Lambda event
 * @returns {object} API Gateway response
 */
exports.processDocument = async (event) => {
  try {
    // Parse and validate request
    const body = JSON.parse(event.body || '{}');
    const validation = validateRequest(body, ['s3Key', 'userId']);
    
    if (!validation.isValid) {
      return ApiResponse.badRequest(validation.error);
    }

    const { pageId, s3Key, s3Bucket, userId } = body;

    // Initiate processing
    const result = await documentService.initiateProcessing({
      pageId,
      s3Key,
      s3Bucket,
      userId
    });

    return ApiResponse.success({
      data: result,
      message: 'Processing job queued successfully'
    });

  } catch (error) {
    console.error('Document controller error:', error);
    
    // Try to update job status on error
    if (event.body) {
      const { pageId } = JSON.parse(event.body);
      if (pageId) {
        await documentService.markJobFailed(pageId, error.message);
      }
    }
    
    return ApiResponse.error(error.message);
  }
};