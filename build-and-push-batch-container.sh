#!/bin/bash

# Build and Push OCR Batch Container to ECR
# This script builds the Docker container for AWS Batch OCR processing and pushes it to ECR

set -e

# Configuration
PROJECT_NAME="newsarchivepro"
AWS_REGION="ap-southeast-2"
ECR_REPOSITORY_NAME="newsarchivepro-backend"  # From ecr.tf
IMAGE_TAG="ocr-batch"  # From batch.tf

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🐳 Building and Pushing OCR Batch Container${NC}"
echo -e "${BLUE}=============================================${NC}"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}"
FULL_IMAGE_URI="${ECR_URI}:${IMAGE_TAG}"

echo -e "${GREEN}✅ AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${GREEN}✅ ECR Repository: ${ECR_URI}${NC}"
echo -e "${GREEN}✅ Full Image URI: ${FULL_IMAGE_URI}${NC}"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if ECR repository exists
echo -e "${YELLOW}🔍 Checking ECR repository...${NC}"
if ! aws ecr describe-repositories --repository-names "${ECR_REPOSITORY_NAME}" --region "${AWS_REGION}" &> /dev/null; then
    echo -e "${RED}❌ ECR repository not found: ${ECR_REPOSITORY_NAME}${NC}"
    echo -e "${YELLOW}💡 Creating ECR repository...${NC}"
    aws ecr create-repository --repository-name "${ECR_REPOSITORY_NAME}" --region "${AWS_REGION}"
    echo -e "${GREEN}✅ ECR repository created${NC}"
else
    echo -e "${GREEN}✅ ECR repository exists${NC}"
fi

# Login to ECR
echo -e "${YELLOW}🔐 Logging into ECR...${NC}"
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Navigate to batch-ocr-app directory
cd "$(dirname "$0")/backend/batch-ocr-app"

echo -e "${YELLOW}📂 Working directory: $(pwd)${NC}"

# Build Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build -t "${FULL_IMAGE_URI}" .

# Push to ECR
echo -e "${YELLOW}📤 Pushing to ECR...${NC}"
docker push "${FULL_IMAGE_URI}"

echo -e "${GREEN}🎉 SUCCESS!${NC}"
echo -e "${GREEN}✅ Docker image built and pushed to ECR${NC}"
echo -e "${GREEN}✅ Image URI: ${FULL_IMAGE_URI}${NC}"
echo -e "${BLUE}📋 AWS Batch can now use this image for OCR processing${NC}"

# Verify the image exists
echo -e "${YELLOW}🔍 Verifying image in ECR...${NC}"
if aws ecr describe-images --repository-name "${ECR_REPOSITORY_NAME}" --image-ids imageTag="${IMAGE_TAG}" --region "${AWS_REGION}" &> /dev/null; then
    echo -e "${GREEN}✅ Image verified in ECR${NC}"
    
    # Get image details
    IMAGE_DIGEST=$(aws ecr describe-images --repository-name "${ECR_REPOSITORY_NAME}" --image-ids imageTag="${IMAGE_TAG}" --region "${AWS_REGION}" --query 'imageDetails[0].imageDigest' --output text)
    IMAGE_SIZE=$(aws ecr describe-images --repository-name "${ECR_REPOSITORY_NAME}" --image-ids imageTag="${IMAGE_TAG}" --region "${AWS_REGION}" --query 'imageDetails[0].imageSizeInBytes' --output text)
    IMAGE_PUSHED=$(aws ecr describe-images --repository-name "${ECR_REPOSITORY_NAME}" --image-ids imageTag="${IMAGE_TAG}" --region "${AWS_REGION}" --query 'imageDetails[0].imagePushedAt' --output text)
    
    echo -e "${BLUE}📊 Image Details:${NC}"
    echo -e "   Digest: ${IMAGE_DIGEST}"
    echo -e "   Size: $((IMAGE_SIZE / 1024 / 1024)) MB"
    echo -e "   Pushed: ${IMAGE_PUSHED}"
else
    echo -e "${RED}❌ Failed to verify image in ECR${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Next Steps:${NC}"
echo -e "${YELLOW}1. Test Force Batch feature again${NC}"
echo -e "${YELLOW}2. Check AWS Batch console for running jobs${NC}"
echo -e "${YELLOW}3. Monitor CloudWatch logs for OCR processing${NC}"

echo -e "${GREEN}✨ Your Force Batch feature should now work properly!${NC}"