import { supabase } from './supabase';
import toast from 'react-hot-toast';

class DatabaseService {
  /**
   * Get user's dashboard statistics
   */
  async getDashboardStats(userId) {
    try {
      const { data, error } = await supabase
        .rpc('get_user_dashboard_stats', { user_uuid: userId });

      if (error) throw error;

      // Handle both array and object responses
      const stats = Array.isArray(data) ? data[0] : data;
      
      return {
        success: true,
        data: stats || {
          batches_in_progress: 0,
          pages_digitized_24h: 0,
          qa_queue_count: 0,
          total_archived_pages: 0
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
          total_archived_pages: 0
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

      console.log('Creating collection with data:', collectionData);
      console.log('User ID:', user.id);

      const { data, error } = await supabase
        .from('collections')
        .insert({
          user_id: user.id,
          name: collectionData.name,
          description: collectionData.description || '',
          start_date: collectionData.startDate || null,
          end_date: collectionData.endDate || null
        })
        .select()
        .single();

      console.log('Collection creation response:', { data, error });

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

      console.log('Creating batch with data:', batchData);

      const { data, error } = await supabase
        .rpc('create_batch_with_limits', {
          batch_name: batchData.name,
          collection_id_param: batchData.collectionId,
          processing_options_param: batchData.processingOptions || {}
        });

      console.log('Batch creation response:', { data, error });

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
}

export const databaseService = new DatabaseService();
export default databaseService;