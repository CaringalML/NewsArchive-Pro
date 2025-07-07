/**
 * Status Controller
 * Handles processing status queries
 */

const statusService = require('../services/statusService');
const { ApiResponse } = require('../utils/apiResponse');

/**
 * Get processing job status
 * @param {object} event - Lambda event
 * @returns {object} API Gateway response
 */
exports.getProcessingStatus = async (event) => {
  try {
    const jobId = event.pathParameters?.jobId;
    
    if (!jobId) {
      return ApiResponse.badRequest('Job ID is required');
    }

    // Get job status
    const result = await statusService.getJobStatus(jobId);
    
    if (!result) {
      return ApiResponse.notFound(`No job found with ID: ${jobId}`);
    }

    return ApiResponse.success(result);

  } catch (error) {
    console.error('Status controller error:', error);
    return ApiResponse.error(error.message);
  }
};