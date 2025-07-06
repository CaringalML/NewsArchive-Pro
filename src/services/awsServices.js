import { supabase } from './supabase';

// Production AWS Services - Uses actual backend API endpoints

class AWSServices {
  constructor() {
    // Get API Gateway URL from environment variables
    this.apiUrl = process.env.REACT_APP_API_GATEWAY_URL || 'https://your-api-gateway-url.amazonaws.com/production';
  }

  /**
   * Upload file to S3 bucket using presigned URL
   * Production implementation using actual backend API
   */
  async uploadToS3(file, fileName, folder = 'newspapers') {
    try {
      // Get current user for authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Step 1: Get signed upload URL from backend
      const uploadUrlResponse = await fetch(`${this.apiUrl}/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({
          fileName: fileName,
          contentType: file.type,
          userId: user.id
        })
      });

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json();
        throw new Error(errorData.message || 'Failed to get upload URL');
      }

      const uploadUrlData = await uploadUrlResponse.json();
      
      if (!uploadUrlData.success) {
        throw new Error(uploadUrlData.message || 'Failed to get upload URL');
      }

      const { uploadUrl, key, bucket, viewUrl } = uploadUrlData.data;

      // Step 2: Upload file directly to S3 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }

      console.log('S3 Upload successful:', { file: file.name, key, viewUrl });
      
      return {
        success: true,
        url: viewUrl, // CloudFront URL for viewing
        key: key,
        bucket: bucket
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Start document processing job (Production Implementation)
   * Uses actual backend API to start Textract and Comprehend processing
   */
  async startTextractJob(s3Key, s3Bucket = process.env.REACT_APP_AWS_S3_BUCKET) {
    try {
      // Get current user for authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Call backend API to start document processing
      const response = await fetch(`${this.apiUrl}/process-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({
          s3Key: s3Key,
          s3Bucket: s3Bucket,
          userId: user.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start document processing');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to start document processing');
      }

      console.log('Document processing started:', { s3Key, jobId: data.jobId });
      
      return {
        success: true,
        jobId: data.jobId
      };
    } catch (error) {
      console.error('Document processing start error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get processing job results (Production Implementation)
   * Uses actual backend API to get processing status and results
   */
  async getTextractResults(jobId) {
    try {
      // Get current user for authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Call backend API to get processing status
      const response = await fetch(`${this.apiUrl}/processing-status/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get processing status');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get processing status');
      }

      console.log('Processing status retrieved:', { jobId, status: data.status });
      
      return {
        success: true,
        status: data.status,
        text: data.text || '',
        confidence: data.confidence || 0,
        rawResult: data.rawResult || {},
        entities: data.entities || [],
        keyPhrases: data.keyPhrases || [],
        sentiment: data.sentiment || null
      };
    } catch (error) {
      console.error('Processing status error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract formatted text from Textract result
   */
  extractTextFromTextractResult(textractResult) {
    return textractResult.text || '';
  }

  /**
   * Calculate average confidence from Textract blocks
   */
  calculateAverageConfidence(blocks) {
    if (!blocks || blocks.length === 0) return 0;
    
    const confidenceSum = blocks.reduce((sum, block) => {
      return sum + (block.Confidence || 0);
    }, 0);
    
    return (confidenceSum / blocks.length).toFixed(2);
  }

  /**
   * Complete processing pipeline for a page (Production Implementation)
   * Uses actual backend API for processing - backend handles database updates
   */
  async processPage(pageId, s3Key) {
    try {
      console.log('Starting processing pipeline for page:', pageId);
      
      // Start processing job via backend API
      const processingStart = await this.startTextractJob(s3Key);
      if (!processingStart.success) {
        throw new Error(`Processing failed to start: ${processingStart.error}`);
      }

      console.log('Processing job started:', processingStart.jobId);
      
      // The backend will handle:
      // 1. Recording processing job in database
      // 2. Starting Textract job
      // 3. Polling for completion
      // 4. Running Comprehend analysis
      // 5. Updating database with results
      
      // Return job ID for status tracking
      return {
        success: true,
        jobId: processingStart.jobId,
        message: 'Processing job started successfully'
      };
    } catch (error) {
      console.error('Page processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Poll processing job until completion (Production Implementation)
   * Uses actual backend API to check processing status
   */
  async pollTextractJob(jobId, maxAttempts = 10, interval = 5000) {
    console.log('Polling processing job:', jobId);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, interval));
      
      const result = await this.getTextractResults(jobId);
      
      if (result.success && (result.status === 'SUCCEEDED' || result.status === 'completed')) {
        return result;
      } else if (result.success && (result.status === 'FAILED' || result.status === 'failed')) {
        throw new Error(result.error || 'Processing job failed');
      }
      
      console.log(`Processing job attempt ${attempt + 1}/${maxAttempts}, status: ${result.status}`);
    }
    
    // Final attempt after all polling
    return await this.getTextractResults(jobId);
  }
}

export const awsServices = new AWSServices();
export default awsServices;