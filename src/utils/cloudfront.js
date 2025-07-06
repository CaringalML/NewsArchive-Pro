/**
 * CloudFront URL utilities
 */

// Ensure CloudFront domain has https:// prefix
const CLOUDFRONT_RAW_DOMAIN = process.env.REACT_APP_AWS_CLOUDFRONT_DOMAIN || 'https://d1gnn36zhrv38g.cloudfront.net';
const CLOUDFRONT_DOMAIN = CLOUDFRONT_RAW_DOMAIN.startsWith('http') 
  ? CLOUDFRONT_RAW_DOMAIN 
  : `https://${CLOUDFRONT_RAW_DOMAIN}`;

/**
 * Convert S3 URL to CloudFront URL for optimized delivery
 * @param {string} s3Url - The S3 URL to convert
 * @returns {string} CloudFront URL
 */
export function getCloudFrontUrl(s3Url) {
  if (!s3Url) return '';
  
  // If already a CloudFront URL, return as is
  if (s3Url.includes('cloudfront.net')) {
    return s3Url;
  }
  
  // Extract the key from S3 URL
  // Example S3 URL: https://caringalfrontend.s3.ap-southeast-2.amazonaws.com/newspapers/user-id/file.jpg
  // Or: https://s3.ap-southeast-2.amazonaws.com/caringalfrontend/newspapers/user-id/file.jpg
  
  let key = '';
  
  // Pattern 1: bucket.s3.region.amazonaws.com/key
  const pattern1 = /https?:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)/;
  const match1 = s3Url.match(pattern1);
  if (match1) {
    key = match1[1];
  } else {
    // Pattern 2: s3.region.amazonaws.com/bucket/key
    const pattern2 = /https?:\/\/s3\.[^/]+\.amazonaws\.com\/[^/]+\/(.+)/;
    const match2 = s3Url.match(pattern2);
    if (match2) {
      key = match2[1];
    }
  }
  
  // If we couldn't extract the key, return original URL
  if (!key) {
    console.warn('Could not extract key from S3 URL:', s3Url);
    return s3Url;
  }
  
  // Return CloudFront URL
  return `${CLOUDFRONT_DOMAIN}/${key}`;
}

/**
 * Get CloudFront URL for a newspaper image
 * @param {string} key - The S3 key for the image
 * @returns {string} CloudFront URL
 */
export function getNewspaperImageUrl(key) {
  if (!key) return '';
  
  // Remove leading slash if present
  const cleanKey = key.startsWith('/') ? key.substring(1) : key;
  
  return `${CLOUDFRONT_DOMAIN}/${cleanKey}`;
}

/**
 * Get CloudFront URL for a thumbnail
 * @param {string} key - The S3 key for the original image
 * @returns {string} CloudFront URL for thumbnail
 */
export function getThumbnailUrl(key) {
  if (!key) return '';
  
  // Convert newspapers/user-id/file.jpg to newspapers/thumbnails/user-id/file.jpg
  const thumbnailKey = key.replace(/^newspapers\//, 'newspapers/thumbnails/');
  
  return getNewspaperImageUrl(thumbnailKey);
}

const cloudfrontUtils = {
  getCloudFrontUrl,
  getNewspaperImageUrl,
  getThumbnailUrl
};

export default cloudfrontUtils;