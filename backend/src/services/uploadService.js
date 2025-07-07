/**
 * Upload Service
 * Business logic for file upload operations
 */

const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const s3Client = new S3Client({ region: config.aws.region });

/**
 * Generate presigned URL for S3 upload
 * @param {object} params - Upload parameters
 * @returns {object} Upload URL and metadata
 */
exports.generateUploadUrl = async ({ fileName, contentType, userId }) => {
  // Generate unique S3 key
  const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
  const key = `newspapers/${userId}/${uuidv4()}${fileExtension}`;

  // Create presigned URL
  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
    ContentType: contentType,
    Metadata: {
      'user-id': userId,
      'file-name': fileName
    }
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { 
    expiresIn: 3600 // 1 hour
  });
  
  // Generate CloudFront URL for viewing
  const viewUrl = config.aws.cloudfrontDomain 
    ? `https://${config.aws.cloudfrontDomain}/${key}` 
    : null;

  return {
    uploadUrl,
    key,
    bucket: config.aws.s3Bucket,
    viewUrl
  };
};