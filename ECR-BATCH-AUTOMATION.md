# 🔄 ECR-Batch Automation Documentation

## 📋 Overview

This system automatically updates AWS Batch job definitions whenever you push new container images to ECR. No manual intervention required!

### **Automation Flow:**
```
ECR Push → EventBridge → Lambda → Batch Job Definition Update
```

---

## 🏗️ **Architecture Components**

### **1. EventBridge Rule** (`eventbridge.tf`)
- **Triggers on**: ECR image push events
- **Filters for**: Your specific ECR repository only
- **Event Pattern**: `aws.ecr` source with `PUSH` action

### **2. Lambda Function** (`ecr-batch-updater.js`)
- **Function**: `newsarchivepro-ecr-batch-updater`
- **Timeout**: 5 minutes
- **Memory**: 256MB
- **Trigger**: EventBridge ECR events

### **3. IAM Permissions** (`eventbridge.tf`)
- **ECR**: Read repository and image details
- **Batch**: Update job definitions
- **Logs**: CloudWatch logging

### **4. Monitoring** (`batch_monitoring.tf`)
- **Dashboard**: ECR-Batch automation metrics
- **Alarms**: Failed updates
- **Logs**: Success/failure tracking

---

## 🚀 **Deployment Steps**

### **1. Deploy Infrastructure**
```bash
# From backend directory
terraform apply

# Verify deployment
terraform output ecr_batch_updater_lambda_arn
terraform output ecr_eventbridge_rule_arn
```

### **2. Test the Automation**
```bash
# Make the test script executable
chmod +x test-ecr-batch-automation.sh

# Check if everything is deployed correctly
./test-ecr-batch-automation.sh check

# Run full end-to-end test
./test-ecr-batch-automation.sh test
```

---

## 📊 **How It Works**

### **Step-by-Step Process:**

#### **1. ECR Image Push Event**
```json
{
  "source": "aws.ecr",
  "detail-type": "ECR Image Action",
  "detail": {
    "action-type": "PUSH",
    "result": "SUCCESS", 
    "repository-name": "newsarchive-backend",
    "image-tag": "latest"
  }
}
```

#### **2. EventBridge Triggers Lambda**
- Filters events for your repository only
- Passes image details to Lambda function
- Only successful pushes trigger updates

#### **3. Lambda Updates Batch**
```javascript
// Lambda function process:
1. Parse ECR event details
2. Verify image exists in ECR  
3. Get current Batch job definition
4. Create new job definition with updated image
5. Log success/failure
```

#### **4. New Batch Jobs Use Latest Image**
- All future Batch jobs automatically use the new image
- No downtime or manual intervention required
- Previous job definition revisions remain available

---

## 🎯 **What Gets Updated**

### **Before Push:**
```hcl
# Batch Job Definition Revision 1
container_properties = {
  image = "123456789.dkr.ecr.ap-southeast-2.amazonaws.com/newsarchive-backend:v1.0"
  # ... other properties
}
```

### **After Push:**
```hcl
# Batch Job Definition Revision 2 (NEW)
container_properties = {
  image = "123456789.dkr.ecr.ap-southeast-2.amazonaws.com/newsarchive-backend:latest"
  # ... same other properties
}
```

### **What Stays the Same:**
- ✅ CPU and memory configuration
- ✅ Environment variables
- ✅ IAM roles and permissions
- ✅ Job queue and compute environment
- ✅ Retry and timeout settings

### **What Changes:**
- 🔄 Container image URI
- 🔄 Job definition revision number
- 🔄 Update timestamp tags

---

## 📈 **Monitoring & Troubleshooting**

### **CloudWatch Dashboard**
Navigate to: **CloudWatch > Dashboards > newsarchivepro-ocr-processing**

**Widgets Available:**
- 📊 ECR-Batch Auto-Update Metrics
- 📋 Recent ECR-Batch Updates
- ⚠️ Lambda Errors and Performance

### **CloudWatch Logs**
```bash
# View automation logs
aws logs tail /aws/lambda/newsarchivepro-ecr-batch-updater --follow

# Search for specific events
aws logs filter-log-events \
  --log-group-name /aws/lambda/newsarchivepro-ecr-batch-updater \
  --filter-pattern "🐳 New ECR image detected"
```

### **Manual Verification**
```bash
# Check current Batch job definition
aws batch describe-job-definitions \
  --job-definition-name newsarchivepro-ocr-job-definition \
  --status ACTIVE

# Check EventBridge rule
aws events describe-rule \
  --name newsarchivepro-ecr-image-push

# Check Lambda function
aws lambda get-function \
  --function-name newsarchivepro-ecr-batch-updater
```

---

## 🐛 **Common Issues & Solutions**

### **Issue: Lambda Not Triggered**
**Symptoms:** ECR push doesn't trigger automation

**Solutions:**
1. **Check EventBridge Rule:**
   ```bash
   aws events describe-rule --name newsarchivepro-ecr-image-push
   ```
   
2. **Verify Repository Name:**
   ```bash
   # Rule should match your ECR repository name exactly
   aws ecr describe-repositories --repository-names newsarchive-backend
   ```

3. **Check Lambda Permissions:**
   ```bash
   aws lambda get-policy --function-name newsarchivepro-ecr-batch-updater
   ```

### **Issue: Lambda Fails to Update Batch**
**Symptoms:** Lambda runs but Batch job definition doesn't update

**Solutions:**
1. **Check IAM Permissions:**
   ```bash
   # Lambda should have batch:RegisterJobDefinition permission
   aws iam get-role-policy --role-name newsarchivepro-ecr-batch-updater-role --policy-name newsarchivepro-ecr-batch-updater-policy
   ```

2. **Verify Job Definition Exists:**
   ```bash
   aws batch describe-job-definitions --job-definition-name newsarchivepro-ocr-job-definition --status ACTIVE
   ```

3. **Check Lambda Logs:**
   ```bash
   aws logs tail /aws/lambda/newsarchivepro-ecr-batch-updater --since 1h
   ```

### **Issue: Wrong Image Updated**
**Symptoms:** Automation updates but with wrong image

**Solutions:**
1. **Check Image Tag:** Default is `latest`, make sure you're pushing to the right tag
2. **Verify ECR URI:** Ensure the repository URI format is correct
3. **Check Lambda Environment Variables:**
   ```bash
   aws lambda get-function-configuration --function-name newsarchivepro-ecr-batch-updater
   ```

---

## 🧪 **Testing the Automation**

### **Quick Test:**
```bash
# Build and push a test image
docker build -t newsarchive-backend:test .
docker tag newsarchive-backend:test 123456789.dkr.ecr.ap-southeast-2.amazonaws.com/newsarchive-backend:test
docker push 123456789.dkr.ecr.ap-southeast-2.amazonaws.com/newsarchive-backend:test

# Monitor automation
./test-ecr-batch-automation.sh monitor
```

### **Full Test:**
```bash
# Automated end-to-end test
./test-ecr-batch-automation.sh test
```

---

## 🔧 **Configuration Options**

### **Environment Variables** (in `eventbridge.tf`)
```hcl
environment {
  variables = {
    PROJECT_NAME              = "newsarchivepro"
    ECR_REPOSITORY_NAME      = "newsarchive-backend"  
    BATCH_JOB_DEFINITION_NAME = "newsarchivepro-ocr-job-definition"
    BATCH_JOB_QUEUE          = "newsarchivepro-ocr-job-queue"
    LOG_LEVEL                = "INFO"
  }
}
```

### **EventBridge Filter** (in `eventbridge.tf`)
```json
{
  "source": ["aws.ecr"],
  "detail-type": ["ECR Image Action"],
  "detail": {
    "action-type": ["PUSH"],
    "result": ["SUCCESS"],
    "repository-name": ["newsarchive-backend"]  // Only this repo
  }
}
```

---

## 🚦 **Production Considerations**

### **Security:**
- ✅ Lambda uses least-privilege IAM role
- ✅ Only specific ECR repository triggers updates
- ✅ No manual credentials required

### **Reliability:**
- ✅ Lambda has retry mechanism
- ✅ Failed updates are logged and alarmed
- ✅ Previous job definition revisions remain available

### **Cost:**
- ✅ Lambda only runs on ECR pushes (event-driven)
- ✅ No polling or scheduled jobs
- ✅ Minimal CloudWatch usage

### **Scalability:**
- ✅ Handles multiple concurrent ECR pushes
- ✅ Updates multiple Batch job definitions if needed
- ✅ No infrastructure scaling required

---

## 📞 **Support & Maintenance**

### **Regular Checks:**
1. **Monthly:** Review CloudWatch metrics
2. **Quarterly:** Test automation with new image push
3. **Annually:** Update Lambda runtime if needed

### **Logs Retention:**
- Lambda logs: 14 days (configurable in `eventbridge.tf`)
- Metrics data: 15 months (CloudWatch default)

### **Backup Strategy:**
- Terraform state includes all configuration
- Previous Batch job definition revisions preserved
- ECR images retained per repository lifecycle policy

This automation ensures your AWS Batch jobs always use the latest container images without any manual intervention! 🚀