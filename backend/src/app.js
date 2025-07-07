/**
 * NewsArchive Pro Lambda Application
 * Main application entry point with Express.js-like structure
 */

const router = require('./routes');
const { corsMiddleware } = require('./middleware/cors');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');

/**
 * Main Lambda handler
 * Routes requests to appropriate controllers based on function name
 */
exports.handler = async (event, context) => {
  // Extract function name from Lambda context
  // Map full function names to handler names
  const functionMappings = {
    'get-upload-url': 'get-upload-url',
    'process-document': 'process-document', 
    'ocr-processor': 'ocr-processor',
    'get-processing-status': 'get-processing-status'
  };
  
  // Find function name from context
  let functionName = null;
  const fullName = context.functionName;
  
  for (const [key, value] of Object.entries(functionMappings)) {
    if (fullName.includes(key)) {
      functionName = value;
      break;
    }
  }
  
  if (!functionName) {
    // Fallback: try original extraction method
    const parts = fullName.split('-');
    functionName = parts.slice(2).join('-');
  }
  
  logger.info(`Executing handler: ${functionName}`, {
    requestId: context.requestId,
    fullFunctionName: fullName,
    extractedName: functionName,
    event: JSON.stringify(event)
  });

  try {
    // Apply CORS middleware
    if (event.httpMethod === 'OPTIONS') {
      return corsMiddleware();
    }

    // Route to appropriate handler
    const response = await router.route(functionName, event, context);
    
    // Apply CORS headers to response
    if (response.headers) {
      response.headers = {
        ...response.headers,
        ...corsMiddleware().headers
      };
    } else {
      response.headers = corsMiddleware().headers;
    }

    return response;
  } catch (error) {
    logger.error(`Error in ${functionName}:`, error);
    return errorHandler(error);
  }
};