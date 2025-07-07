/**
 * Textract Service
 * AWS Textract integration for document analysis
 */

const { 
  TextractClient, 
  StartDocumentAnalysisCommand, 
  GetDocumentAnalysisCommand 
} = require('@aws-sdk/client-textract');
const config = require('../config');
const { logger } = require('../utils/logger');

const textractClient = new TextractClient({ region: config.aws.region });

/**
 * Analyze document with AWS Textract
 * @param {string} s3Key - S3 object key
 * @returns {object} Analysis result
 */
exports.analyzeDocument = async (s3Key) => {
  try {
    logger.info('Starting Textract analysis', { 
      bucket: config.aws.s3Bucket, 
      key: s3Key 
    });

    // Start document analysis
    const startCommand = new StartDocumentAnalysisCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: config.aws.s3Bucket,
          Name: s3Key
        }
      },
      FeatureTypes: ['TABLES', 'FORMS']
    });

    const startResponse = await textractClient.send(startCommand);
    const jobId = startResponse.JobId;
    logger.info('Textract job started', { jobId });

    // Poll for completion
    const result = await this.waitForJobCompletion(jobId);
    
    // Extract text from blocks
    const { text, confidence, blockCount } = this.extractTextFromBlocks(result.Blocks);

    logger.info('Text extraction completed', {
      textLength: text.length,
      confidence,
      blockCount
    });

    return {
      success: true,
      text,
      confidence: Math.round(confidence * 100) / 100,
      blockCount,
      blocks: result.Blocks || []
    };

  } catch (error) {
    logger.error('Textract error', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Wait for Textract job completion
 * @param {string} jobId - Textract job ID
 * @returns {object} Job result
 */
exports.waitForJobCompletion = async (jobId) => {
  const maxAttempts = 60; // 5 minutes maximum
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    const getCommand = new GetDocumentAnalysisCommand({ JobId: jobId });
    const response = await textractClient.send(getCommand);
    
    logger.debug('Textract job status', { 
      jobId, 
      status: response.JobStatus, 
      attempt: attempts + 1 
    });
    
    if (response.JobStatus === 'SUCCEEDED') {
      return response;
    }
    
    if (response.JobStatus === 'FAILED') {
      throw new Error(response.StatusMessage || 'Textract job failed');
    }
    
    attempts++;
  }
  
  throw new Error('Textract job timed out');
};

/**
 * Extract text from Textract blocks
 * @param {array} blocks - Textract blocks
 * @returns {object} Extracted text and statistics
 */
exports.extractTextFromBlocks = (blocks = []) => {
  const textLines = [];
  let totalConfidence = 0;
  let blockCount = 0;

  for (const block of blocks) {
    if (block.BlockType === 'LINE' && block.Text) {
      textLines.push(block.Text);
      if (block.Confidence) {
        totalConfidence += block.Confidence;
        blockCount++;
      }
    }
  }

  const text = textLines.join('\n');
  const confidence = blockCount > 0 ? totalConfidence / blockCount : 0;

  return { text, confidence, blockCount };
};