/**
 * Upload Controller
 * Handles S3 presigned URL generation for file uploads
 */

const uploadService = require('../services/uploadService');
const { validateRequest } = require('../utils/validators');
const { ApiResponse } = require('../utils/apiResponse');

/**
 * Generate presigned URL for S3 upload
 * @param {object} event - Lambda event
 * @returns {object} API Gateway response
 */
exports.getUploadUrl = async (event) => {
  try {
    // Parse and validate request
    const body = JSON.parse(event.body || '{}');
    const validation = validateRequest(body, ['fileName', 'contentType', 'userId']);
    
    if (!validation.isValid) {
      return ApiResponse.badRequest(validation.error);
    }

    const { fileName, contentType, userId } = body;

    // Validate content type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'image/webp', 'image/tiff', 'image/bmp', 'application/pdf'
    ];

    if (!allowedTypes.includes(contentType)) {
      return ApiResponse.badRequest('Invalid content type. Only image files and PDFs are allowed.');
    }

    // Generate upload URL
    const result = await uploadService.generateUploadUrl({
      fileName,
      contentType,
      userId
    });

    return ApiResponse.success({
      data: result,
      message: 'Upload URL generated successfully'
    });

  } catch (error) {
    console.error('Upload controller error:', error);
    return ApiResponse.error(error.message);
  }
};