import { supabase } from './supabase';
import apiService from './api';
import toast from 'react-hot-toast';

class DatabaseService {
  constructor() {
    this.useApiGateway = process.env.REACT_APP_API_GATEWAY_URL && process.env.REACT_APP_API_GATEWAY_URL.trim() !== '';
  }

  /**
   * Check if user exists in the backend database
   * @param {Object} user - Supabase user object
   * @returns {Promise} - User creation/update result
   */
  async ensureUserExists(user) {
    if (!this.useApiGateway) {
      return { success: true, data: null };
    }

    try {
      // Try to get user from backend
      const backendUser = await apiService.getUser(user.id);
      return { success: true, data: backendUser.data };
    } catch (error) {
      if (error.message.includes('404')) {
        // User doesn't exist in backend, create them
        try {
          const userData = {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
            profile_image_url: user.user_metadata?.avatar_url || null,
            created_at: user.created_at
          };
          
          const newUser = await apiService.createUser(userData);
          toast.success('User profile synchronized with backend');
          return { success: true, data: newUser.data };
        } catch (createError) {
          console.error('Error creating user in backend:', createError);
          return { success: false, error: createError.message };
        }
      } else {
        console.error('Error checking user in backend:', error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Ensure user exists in public.users table (for Supabase direct access)
   */
  async ensureUserInPublicTable(authUserId) {
    try {
      // First, check if user exists in public.users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (existingUser) {
        return { success: true, data: existingUser };
      }

      // If not found, get user data from auth.users and create in public.users
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Failed to get authenticated user');
      }

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authUserId,
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
          profile_image_url: user.user_metadata?.avatar_url || null
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user in public.users:', insertError);
        throw insertError;
      }

      return { success: true, data: newUser };
    } catch (error) {
      console.error('Error ensuring user in public table:', error);
      return { success: false, error: error.message };
    }
  }
  /**
   * Get user's dashboard statistics
   */
  async getDashboardStats(userId) {
    try {
      const { data, error } = await supabase
        .rpc('get_user_dashboard_stats_by_auth');

      if (error) throw error;

      // Handle both array and object responses
      const stats = Array.isArray(data) ? data[0] : data;
      
      return {
        success: true,
        data: {
          batches_in_progress: stats?.processing_pages || 0,
          pages_digitized_24h: stats?.processed_pages || 0,
          qa_queue_count: stats?.failed_pages || 0,
          total_archived_pages: stats?.total_pages || 0,
          total_collections: stats?.total_collections || 0,
          total_batches: stats?.total_batches || 0
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        success: false,
        error: error.message,
        data: {
          batches_in_progress: 0,
          pages_digitized_24h: 0,
          qa_queue_count: 0,
          total_archived_pages: 0,
          total_collections: 0,
          total_batches: 0
        }
      };
    }
  }

  /**
   * Get recent batches for dashboard
   */
  async getRecentBatches() {
    try {
      const { data, error } = await supabase
        .from('user_recent_batches')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching recent batches:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all batches for batch manager
   */
  async getAllBatches() {
    try {
      const { data, error } = await supabase
        .from('batch_details')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching all batches:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a new collection
   */
  async createCollection(collectionData) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }


      // First, get or create the user in public.users table
      const userResult = await this.ensureUserInPublicTable(user.id);
      if (!userResult.success) {
        throw new Error('Failed to sync user: ' + userResult.error);
      }
      
      const publicUserId = userResult.data.id;

      const { data, error } = await supabase
        .from('collections')
        .insert({
          user_id: publicUserId,
          name: collectionData.name,
          description: collectionData.description || '',
          date_range_start: collectionData.startDate || null,
          date_range_end: collectionData.endDate || null
        })
        .select()
        .single();


      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error creating collection:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a new batch
   */
  async createBatch(batchData) {
    try {
      // Validate user authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }


      // First, get or create the user in public.users table
      const userResult = await this.ensureUserInPublicTable(user.id);
      if (!userResult.success) {
        throw new Error('Failed to sync user: ' + userResult.error);
      }
      
      const publicUserId = userResult.data.id;

      const { data, error } = await supabase
        .rpc('create_batch_with_limits', {
          user_id_param: publicUserId,
          collection_id_param: batchData.collectionId,
          batch_name: batchData.name,
          batch_description: batchData.description || '',
          max_pages: batchData.maxPages || 100
        });


      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      return {
        success: true,
        data: { id: data }
      };
    } catch (error) {
      console.error('Error creating batch:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add a page to a batch
   */
  async addPageToBatch(pageData) {
    try {
      const { data, error } = await supabase
        .rpc('add_page_to_batch_with_limits', {
          batch_id_param: pageData.batchId,
          page_number_param: pageData.pageNumber,
          original_filename_param: pageData.originalFilename,
          s3_image_url_param: pageData.s3ImageUrl,
          s3_thumbnail_url_param: pageData.s3ThumbnailUrl,
          file_size_param: pageData.fileSize,
          image_width_param: pageData.imageWidth,
          image_height_param: pageData.imageHeight
        });

      if (error) throw error;

      return {
        success: true,
        data: { id: data }
      };
    } catch (error) {
      console.error('Error adding page to batch:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get page details for QA Editor
   */
  async getPageDetails(pageId) {
    try {
      const { data, error } = await supabase
        .from('page_details')
        .select('*')
        .eq('id', pageId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error fetching page details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get pages for a batch (for QA review queue)
   */
  async getBatchPages(batchId) {
    try {
      const { data, error } = await supabase
        .from('page_details')
        .select('*')
        .eq('batch_id', batchId)
        .order('page_number', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching batch pages:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update page status
   */
  async updatePageStatus(pageId, status) {
    try {
      const { data, error } = await supabase
        .from('pages')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', pageId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error updating page status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update page metadata
   */
  async updatePageMetadata(pageId, metadata) {
    try {
      const { data, error } = await supabase
        .from('page_metadata')
        .upsert({
          page_id: pageId,
          publication_name: metadata.publication,
          publication_date: metadata.date,
          section: metadata.section,
          page_title: metadata.pageTitle,
          ...metadata
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error updating page metadata:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update OCR text
   */
  async updateOCRText(pageId, ocrText) {
    try {
      const { data, error } = await supabase
        .from('ocr_results')
        .upsert({
          page_id: pageId,
          formatted_text: ocrText,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error updating OCR text:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search user content
   */
  async searchContent(searchQuery, limit = 50) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .rpc('search_user_content', {
          user_uuid: user.user.id,
          search_query: searchQuery,
          limit_count: limit
        });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error searching content:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user collections
   */
  async getUserCollections() {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching collections:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get processing jobs status
   */
  async getProcessingJobs(pageId = null) {
    try {
      let query = supabase
        .from('processing_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (pageId) {
        query = query.eq('page_id', pageId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching processing jobs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update batch status
   */
  async updateBatchStatus(batchId, status) {
    try {
      const { data, error } = await supabase
        .from('batches')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', batchId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error updating batch status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete page
   */
  async deletePage(pageId) {
    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting page:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete batch
   */
  async deleteBatch(batchId) {
    try {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;

      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting batch:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // =============================================================================
  // OCR PROCESSING METHODS (API GATEWAY INTEGRATION)
  // =============================================================================

  /**
   * Upload image for OCR processing via API Gateway
   * @param {File} file - Image file to process
   * @param {string} userId - User ID
   * @param {Object} settings - OCR processing settings
   * @returns {Promise} - OCR job result
   */
  async uploadImageForOCR(file, userId, settings = {}) {
    if (!this.useApiGateway) {
      throw new Error('API Gateway is not configured. Please set REACT_APP_API_GATEWAY_URL in your environment.');
    }

    try {
      
      // First, get or create the user in public.users table
      const userResult = await this.ensureUserInPublicTable(userId);
      if (!userResult.success) {
        throw new Error('Failed to sync user: ' + userResult.error);
      }
      
      const publicUserId = userResult.data.id;
      
      const result = await apiService.uploadImage(file, publicUserId, settings);
      
      // Store job info in local state or database if needed
      toast.success(`OCR processing started for ${file.name}`);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error uploading image for OCR:', error);
      toast.error(`Failed to upload ${file.name}: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload multiple images for batch OCR processing
   * @param {FileList} files - Image files to process
   * @param {string} userId - User ID
   * @param {Object} settings - OCR processing settings
   * @returns {Promise} - Batch processing results
   */
  async uploadBatchForOCR(files, userId, settings = {}) {
    if (!this.useApiGateway) {
      throw new Error('API Gateway is not configured. Please set REACT_APP_API_GATEWAY_URL in your environment.');
    }

    try {
      
      // First, get or create the user in public.users table
      const userResult = await this.ensureUserInPublicTable(userId);
      if (!userResult.success) {
        throw new Error('Failed to sync user: ' + userResult.error);
      }
      
      const publicUserId = userResult.data.id;
      
      const results = await apiService.uploadBatch(files, publicUserId, settings);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        toast.success(`${successCount} files uploaded successfully`);
      }
      
      if (failCount > 0) {
        toast.error(`${failCount} files failed to upload`);
      }
      
      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error('Error uploading batch for OCR:', error);
      toast.error(`Batch upload failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get OCR job status and results
   * @param {number} jobId - OCR job ID
   * @returns {Promise} - OCR job status and results
   */
  async getOCRJobStatus(jobId) {
    if (!this.useApiGateway) {
      throw new Error('API Gateway is not configured. Please set REACT_APP_API_GATEWAY_URL in your environment.');
    }

    try {
      const result = await apiService.getOcrJob(jobId);
      
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Error getting OCR job status:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check status of multiple OCR jobs
   * @param {Array} jobIds - Array of job IDs
   * @returns {Promise} - Array of job statuses
   */
  async getBatchOCRStatus(jobIds) {
    if (!this.useApiGateway) {
      throw new Error('API Gateway is not configured. Please set REACT_APP_API_GATEWAY_URL in your environment.');
    }

    try {
      const results = await apiService.getBatchStatus(jobIds);
      
      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error('Error getting batch OCR status:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test API Gateway connection
   * @returns {Promise} - Connection test result
   */
  async testAPIConnection() {
    if (!this.useApiGateway) {
      return {
        success: false,
        error: 'API Gateway is not configured'
      };
    }

    try {
      const result = await apiService.testConnection();
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error testing API connection:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get API health status
   * @returns {Promise} - API health information
   */
  async getAPIHealthStatus() {
    if (!this.useApiGateway) {
      return {
        success: false,
        error: 'API Gateway is not configured',
        data: {
          status: 'disabled',
          message: 'API Gateway URL not configured'
        }
      };
    }

    try {
      const result = await apiService.getHealthStatus();
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting API health status:', error);
      
      return {
        success: false,
        error: error.message,
        data: {
          status: 'error',
          message: error.message
        }
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Check if API Gateway is available and configured
   * @returns {boolean} - API Gateway availability
   */
  isAPIGatewayAvailable() {
    return this.useApiGateway;
  }

  /**
   * Get API Gateway URL
   * @returns {string} - API Gateway URL
   */
  getAPIGatewayURL() {
    return this.useApiGateway ? process.env.REACT_APP_API_GATEWAY_URL : null;
  }
}

export const databaseService = new DatabaseService();
export default databaseService;