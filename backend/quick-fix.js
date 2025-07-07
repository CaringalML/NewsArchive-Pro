/**
 * Quick fix for function name extraction
 * Creates a minimal update to fix the routing issue
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const distDir = path.join(__dirname, 'dist');

// Create a simple fix
const fixedAppJs = `
const router = require('./src/routes');
const { corsMiddleware } = require('./src/middleware/cors');
const { errorHandler } = require('./src/middleware/errorHandler');
const { logger } = require('./src/utils/logger');

exports.handler = async (event, context) => {
  // Extract function name from Lambda context
  // Expected format: {environment}-newsarchive-{function-name}
  const parts = context.functionName.split('-');
  const functionName = parts.slice(2).join('-'); // Skip environment and 'newsarchive'
  
  console.log('Function Name Extraction:', {
    fullName: context.functionName,
    parts: parts,
    extractedName: functionName
  });

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return corsMiddleware();
    }

    // Route to appropriate handler
    const response = await router.route(functionName, event, context);
    
    // Apply CORS headers
    if (response.headers) {
      response.headers = { ...response.headers, ...corsMiddleware().headers };
    } else {
      response.headers = corsMiddleware().headers;
    }

    return response;
  } catch (error) {
    console.error('Handler error:', error);
    return errorHandler(error);
  }
};
`;

console.log('Creating quick fix...');

// Write the fixed version
fs.writeFileSync(path.join(__dirname, 'app-fixed.js'), fixedAppJs);

console.log('Fixed app.js created as app-fixed.js');
console.log('You can manually copy this into your Lambda function to test the fix.');