/**
 * API Response Utility
 * Standardized API response formatting
 */

const config = require('../config');

/**
 * Create standardized API response
 * @param {number} statusCode - HTTP status code
 * @param {object} body - Response body
 * @returns {object} API Gateway response
 */
const createResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': config.cors.allowedOrigin,
      'Access-Control-Allow-Headers': config.cors.allowedHeaders,
      'Access-Control-Allow-Methods': config.cors.allowedMethods
    },
    body: JSON.stringify(body)
  };
};

/**
 * API Response helper methods
 */
exports.ApiResponse = {
  // Success responses
  success: (data) => {
    return createResponse(200, {
      success: true,
      ...data
    });
  },

  created: (data) => {
    return createResponse(201, {
      success: true,
      ...data
    });
  },

  // Client error responses
  badRequest: (message) => {
    return createResponse(400, {
      success: false,
      error: 'Bad Request',
      message
    });
  },

  unauthorized: (message = 'Unauthorized') => {
    return createResponse(401, {
      success: false,
      error: 'Unauthorized',
      message
    });
  },

  forbidden: (message = 'Forbidden') => {
    return createResponse(403, {
      success: false,
      error: 'Forbidden',
      message
    });
  },

  notFound: (message = 'Not Found') => {
    return createResponse(404, {
      success: false,
      error: 'Not Found',
      message
    });
  },

  // Server error responses
  error: (message = 'Internal Server Error') => {
    return createResponse(500, {
      success: false,
      error: 'Internal Server Error',
      message
    });
  }
};