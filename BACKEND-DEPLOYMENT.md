# Backend Deployment Guide

## Overview

This guide covers the deployment of the NewsArchive Pro backend infrastructure, which includes:

- 4 AWS Lambda functions written in Go
- API Gateway for REST API endpoints
- SQS queues for async processing
- IAM roles and policies
- CloudWatch logging
- S3 integration for file storage
- Textract and Comprehend for OCR and NLP processing

## Prerequisites

### Required Tools
- Go 1.21 or higher
- Terraform 1.5 or higher
- AWS CLI v2
- Make utility

### AWS Account Setup
1. Ensure you have an AWS account with appropriate permissions
2. Configure AWS CLI with your credentials:
   ```bash
   aws configure
   ```
3. Verify your AWS credentials:
   ```bash
   aws sts get-caller-identity
   ```

### Environment Variables
Set the following environment variables before deployment:

```bash
export SUPABASE_URL="your-supabase-project-url"
export SUPABASE_SERVICE_KEY="your-supabase-service-key"
```

## Quick Start

### 1. Check Dependencies
```bash
make check-deps
```

### 2. Check Environment
```bash
make check-env
```

### 3. Deploy Everything
```bash
make deploy
```

This will:
- Install Go dependencies
- Build all Lambda functions
- Create ZIP files for deployment
- Initialize Terraform
- Deploy all AWS resources

## Manual Deployment Steps

### 1. Install Dependencies
```bash
make deps
```

### 2. Build Lambda Functions
```bash
make build
```

### 3. Initialize Terraform
```bash
make terraform-init
```

### 4. Plan Deployment
```bash
make terraform-plan
```

### 5. Apply Configuration
```bash
make terraform-apply
```

## Lambda Functions

### 1. get-upload-url
- **Purpose**: Generates pre-signed S3 URLs for file uploads
- **Endpoint**: `POST /upload-url`
- **Handler**: `backend/cmd/get-upload-url/main.go`
- **Memory**: 128MB
- **Timeout**: 30 seconds

### 2. process-document
- **Purpose**: Queues document processing jobs
- **Endpoint**: `POST /process-document`
- **Handler**: `backend/cmd/process-document/main.go`
- **Memory**: 256MB
- **Timeout**: 5 minutes

### 3. ocr-processor
- **Purpose**: Processes documents with Textract and Comprehend
- **Trigger**: SQS queue messages
- **Handler**: `backend/cmd/ocr-processor/main.go`
- **Memory**: 512MB
- **Timeout**: 15 minutes

### 4. get-processing-status
- **Purpose**: Returns processing job status
- **Endpoint**: `GET /processing-status/{jobId}`
- **Handler**: `backend/cmd/get-processing-status/main.go`
- **Memory**: 128MB
- **Timeout**: 30 seconds

## API Endpoints

After deployment, your API Gateway will provide the following endpoints:

### Base URL
```
https://{api-gateway-id}.execute-api.{region}.amazonaws.com/{environment}/
```

### Endpoints

#### Get Upload URL
```http
POST /upload-url
Content-Type: application/json

{
  "fileName": "document.pdf",
  "contentType": "application/pdf",
  "userId": "user-uuid"
}
```

#### Process Document
```http
POST /process-document
Content-Type: application/json

{
  "pageId": "page-uuid",
  "s3Key": "newspapers/user-id/file-key",
  "userId": "user-uuid"
}
```

#### Get Processing Status
```http
GET /processing-status/{jobId}
```

## Configuration

### Environment Variables (Lambda)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `S3_BUCKET`: S3 bucket name for file storage
- `PROCESSING_QUEUE_URL`: SQS queue URL for processing jobs
- `ENVIRONMENT`: Deployment environment (dev/staging/prod)

### Terraform Variables
Edit `terraform/terraform.tfvars` to customize:

```hcl
environment = "dev"
aws_region  = "us-east-1"
supabase_url = "your-supabase-url"
supabase_service_key = "your-service-key"
```

## Monitoring

### CloudWatch Logs
Each Lambda function has its own log group:
- `/aws/lambda/dev-newsarchive-get-upload-url`
- `/aws/lambda/dev-newsarchive-process-document`
- `/aws/lambda/dev-newsarchive-ocr-processor`
- `/aws/lambda/dev-newsarchive-get-processing-status`

### View Logs
```bash
make logs
```

### SQS Monitoring
Monitor queue metrics in CloudWatch:
- Message count
- Processing time
- Dead letter queue messages

## Development

### Development Build
```bash
make dev-build
```

### Development Deploy
```bash
make dev-deploy
```

### Run Tests
```bash
make test
```

### Format Code
```bash
make fmt
```

### Lint Code
```bash
make lint
```

## Production Deployment

### Production Environment
```bash
make prod-deploy
```

### Staging Environment
```bash
make staging-deploy
```

## Troubleshooting

### Common Issues

#### 1. Lambda Function Timeout
- Increase timeout in `terraform/lambda.tf`
- Check CloudWatch logs for performance issues

#### 2. Textract Processing Fails
- Verify S3 bucket permissions
- Check document format compatibility
- Monitor Textract service limits

#### 3. Supabase Connection Issues
- Verify environment variables
- Check network connectivity
- Validate service key permissions

#### 4. SQS Message Processing
- Check dead letter queue for failed messages
- Verify queue permissions
- Monitor processing time

### Debugging

#### View Terraform State
```bash
cd terraform && terraform show
```

#### Check AWS Resources
```bash
aws lambda list-functions
aws apigateway get-rest-apis
aws sqs list-queues
```

#### Test API Endpoints
```bash
curl -X POST https://your-api-gateway-url/upload-url \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.pdf","contentType":"application/pdf","userId":"test-user"}'
```

## Cleanup

### Destroy All Resources
```bash
make destroy
```

**Warning**: This will permanently delete all AWS resources created by Terraform.

## Cost Optimization

### Lambda
- Functions are pay-per-use
- Optimize memory allocation based on usage
- Use provisioned concurrency for high-traffic functions

### S3
- Implement lifecycle policies for old files
- Use appropriate storage classes
- Monitor storage costs

### Textract/Comprehend
- Use async APIs for better pricing
- Cache results to avoid reprocessing
- Monitor usage limits

## Security

### IAM Roles
- Principle of least privilege
- Separate roles for each function
- Regular permission audits

### API Gateway
- Enable API throttling
- Implement proper authentication
- Monitor for suspicious activity

### Environment Variables
- Use AWS Secrets Manager for sensitive data
- Rotate keys regularly
- Avoid hardcoding credentials

## Next Steps

1. **Frontend Integration**: Update frontend to use the deployed API endpoints
2. **Monitoring**: Set up CloudWatch alarms for critical metrics
3. **CI/CD**: Implement automated deployment pipeline
4. **Testing**: Create comprehensive API tests
5. **Documentation**: Update API documentation

## Support

For issues or questions:
1. Check CloudWatch logs first
2. Verify environment variables and permissions
3. Review Terraform outputs
4. Check AWS service limits and quotas