# NewsArchive Pro Backend

Express.js-style organized AWS Lambda functions for document processing.

## 🏗️ Architecture

```
backend/
├── src/
│   ├── app.js                 # Main application entry point
│   ├── routes/               # Route definitions
│   ├── controllers/          # Request handlers
│   ├── services/             # Business logic
│   ├── middleware/           # Express-style middleware
│   ├── database/             # Data access layer
│   ├── config/               # Configuration management
│   └── utils/                # Utility functions
├── index.js                  # Lambda handler export
├── build.js                  # Build script
└── package.json             # Dependencies
```

## 🚀 Features

- **Express.js-style organization** - Familiar structure for Node.js developers
- **Centralized configuration** - All config in one place
- **Structured logging** - JSON-formatted logs with levels
- **Error handling** - Centralized error middleware
- **CORS support** - Configurable CORS headers
- **Database abstraction** - Clean data access layer
- **Service layer** - Business logic separated from controllers

## 📦 Lambda Functions

All functions share the same deployment package but are routed internally:

1. **get-upload-url** - Generate S3 presigned URLs
2. **process-document** - Initiate OCR processing
3. **ocr-processor** - Process documents with Textract/Comprehend
4. **get-processing-status** - Query job status

## 🛠️ Development

### Install Dependencies
```bash
npm install
```

### Build Deployment Package
```bash
npm run build
```

This creates `dist/newsarchive-lambda.zip` (~50MB).

### Lint Code
```bash
npm run lint
npm run lint:fix
```

### Run Tests
```bash
npm test
```

## 🔧 Configuration

Environment variables are managed in `src/config/index.js`:

- `AWS_REGION` - AWS region
- `S3_BUCKET` - Document storage bucket
- `SUPABASE_URL` - Database URL
- `SUPABASE_SERVICE_KEY` - Service key
- `CLOUDFRONT_DOMAIN` - CDN domain
- `FRONTEND_DOMAIN` - Frontend URL for CORS
- `PROCESSING_QUEUE_URL` - SQS queue URL

## 📝 Code Structure

### Controllers
Handle HTTP requests and responses:
```javascript
exports.getUploadUrl = async (event) => {
  const body = JSON.parse(event.body);
  const result = await uploadService.generateUploadUrl(body);
  return ApiResponse.success(result);
};
```

### Services
Contain business logic:
```javascript
exports.generateUploadUrl = async ({ fileName, contentType, userId }) => {
  // Business logic here
  return { uploadUrl, key, viewUrl };
};
```

### Database
Clean data access:
```javascript
await db.processingJobs.create({
  job_type: 'textract',
  status: 'processing'
});
```

### Middleware
Express-style middleware:
```javascript
exports.corsMiddleware = () => {
  return {
    headers: {
      'Access-Control-Allow-Origin': config.cors.allowedOrigin
    }
  };
};
```

## 🚢 Deployment

Deploy with Terraform:
```bash
cd ../terraform
terraform apply
```

All Lambda functions use the same zip file but maintain separate configurations.

## 📊 Monitoring

- CloudWatch Logs: `/aws/lambda/{environment}-newsarchive-{function}`
- Structured JSON logs for easy querying
- Error tracking with stack traces (dev only)

## 🔒 Security

- Supabase Row Level Security
- CORS restricted to frontend domain
- Input validation on all endpoints
- Secure credential management

## 🧪 Testing

Local testing example:
```javascript
const { handler } = require('./src/app');

const event = {
  httpMethod: 'POST',
  body: JSON.stringify({ /* request data */ })
};

const context = {
  functionName: 'dev-newsarchive-get-upload-url'
};

const result = await handler(event, context);
```