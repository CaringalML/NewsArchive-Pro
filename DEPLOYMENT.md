# NewsArchive Pro - Production Deployment Guide

This guide covers deploying the NewsArchive Pro backend infrastructure and configuring the frontend to use real API endpoints.

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform installed
3. Node.js and npm installed
4. Access to your Supabase project

## Backend Deployment

### 1. Configure Environment Variables

In the `terraform/terraform.tfvars` file, ensure you have:

```hcl
# AWS Configuration
aws_region = "ap-southeast-2"
environment = "production"

# Supabase Configuration
supabase_url = "https://your-project.supabase.co"
supabase_service_key = "your-service-role-key"

# Lambda Configuration
lambda_runtime = "nodejs18.x"
```

### 2. Deploy Backend Infrastructure

```bash
# Navigate to terraform directory
cd terraform

# Deploy all infrastructure
make deploy
```

This will:
- Build and package all Lambda functions
- Deploy API Gateway, Lambda functions, SQS queues, and IAM roles
- Configure CloudFront distribution
- Output the API Gateway URL

### 3. Get API Gateway URL

After deployment, the API Gateway URL will be displayed in the Terraform outputs:

```bash
make output
```

Look for the `api_gateway_url` output. It will look like:
```
api_gateway_url = "https://abc123def4.execute-api.ap-southeast-2.amazonaws.com/production"
```

## Frontend Configuration

### 1. Update Environment Variables

Update your `.env` file with the API Gateway URL:

```env
# Replace with your actual API Gateway URL from Terraform output
REACT_APP_API_GATEWAY_URL=https://abc123def4.execute-api.ap-southeast-2.amazonaws.com/production
```

### 2. Test API Endpoints

The following endpoints will be available:

- `POST /upload-url` - Get S3 presigned upload URL
- `POST /process-document` - Start document processing
- `GET /processing-status/{jobId}` - Get processing status

### 3. Restart Development Server

```bash
npm start
```

## API Usage

### Upload Flow

1. **Get Upload URL**: Frontend calls `POST /upload-url` with file metadata
2. **Upload to S3**: Frontend uploads file directly to S3 using presigned URL
3. **Start Processing**: Frontend calls `POST /process-document` with S3 key
4. **Poll Status**: Frontend polls `GET /processing-status/{jobId}` for completion

### Expected Request/Response Formats

#### POST /upload-url
**Request:**
```json
{
  "fileName": "newspaper.jpg",
  "contentType": "image/jpeg",
  "userId": "user-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/...",
    "key": "newspapers/user-id/file.jpg",
    "bucket": "your-bucket",
    "viewUrl": "https://cloudfront.net/newspapers/user-id/file.jpg"
  }
}
```

#### POST /process-document
**Request:**
```json
{
  "s3Key": "newspapers/user-id/file.jpg",
  "s3Bucket": "your-bucket",
  "userId": "user-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "job-1234567890-uuid",
    "status": "processing"
  }
}
```

#### GET /processing-status/{jobId}
**Response:**
```json
{
  "success": true,
  "status": "SUCCEEDED",
  "text": "Extracted OCR text...",
  "confidence": 92.5,
  "entities": [...],
  "keyPhrases": [...],
  "sentiment": {...}
}
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure CORS is properly configured in API Gateway
2. **Authentication Errors**: Verify Supabase service key is correct
3. **S3 Upload Fails**: Check S3 bucket permissions and presigned URL expiry
4. **Processing Timeouts**: Increase Lambda timeout for OCR processor

### Debugging

1. **Check CloudWatch Logs**: Each Lambda function has its own log group
2. **API Gateway Logs**: Check API Gateway access logs for request details
3. **SQS Dead Letter Queue**: Check for failed processing messages

### Environment-Specific Notes

- **Development**: Use mock services for faster development
- **Staging**: Deploy with separate Terraform workspace
- **Production**: Use proper monitoring and alerting

## Security Considerations

1. **API Gateway**: Uses CORS configuration for browser security
2. **S3 Uploads**: Uses presigned URLs with time-based expiry
3. **Authentication**: Frontend sends Supabase JWT tokens
4. **IAM Roles**: Lambda functions have minimal required permissions

## Cost Optimization

1. **S3 Storage**: Use lifecycle policies for old files
2. **Lambda**: Functions use appropriate memory allocation
3. **CloudFront**: CDN reduces S3 data transfer costs
4. **Textract**: Only processes when needed, not on every upload

## Monitoring

### CloudWatch Metrics
- Lambda function invocations and errors
- API Gateway request counts and latency
- SQS queue depth and processing times

### Recommended Alarms
- Lambda function errors > 5%
- API Gateway 5xx errors > 1%
- SQS queue depth > 10 messages

## Next Steps

1. Set up monitoring and alerting
2. Configure backup and disaster recovery
3. Implement automated testing pipeline
4. Add performance monitoring