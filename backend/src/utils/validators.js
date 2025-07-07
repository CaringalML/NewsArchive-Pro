/**
 * Validators Utility
 * Common validation functions
 */

/**
 * Validate required fields in request
 * @param {object} data - Request data
 * @param {array} requiredFields - Required field names
 * @returns {object} Validation result
 */
exports.validateRequest = (data, requiredFields) => {
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    };
  }
  
  return { isValid: true };
};

/**
 * Validate file type
 * @param {string} contentType - MIME type
 * @param {array} allowedTypes - Allowed MIME types
 * @returns {boolean} Is valid
 */
exports.validateFileType = (contentType, allowedTypes) => {
  return allowedTypes.includes(contentType);
};

/**
 * Validate UUID format
 * @param {string} uuid - UUID string
 * @returns {boolean} Is valid UUID
 */
exports.validateUuid = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};