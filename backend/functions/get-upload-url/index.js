const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

const s3Client = new S3Client({ region: process.env.AWS_REGION });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'CORS preflight' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { fileName, contentType, userId } = body;

    // Validate required fields
    if (!fileName || !contentType || !userId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required fields',
          message: 'fileName, contentType, and userId are required'
        })
      };
    }

    // Validate content type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'image/webp', 'image/tiff', 'image/bmp', 'application/pdf'
    ];

    if (!allowedTypes.includes(contentType)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Invalid content type',
          message: 'Only image files and PDFs are allowed'
        })
      };
    }

    // Generate unique S3 key
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    const key = `newspapers/${userId}/${uuidv4()}${fileExtension}`;
    const bucket = process.env.S3_BUCKET;

    if (!bucket) {
      throw new Error('S3_BUCKET environment variable not set');
    }

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      Metadata: {
        'user-id': userId,
        'file-name': fileName
      }
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Generate CloudFront URL for viewing the image after upload
    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;
    const viewUrl = cloudfrontDomain ? `https://${cloudfrontDomain}/${key}` : null;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: {
          uploadUrl,
          key,
          bucket,
          viewUrl  // CloudFront URL for viewing the uploaded file
        },
        message: 'Upload URL generated successfully'
      })
    };

  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};