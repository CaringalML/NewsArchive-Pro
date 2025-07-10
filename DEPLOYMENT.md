# NewsArchive Pro - Deployment Guide

## 🚀 Quick Start

### Frontend Deployment
1. **Build the frontend**:
   ```bash
   npm run build
   ```

2. **Deploy to CloudFront**:
   ```bash
   cd frontend-terraform
   terraform apply
   ```

### Backend Deployment
1. **Deploy Lambda backend**:
   ```bash
   cd lambda-backend
   terraform apply --auto-approve
   ```

## 📋 Architecture Overview

### Frontend Stack
- **React.js** with modern hooks and context
- **Deployed on**: AWS CloudFront + S3
- **Authentication**: Supabase Auth
- **Styling**: Modern CSS with responsive design

### Backend Stack
- **API Gateway**: HTTP API v2 for REST endpoints
- **Lambda Functions**: 
  - Main API handler (`index.js`)
  - OCR Processor (`ai-enhanced-ocr-processor.js`)
  - Job Recovery (`automated-job-recovery.js`)
  - Textract Handler (`textract-completion-handler.js`)
- **Storage**: S3 + CloudFront for images
- **Database**: DynamoDB for job tracking
- **Queue**: SQS for immediate processing
- **OCR**: AWS Textract with AI enhancement

## 🔧 Environment Configuration

### Required Environment Variables

**Frontend (.env)**:
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_API_GATEWAY_URL=https://your-api-id.execute-api.region.amazonaws.com/dev
REACT_APP_SITE_URL=https://your-cloudfront-domain.cloudfront.net
```

**Backend**: Configuration is handled via Terraform variables.

## 📡 API Endpoints

### Main Endpoints
- `GET /newsarchivepro` - Health check
- `POST /users` - Create user
- `GET /users/:id` - Get user
- `POST /locations` - Create location
- `POST /images` - Upload and process image
- `GET /ocr-jobs/:userId` - Get user's OCR jobs
- `GET /ocr-job/:jobId/:createdAt` - Get specific job status

## 🔄 Processing Flow

1. **Image Upload**: Frontend uploads to S3 via API
2. **Queue Message**: Job queued in SQS for immediate processing
3. **OCR Processing**: Lambda processes with Textract + AI enhancement
4. **Status Updates**: Real-time status updates in DynamoDB
5. **Completion**: Results available via API

## 🎯 Key Features

### Immediate Processing
- SQS short polling (0 seconds)
- Lambda concurrency: 20
- No batching delays

### AI-Enhanced OCR
- AWS Textract integration
- Rule-based text correction
- Document type detection
- Confidence scoring

### Status Tracking
- `pending` → `queued` → `processing` → `completed`
- Real-time status updates
- Error handling and recovery

## 🛠 Troubleshooting

### Common Issues
1. **Upload stuck in pending**: Check SQS configuration and Lambda permissions
2. **CORS errors**: Verify API Gateway CORS settings
3. **Authentication issues**: Check Supabase configuration

### Monitoring
- **CloudWatch Logs**: Monitor Lambda function execution
- **SQS Metrics**: Queue depth and processing times
- **API Gateway**: Request/response monitoring

## 🔐 Security

- **Authentication**: Supabase JWT tokens
- **CORS**: Proper origin configuration
- **IAM**: Least privilege access
- **S3**: Secure upload with presigned URLs

## 📊 Performance

- **Immediate SQS processing**: 0ms delay
- **Concurrent Lambda execution**: Up to 20 functions
- **CloudFront CDN**: Global image delivery
- **DynamoDB**: Fast status lookups

## 🏗 Infrastructure as Code

Both frontend and backend use Terraform for:
- Consistent deployments
- Version control
- Environment isolation
- Automated scaling

---

**Status**: ✅ Production Ready
**Last Updated**: 2025-07-09