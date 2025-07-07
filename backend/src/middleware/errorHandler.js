/**
 * Error Handler Middleware
 * Centralized error handling
 */

const config = require('../config');
const { logger } = require('../utils/logger');

/**
 * Handle errors and generate appropriate response
 * @param {Error} error - Error object
 * @returns {object} Error response
 */
exports.errorHandler = (error) => {
  logger.error('Request failed', {
    error: error.message,
    stack: error.stack
  });

  const response = {
    statusCode: error.statusCode || 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': config.cors.allowedOrigin
    },
    body: JSON.stringify({
      error: 'Internal server error',
      message: error.message
    })
  };

  // Add more details in development
  if (config.app.environment === 'development') {
    response.body = JSON.stringify({
      error: error.name || 'Error',
      message: error.message,
      stack: error.stack
    });
  }

  return response;
};