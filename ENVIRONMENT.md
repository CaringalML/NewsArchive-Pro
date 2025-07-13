# 🔧 Environment Configuration Guide

## 📋 URL Configuration Overview

Your NewsArchive Pro system uses **two main URLs** for different purposes:

### 🚀 **Primary API Gateway URL**
```
REACT_APP_API_GATEWAY_URL=https://c93g2tcpul.execute-api.ap-southeast-2.amazonaws.com/dev
```

**Purpose**: Main backend API endpoint  
**Handles**:
- 📤 **Image uploads** (`POST /images`)
- 🧠 **Processing route analysis** (`POST /processing-recommendation`)  
- 👥 **User management** (`GET/POST /users`)
- 📊 **OCR job monitoring** (`GET /ocr-jobs/:userId`)
- 📄 **Job details & results** (`GET /ocr-job/:jobId/:createdAt`)

### 🌐 **CloudFront Content Delivery URL**
```
REACT_APP_AWS_CLOUDFRONT_DOMAIN=dnit1caol1xgt.cloudfront.net
```

**Purpose**: Fast content delivery  
**Serves**:
- 🖼️ **Uploaded images** (optimized for viewing)
- 📝 **OCR results** (processed text files)
- 📊 **Processing artifacts** (thumbnails, metadata)

---

## 🔄 Processing Architecture

### **Lambda-First Intelligent Routing**

Your system now automatically chooses the best processor:

#### ⚡ **AWS Lambda Route** (Fast Track)
- **When**: Files < 50MB, simple documents, estimated time < 4.5 minutes
- **Speed**: ~30-180 seconds
- **Best for**: Business cards, receipts, single pages
- **Visual**: 🟢 Green badge in UI

#### 🏭 **AWS Batch Route** (Heavy Duty)  
- **When**: Files > 50MB, complex documents, >10 pages, estimated time > 4.5 minutes
- **Speed**: ~5-30 minutes
- **Best for**: Newspapers, magazines, multi-page documents
- **Visual**: 🟠 Orange badge in UI

---

## ⚙️ Configuration Settings

### **OCR Processing Thresholds**
```env
# Lambda vs Batch decision points
REACT_APP_OCR_LAMBDA_MAX_FILE_SIZE=52428800     # 50MB file size limit
REACT_APP_OCR_LAMBDA_TIMEOUT_THRESHOLD=270     # 4.5 minutes (270 seconds)
REACT_APP_OCR_BATCH_MIN_PAGES=10               # 10+ pages triggers Batch
REACT_APP_OCR_SHOW_ROUTE_ANALYSIS=true         # Show "Analyze Routes" button
```

### **Upload Limits**
```env
REACT_APP_MAX_FILE_SIZE=52428800                # 50MB per file
REACT_APP_MAX_BATCH_SIZE=100                    # 100 files per batch
REACT_APP_ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/tiff,image/webp,image/bmp,image/gif
```

---

## 🔗 How URLs Work Together

### **1. Upload Flow**
```
User Upload → API Gateway → Intelligent Router → Lambda/Batch → DynamoDB
```

### **2. Content Delivery**
```
Processed Results → S3 → CloudFront → User Browser (Fast Global Access)
```

### **3. Status Monitoring**
```
Frontend Polling → API Gateway → DynamoDB → Real-time Job Updates
```

---

## 🌍 AWS Region Configuration

All services are deployed in **ap-southeast-2** (Sydney):
- ✅ API Gateway
- ✅ Lambda Functions  
- ✅ AWS Batch
- ✅ DynamoDB
- ✅ S3 Buckets
- ✅ CloudFront (Global CDN)

---

## 🔐 Authentication Flow

```
User Login → Supabase Auth → API Gateway (with JWT) → Protected Endpoints
```

**Supabase URL**: Used only for user authentication  
**API Gateway**: Handles all business logic and data operations

---

## 🎯 Quick Testing

### Test API Connection:
```bash
curl https://c93g2tcpul.execute-api.ap-southeast-2.amazonaws.com/dev/newsarchivepro
```

### Test Processing Recommendation:
```bash
curl -X POST https://c93g2tcpul.execute-api.ap-southeast-2.amazonaws.com/dev/processing-recommendation \
  -H "Content-Type: application/json" \
  -d '{"fileSize": 1000000, "filename": "test.jpg"}'
```

---

## 🚨 Important Notes

1. **Single API Gateway**: All backend operations go through one URL
2. **Intelligent Routing**: System automatically chooses Lambda vs Batch
3. **Fallback System**: Batch failures automatically fall back to Lambda
4. **Global CDN**: Images served from nearest CloudFront edge location
5. **Real-time Updates**: Job status updates every few seconds

---

## 🔧 Development vs Production

### **Development**
- Use `.env.example` as template
- Set `NODE_ENV=development`
- Enable debug logging

### **Production**  
- Copy `.env.example` to `.env`
- Set `NODE_ENV=production`
- Use production CloudFront domains
- Enable monitoring and alerts