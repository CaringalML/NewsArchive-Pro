/**
 * Database Module
 * Provides data access layer for all database operations
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

// Initialize Supabase client
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

// Export data access objects
module.exports = {
  // Batches
  batches: {
    updateStatus: async (batchId, userId, status) => {
      const { error } = await supabase
        .from('batches')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId)
        .eq('user_id', userId);
      
      if (error) throw error;
    }
  },

  // Processing Jobs
  processingJobs: {
    create: async (data) => {
      const { data: result, error } = await supabase
        .from('processing_jobs')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },

    findByJobId: async (jobId) => {
      const { data, error } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('aws_job_id', jobId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    updateByJobId: async (jobId, userId, updates) => {
      const { error } = await supabase
        .from('processing_jobs')
        .update(updates)
        .eq('aws_job_id', jobId)
        .eq('user_id', userId);
      
      if (error) throw error;
    },

    updateByPageId: async (pageId, updates) => {
      const { error } = await supabase
        .from('processing_jobs')
        .update(updates)
        .eq('page_id', pageId)
        .eq('job_type', 'textract');
      
      if (error) throw error;
    }
  },

  // Pages
  pages: {
    updateStatus: async (pageId, userId, status) => {
      const { error } = await supabase
        .from('pages')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', pageId)
        .eq('user_id', userId);
      
      if (error) throw error;
    },

    findById: async (pageId, userId) => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    getBatchStats: async (batchId, userId) => {
      const { data, error } = await supabase
        .from('pages')
        .select('status')
        .eq('batch_id', batchId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Count pages by status
      const stats = { total: data.length };
      data.forEach(page => {
        stats[page.status] = (stats[page.status] || 0) + 1;
      });
      
      return stats;
    }
  },

  // OCR Results
  ocrResults: {
    upsert: async (data) => {
      const { error } = await supabase
        .from('ocr_results')
        .upsert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'page_id'
        });
      
      if (error) throw error;
    },

    findByPageId: async (pageId) => {
      const { data, error } = await supabase
        .from('ocr_results')
        .select('formatted_text, confidence_score')
        .eq('page_id', pageId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  },

  // Page Metadata
  pageMetadata: {
    upsert: async (data) => {
      const { error } = await supabase
        .from('page_metadata')
        .upsert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'page_id'
        });
      
      if (error) throw error;
    },

    findByPageId: async (pageId) => {
      const { data, error } = await supabase
        .from('page_metadata')
        .select('entities, key_phrases, sentiment')
        .eq('page_id', pageId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  }
};