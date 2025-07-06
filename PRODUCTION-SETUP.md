# Production AWS Integration Guide

## Current Status: Development Mode

The application currently uses **mock AWS services** for development. These simulate the behavior of AWS Textract and Comprehend without requiring actual AWS SDK integration in the browser.

## Why Mock Services?

1. **Browser Limitations**: AWS SDK v3 has complex dependencies that don't work well in browser environments
2. **Security**: Direct AWS access from frontend exposes credentials
3. **Best Practice**: AWS operations should be server-side for security and reliability

## Production Implementation Options

### Option 1: Backend API Service (Recommended)

Create a backend service (Node.js, Python, etc.) that handles AWS operations:

```javascript
// Backend API endpoints
POST /api/upload-url          // Get signed S3 upload URL
POST /api/process-document     // Start Textract/Comprehend processing
GET  /api/processing-status/:id // Check processing status
```

**Implementation Steps:**
1. Create a backend service (Express.js, FastAPI, etc.)
2. Install AWS SDK on the server
3. Implement secure endpoints with authentication
4. Update frontend to call your API instead of mock services

### Option 2: Supabase Edge Functions

Use Supabase Edge Functions for serverless AWS processing:

```javascript
// supabase/functions/process-document/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Process with AWS SDK
  // Store results in Supabase
  // Return processing status
})
```

### Option 3: Direct S3 Upload with Lambda Processing

Use S3 triggers and Lambda functions:

1. Frontend uploads directly to S3 using signed URLs
2. S3 triggers Lambda on upload
3. Lambda processes with Textract/Comprehend
4. Results stored back to Supabase via webhook

## Mock Services Behavior

The current mock implementation simulates:

### S3 Upload
- ✅ File validation
- ✅ Upload progress simulation
- ✅ URL generation
- ❌ Actual file storage (files stay in browser)

### Textract OCR
- ✅ Job creation and tracking
- ✅ Processing delays
- ✅ Sample OCR text output
- ✅ Confidence scores
- ❌ Actual image text extraction

### Comprehend Analysis
- ✅ Entity detection (sample entities)
- ✅ Key phrase extraction
- ✅ Sentiment analysis
- ✅ Language detection
- ❌ Actual text analysis

## Converting to Production

### 1. Replace Mock Upload Service

```javascript
// Current (Mock)
const result = await awsServices.uploadToS3(file, fileName);

// Production (via your API)
const result = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 2. Replace Mock Processing

```javascript
// Current (Mock)
await awsServices.processPage(pageId, s3Key);

// Production (via your API)
await fetch('/api/process-document', {
  method: 'POST',
  body: JSON.stringify({ pageId, s3Key }),
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` 
  }
});
```

### 3. Real-time Status Updates

Use Supabase real-time subscriptions:

```javascript
// Listen for processing status changes
supabase
  .channel('processing-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'processing_jobs'
  }, (payload) => {
    // Update UI with real processing status
  })
  .subscribe();
```

## Sample Backend Implementation

### Express.js + AWS SDK

```javascript
const express = require('express');
const AWS = require('aws-sdk');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const s3 = new AWS.S3();
const textract = new AWS.Textract();
const supabase = createClient(url, key);

// Get signed upload URL
app.post('/api/upload-url', async (req, res) => {
  const { fileName, fileType } = req.body;
  const key = `newspapers/${Date.now()}-${fileName}`;
  
  const signedUrl = s3.getSignedUrl('putObject', {
    Bucket: 'your-bucket',
    Key: key,
    ContentType: fileType,
    Expires: 3600
  });
  
  res.json({ uploadUrl: signedUrl, key });
});

// Start document processing
app.post('/api/process-document', async (req, res) => {
  const { pageId, s3Key } = req.body;
  
  // Start Textract job
  const result = await textract.startDocumentAnalysis({
    DocumentLocation: { S3Object: { Bucket: 'your-bucket', Name: s3Key } },
    FeatureTypes: ['TABLES', 'FORMS']
  }).promise();
  
  // Store job ID in database
  await supabase.from('processing_jobs').insert({
    page_id: pageId,
    aws_job_id: result.JobId,
    status: 'processing'
  });
  
  res.json({ jobId: result.JobId });
});
```

## Testing Production Features

1. **Database Setup**: ✅ Complete (ready for production)
2. **File Upload**: 🔄 Mock (needs backend implementation)
3. **OCR Processing**: 🔄 Mock (needs AWS Textract)
4. **Metadata Analysis**: 🔄 Mock (needs AWS Comprehend)
5. **Search & QA**: ✅ Complete (works with mock data)

## Security Considerations

- Use IAM roles with minimal permissions
- Implement rate limiting on API endpoints
- Validate file types and sizes server-side
- Use signed URLs with expiration
- Encrypt sensitive data in transit and at rest

## Cost Optimization

- Use S3 lifecycle policies for old files
- Implement text caching to avoid re-processing
- Use Textract async APIs for better pricing
- Monitor AWS usage with CloudWatch

The application is fully functional in development mode and ready for production AWS integration when you implement the backend services.