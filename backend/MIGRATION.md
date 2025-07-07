# Lambda Consolidation Migration Guide

## Overview

We've consolidated all Lambda functions into a single deployment package to improve build times and maintainability.

## What Changed

### Before
- 4 separate Lambda function directories
- 4 separate zip files (get-upload-url.zip, process-document.zip, etc.)
- Slower builds, larger total size

### After
- Single `lambda/` directory with all handlers
- One zip file: `newsarchive-lambda.zip`
- Faster builds, smaller deployment size

## Migration Steps

1. **Clean Old Build Artifacts**
   ```bash
   cd backend
   rm -rf dist/
   ```

2. **Build New Package**
   ```bash
   npm run build
   ```
   This creates `dist/newsarchive-lambda.zip`

3. **Deploy with Terraform**
   ```bash
   cd ../terraform
   terraform apply
   ```

## Rollback Instructions

If you need to rollback to the old structure:

1. Use the old build script:
   ```bash
   cd backend
   npm run build-old
   ```

2. Update `terraform/lambda.tf` to use individual zip files again

## Troubleshooting

### Issue: Lambda functions not finding handlers
**Solution**: Make sure the Lambda function names match the expected pattern. The router extracts the handler name from the function name.

### Issue: Missing environment variables
**Solution**: Check that all Lambda functions in `terraform/lambda.tf` have the required environment variables.

### Issue: CORS errors
**Solution**: Verify that `FRONTEND_DOMAIN` is set correctly in all Lambda environment variables.