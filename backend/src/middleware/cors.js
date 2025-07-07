/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing
 */

const config = require('../config');

/**
 * Generate CORS headers
 * @returns {object} CORS response
 */
exports.corsMiddleware = () => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': config.cors.allowedOrigin,
      'Access-Control-Allow-Headers': config.cors.allowedHeaders,
      'Access-Control-Allow-Methods': config.cors.allowedMethods,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: 'CORS preflight' })
  };
};