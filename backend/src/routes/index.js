/**
 * Routes configuration
 * Maps Lambda function names to their respective controllers
 */

const uploadController = require('../controllers/uploadController');
const documentController = require('../controllers/documentController');
const ocrController = require('../controllers/ocrController');
const statusController = require('../controllers/statusController');

const routes = {
  'get-upload-url': uploadController.getUploadUrl,
  'process-document': documentController.processDocument,
  'ocr-processor': ocrController.processOcr,
  'get-processing-status': statusController.getProcessingStatus
};

/**
 * Route request to appropriate controller
 * @param {string} functionName - Lambda function name
 * @param {object} event - Lambda event
 * @param {object} context - Lambda context
 */
exports.route = async (functionName, event, context) => {
  const controller = routes[functionName];
  
  if (!controller) {
    throw new Error(`No route configured for function: ${functionName}`);
  }
  
  return await controller(event, context);
};