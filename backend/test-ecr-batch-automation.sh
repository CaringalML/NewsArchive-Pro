#!/bin/bash
# Test Script for ECR-Batch Automation
# This script helps you test the automatic Batch job definition updates when pushing to ECR

set -e

# Configuration
PROJECT_NAME="newsarchivepro"
AWS_REGION="ap-southeast-2"
ECR_REPOSITORY_NAME="newsarchive-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 ECR-Batch Automation Test Script${NC}"
echo -e "${BLUE}====================================${NC}"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}"

echo -e "${GREEN}✅ AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${GREEN}✅ ECR Repository: ${ECR_URI}${NC}"

# Function to check if ECR repository exists
check_ecr_repository() {
    echo -e "${YELLOW}🔍 Checking ECR repository...${NC}"
    
    if aws ecr describe-repositories --repository-names "${ECR_REPOSITORY_NAME}" --region "${AWS_REGION}" &> /dev/null; then
        echo -e "${GREEN}✅ ECR repository exists: ${ECR_REPOSITORY_NAME}${NC}"
        return 0
    else
        echo -e "${RED}❌ ECR repository not found: ${ECR_REPOSITORY_NAME}${NC}"
        echo -e "${YELLOW}💡 Create it with: aws ecr create-repository --repository-name ${ECR_REPOSITORY_NAME} --region ${AWS_REGION}${NC}"
        return 1
    fi
}

# Function to check if EventBridge rule exists
check_eventbridge_rule() {
    echo -e "${YELLOW}🔍 Checking EventBridge rule...${NC}"
    
    RULE_NAME="${PROJECT_NAME}-ecr-image-push"
    if aws events describe-rule --name "${RULE_NAME}" --region "${AWS_REGION}" &> /dev/null; then
        echo -e "${GREEN}✅ EventBridge rule exists: ${RULE_NAME}${NC}"
        
        # Check if rule is enabled
        RULE_STATE=$(aws events describe-rule --name "${RULE_NAME}" --region "${AWS_REGION}" --query 'State' --output text)
        if [ "$RULE_STATE" = "ENABLED" ]; then
            echo -e "${GREEN}✅ EventBridge rule is enabled${NC}"
        else
            echo -e "${YELLOW}⚠️ EventBridge rule is disabled${NC}"
        fi
        return 0
    else
        echo -e "${RED}❌ EventBridge rule not found: ${RULE_NAME}${NC}"
        echo -e "${YELLOW}💡 Deploy with: terraform apply${NC}"
        return 1
    fi
}

# Function to check if Lambda function exists
check_lambda_function() {
    echo -e "${YELLOW}🔍 Checking Lambda function...${NC}"
    
    FUNCTION_NAME="${PROJECT_NAME}-ecr-batch-updater"
    if aws lambda get-function --function-name "${FUNCTION_NAME}" --region "${AWS_REGION}" &> /dev/null; then
        echo -e "${GREEN}✅ Lambda function exists: ${FUNCTION_NAME}${NC}"
        
        # Get function status
        FUNCTION_STATE=$(aws lambda get-function --function-name "${FUNCTION_NAME}" --region "${AWS_REGION}" --query 'Configuration.State' --output text)
        echo -e "${GREEN}✅ Function state: ${FUNCTION_STATE}${NC}"
        return 0
    else
        echo -e "${RED}❌ Lambda function not found: ${FUNCTION_NAME}${NC}"
        echo -e "${YELLOW}💡 Deploy with: terraform apply${NC}"
        return 1
    fi
}

# Function to check current Batch job definition
check_batch_job_definition() {
    echo -e "${YELLOW}🔍 Checking Batch job definition...${NC}"
    
    JOB_DEF_NAME="${PROJECT_NAME}-ocr-job-definition"
    if aws batch describe-job-definitions --job-definition-name "${JOB_DEF_NAME}" --status ACTIVE --region "${AWS_REGION}" &> /dev/null; then
        
        # Get current image and revision
        CURRENT_IMAGE=$(aws batch describe-job-definitions \
            --job-definition-name "${JOB_DEF_NAME}" \
            --status ACTIVE \
            --region "${AWS_REGION}" \
            --query 'jobDefinitions[0].containerProperties.image' \
            --output text)
        
        CURRENT_REVISION=$(aws batch describe-job-definitions \
            --job-definition-name "${JOB_DEF_NAME}" \
            --status ACTIVE \
            --region "${AWS_REGION}" \
            --query 'jobDefinitions[0].revision' \
            --output text)
        
        echo -e "${GREEN}✅ Batch job definition exists: ${JOB_DEF_NAME}${NC}"
        echo -e "${GREEN}✅ Current revision: ${CURRENT_REVISION}${NC}"
        echo -e "${GREEN}✅ Current image: ${CURRENT_IMAGE}${NC}"
        return 0
    else
        echo -e "${RED}❌ Batch job definition not found: ${JOB_DEF_NAME}${NC}"
        echo -e "${YELLOW}💡 Deploy with: terraform apply${NC}"
        return 1
    fi
}

# Function to simulate ECR push (build and push a test image)
simulate_ecr_push() {
    echo -e "${YELLOW}🐳 Simulating ECR push...${NC}"
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        return 1
    fi
    
    # Create a simple test Dockerfile
    TEST_DIR="/tmp/ecr-test-${PROJECT_NAME}"
    mkdir -p "${TEST_DIR}"
    
    cat > "${TEST_DIR}/Dockerfile" << 'EOF'
FROM node:18-alpine
WORKDIR /app
RUN echo "console.log('ECR-Batch Automation Test Image');" > test.js
RUN echo "console.log('Built at: $(date)');" >> test.js
CMD ["node", "test.js"]
EOF

    echo -e "${BLUE}📝 Created test Dockerfile${NC}"
    
    # Login to ECR
    echo -e "${YELLOW}🔐 Logging into ECR...${NC}"
    aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    # Build test image
    TEST_TAG="automation-test-$(date +%s)"
    IMAGE_URI="${ECR_URI}:${TEST_TAG}"
    
    echo -e "${YELLOW}🔨 Building test image: ${IMAGE_URI}${NC}"
    docker build -t "${IMAGE_URI}" "${TEST_DIR}"
    
    # Push test image
    echo -e "${YELLOW}📤 Pushing test image to ECR...${NC}"
    docker push "${IMAGE_URI}"
    
    echo -e "${GREEN}✅ Successfully pushed test image: ${IMAGE_URI}${NC}"
    echo -e "${BLUE}📋 This should trigger the EventBridge rule and update the Batch job definition${NC}"
    
    # Cleanup
    rm -rf "${TEST_DIR}"
    docker rmi "${IMAGE_URI}" &> /dev/null || true
    
    return 0
}

# Function to monitor the automation
monitor_automation() {
    echo -e "${YELLOW}👀 Monitoring ECR-Batch automation...${NC}"
    
    FUNCTION_NAME="${PROJECT_NAME}-ecr-batch-updater"
    
    echo -e "${BLUE}Waiting for Lambda function to be triggered (30 seconds)...${NC}"
    sleep 30
    
    # Check Lambda logs
    echo -e "${YELLOW}📋 Checking Lambda logs...${NC}"
    aws logs tail "/aws/lambda/${FUNCTION_NAME}" \
        --since 5m \
        --follow \
        --region "${AWS_REGION}" \
        --format short || true
}

# Function to verify the update
verify_update() {
    echo -e "${YELLOW}✅ Verifying Batch job definition update...${NC}"
    
    JOB_DEF_NAME="${PROJECT_NAME}-ocr-job-definition"
    
    # Get new image and revision
    NEW_IMAGE=$(aws batch describe-job-definitions \
        --job-definition-name "${JOB_DEF_NAME}" \
        --status ACTIVE \
        --region "${AWS_REGION}" \
        --query 'jobDefinitions[0].containerProperties.image' \
        --output text)
    
    NEW_REVISION=$(aws batch describe-job-definitions \
        --job-definition-name "${JOB_DEF_NAME}" \
        --status ACTIVE \
        --region "${AWS_REGION}" \
        --query 'jobDefinitions[0].revision' \
        --output text)
    
    echo -e "${GREEN}✅ Updated revision: ${NEW_REVISION}${NC}"
    echo -e "${GREEN}✅ Updated image: ${NEW_IMAGE}${NC}"
    
    if [[ "${NEW_IMAGE}" == *"automation-test"* ]]; then
        echo -e "${GREEN}🎉 SUCCESS: Batch job definition was automatically updated with the test image!${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ The image may not have been updated yet. Check the Lambda logs for details.${NC}"
        return 1
    fi
}

# Main execution
main() {
    case "${1:-}" in
        "check")
            echo -e "${BLUE}🔍 Running system checks...${NC}"
            check_ecr_repository
            check_eventbridge_rule
            check_lambda_function
            check_batch_job_definition
            ;;
        "test")
            echo -e "${BLUE}🧪 Running full automation test...${NC}"
            check_ecr_repository || exit 1
            check_eventbridge_rule || exit 1
            check_lambda_function || exit 1
            check_batch_job_definition || exit 1
            simulate_ecr_push || exit 1
            monitor_automation
            echo -e "${YELLOW}⏳ Waiting 60 seconds for automation to complete...${NC}"
            sleep 60
            verify_update
            ;;
        "push")
            echo -e "${BLUE}📤 Simulating ECR push only...${NC}"
            check_ecr_repository || exit 1
            simulate_ecr_push
            ;;
        "monitor")
            echo -e "${BLUE}👀 Monitoring automation...${NC}"
            monitor_automation
            ;;
        "verify")
            echo -e "${BLUE}✅ Verifying automation results...${NC}"
            verify_update
            ;;
        *)
            echo -e "${BLUE}Usage: $0 {check|test|push|monitor|verify}${NC}"
            echo ""
            echo -e "${YELLOW}Commands:${NC}"
            echo -e "  ${GREEN}check${NC}   - Check if all components are deployed"
            echo -e "  ${GREEN}test${NC}    - Run full end-to-end test"
            echo -e "  ${GREEN}push${NC}    - Simulate ECR push only"
            echo -e "  ${GREEN}monitor${NC} - Monitor Lambda logs"
            echo -e "  ${GREEN}verify${NC}  - Verify Batch job definition was updated"
            echo ""
            echo -e "${YELLOW}Example:${NC}"
            echo -e "  $0 check    # Check system status"
            echo -e "  $0 test     # Run full test"
            exit 1
            ;;
    esac
}

main "$@"