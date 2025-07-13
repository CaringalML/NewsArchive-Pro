/**
 * API Service for NewsArchive Pro
 * Handles all API communication with the backend Lambda functions via API Gateway
 */

class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:3000/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Make HTTP request to API Gateway
   * @param {string} endpoint - API endpoint (e.g., '/users', '/images')
   * @param {Object} options - Request options
   * @returns {Promise} - Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.defaultHeaders,
      ...options
    };

    try {
      console.log(`API Request: ${config.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Invalid response format: ${contentType}`);
      }

      const data = await response.json();

      if (!response.ok) {
        // Add more detailed error information
        const errorMessage = data.message || data.error || `HTTP ${response.status}`;
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          url: url
        });
        throw new Error(errorMessage);
      }

      console.log(`API Response: ${response.status}`, data);
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      
      // Just log errors, don't show toasts for API calls
      console.error('API Error:', {
        message: error.message,
        type: error.message.includes('fetch') ? 'network' : 
              error.message.includes('404') ? 'not-found' : 
              error.message.includes('500') ? 'server' : 'other'
      })
      
      throw error;
    }
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise} - Response data
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET'
    });
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @returns {Promise} - Response data
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @returns {Promise} - Response data
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise} - Response data
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  /**
   * Upload file using FormData
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with file
   * @returns {Promise} - Response data
   */
  async uploadFile(endpoint, formData) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      console.log(`File Upload: POST ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData
        // Note: Don't set Content-Type header for FormData, browser will set it automatically
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      console.log(`Upload Response: ${response.status}`, data);
      return data;
    } catch (error) {
      console.error('File Upload Error:', error);
      throw error;
    }
  }

  // =============================================================================
  // SPECIFIC API METHODS
  // =============================================================================

  /**
   * Test API connection
   * @returns {Promise} - API status
   */
  async testConnection() {
    return this.get('/newsarchivepro');
  }

  /**
   * Get all users
   * @returns {Promise} - Users list
   */
  async getUsers() {
    return this.get('/users');
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise} - Created user
   */
  async createUser(userData) {
    return this.post('/users', userData);
  }

  /**
   * Get user by ID
   * @param {number} userId - User ID
   * @returns {Promise} - User data
   */
  async getUser(userId) {
    return this.get(`/users/${userId}`);
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise} - User data
   */
  async getUserByEmail(email) {
    return this.get(`/users/email/${encodeURIComponent(email)}`);
  }


  /**
   * Get processing recommendation for a file
   * @param {File} file - Image file
   * @param {Object} settings - File analysis settings
   * @returns {Promise} - Processing recommendation
   */
  async getProcessingRecommendation(file, settings = {}) {
    const actualFile = file.file || file;
    
    return this.post('/processing-recommendation', {
      fileSize: actualFile.size,
      isMultiPage: settings.isMultiPage || false,
      pageCount: settings.pageCount || 1,
      filename: actualFile.name
    });
  }

  /**
   * Upload image for OCR processing with intelligent routing
   * @param {File} file - Image file
   * @param {string} userId - User ID
   * @param {Object} ocrSettings - OCR processing settings
   * @returns {Promise} - OCR job data with processing route info
   */
  async uploadImage(file, userId, ocrSettings = {}) {
    const formData = new FormData();
    formData.append('image', file.file || file);
    formData.append('user_id', userId);
    
    // Create a copy of settings to avoid mutating the original
    const settingsToSend = { ...ocrSettings };
    
    // Extract multi-page document info if present
    if (file.groupId) {
      settingsToSend.groupId = file.groupId;
      settingsToSend.pageNumber = file.pageNumber;
    }
    
    // Add file size for routing analysis
    const actualFile = file.file || file;
    settingsToSend.fileSize = actualFile.size;
    settingsToSend.fileName = actualFile.name;
    
    if (Object.keys(settingsToSend).length > 0) {
      formData.append('ocrSettings', JSON.stringify(settingsToSend));
    }

    return this.uploadFile('/images', formData);
  }

  /**
   * Get OCR job status
   * @param {string} jobId - OCR job ID
   * @param {string} createdAt - Job creation timestamp
   * @returns {Promise} - OCR job status and results
   */
  async getOcrJob(jobId, createdAt) {
    if (createdAt) {
      return this.get(`/ocr-job/${jobId}/${encodeURIComponent(createdAt)}`);
    }
    // Fallback to old endpoint if no createdAt provided
    return this.get(`/images/${jobId}`);
  }

  /**
   * Get OCR jobs for a specific user
   * @param {string} userId - User ID
   * @returns {Promise} - Array of OCR jobs
   */
  async getOcrJobsByUser(userId) {
    return this.get(`/ocr-jobs/${userId}`);
  }

  /**
   * Get all pages of a multi-page document by group ID
   * @param {string} groupId - Document group ID
   * @returns {Promise} - Multi-page document with all pages
   */
  async getMultiPageDocument(groupId) {
    return this.get(`/document/${groupId}`);
  }

  /**
   * Send notification
   * @param {number} userId - User ID
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   * @returns {Promise} - Notification response
   */
  async sendNotification(userId, message, type = 'info') {
    return this.post('/notify', {
      userId,
      message,
      type
    });
  }

  // =============================================================================
  // BATCH PROCESSING METHODS
  // =============================================================================

  /**
   * Upload multiple images for batch processing (parallel processing)
   * @param {Array} files - Array of file objects with metadata
   * @param {string} userId - User ID
   * @param {Object} batchSettings - Batch processing settings
   * @param {Function} progressCallback - Progress callback function
   * @returns {Promise} - Batch processing results
   */
  async uploadBatch(files, userId, batchSettings = {}, progressCallback = null) {
    const maxConcurrent = batchSettings.maxConcurrent || 5; // Process 5 files at once
    const results = [];
    let completed = 0;
    
    // Process files in chunks to avoid overwhelming the server
    const processChunk = async (chunk) => {
      const promises = chunk.map(async (fileInfo) => {
        try {
          const result = await this.uploadImage(fileInfo, userId, batchSettings);
          const success = {
            file: fileInfo.file.name,
            fileId: fileInfo.id,
            success: true,
            jobId: result.data.job_id,
            data: result
          };
          
          completed++;
          if (progressCallback) {
            progressCallback(completed, files.length, success);
          }
          
          return success;
        } catch (error) {
          const failure = {
            file: fileInfo.file.name,
            fileId: fileInfo.id,
            success: false,
            error: error.message
          };
          
          completed++;
          if (progressCallback) {
            progressCallback(completed, files.length, failure);
          }
          
          return failure;
        }
      });
      
      return Promise.all(promises);
    };
    
    // Process files in chunks
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const chunk = files.slice(i, i + maxConcurrent);
      const chunkResults = await processChunk(chunk);
      results.push(...chunkResults);
    }
    
    return results;
  }

  /**
   * Combine multiple processed pages into a single document
   * @param {string} groupId - Document group ID
   * @param {Array} pageJobIds - Array of OCR job IDs for each page
   * @param {string} userId - User ID
   * @param {Object} settings - Document combination settings
   * @returns {Promise} - Combined document result
   */
  async combineMultiPageDocument(groupId, pageJobIds, userId, settings = {}) {
    return this.post('/combine-document', {
      groupId,
      pageJobIds,
      userId,
      ...settings
    });
  }

  /**
   * Check status of multiple OCR jobs
   * @param {Array} jobIds - Array of job IDs
   * @returns {Promise} - Array of job statuses
   */
  async getBatchStatus(jobIds) {
    const results = [];
    
    for (const jobId of jobIds) {
      try {
        const result = await this.getOcrJob(jobId);
        results.push({
          jobId,
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          jobId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Check if API is available
   * @returns {Promise<boolean>} - API availability
   */
  async isApiAvailable() {
    try {
      await this.testConnection();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get API health status
   * @returns {Promise} - API health information
   */
  async getHealthStatus() {
    try {
      const response = await this.testConnection();
      return {
        status: 'healthy',
        message: response.message,
        timestamp: response.timestamp
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create and export a singleton instance
const apiService = new ApiService();

export default apiService;
export { apiService };

// Named exports for specific methods
export const {
  testConnection,
  getUsers,
  createUser,
  getUser,
  getUserByEmail,
  getProcessingRecommendation,
  uploadImage,
  getOcrJob,
  getOcrJobsByUser,
  getMultiPageDocument,
  sendNotification,
  uploadBatch,
  getBatchStatus,
  isApiAvailable,
  getHealthStatus
} = apiService;