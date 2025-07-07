/**
 * Application Configuration
 * Centralized configuration management
 */

const requiredEnvVars = [
  'AWS_REGION',
  'S3_BUCKET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY'
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
}

module.exports = {
  // Application settings
  app: {
    environment: process.env.ENVIRONMENT || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  // AWS configuration
  aws: {
    region: process.env.AWS_REGION,
    s3Bucket: process.env.S3_BUCKET,
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN,
    processingQueueUrl: process.env.PROCESSING_QUEUE_URL
  },

  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY
  },

  // CORS configuration
  cors: {
    allowedOrigin: process.env.FRONTEND_DOMAIN || '*',
    allowedHeaders: 'Content-Type, Authorization',
    allowedMethods: 'GET, POST, OPTIONS'
  },

  // Processing configuration
  processing: {
    textractMaxAttempts: 60,
    textractPollInterval: 5000, // 5 seconds
    comprehendMaxLength: 5000
  }
};