# NewsArchive Pro Backend Deployment Makefile

# Variables
PROJECT_NAME := newsarchive-pro
ENVIRONMENT := dev
AWS_REGION := us-east-1
BACKEND_DIR := backend
TERRAFORM_DIR := terraform
DIST_DIR := $(BACKEND_DIR)/dist

# Lambda functions
LAMBDA_FUNCTIONS := get-upload-url process-document ocr-processor get-processing-status

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

.PHONY: help build clean deploy destroy test lint fmt deps check-deps check-env terraform-init terraform-plan terraform-apply terraform-destroy

help: ## Show this help message
	@echo "NewsArchive Pro Backend Deployment"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check-deps: ## Check if required dependencies are installed
	@echo "$(YELLOW)Checking dependencies...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)Node.js is not installed$(NC)"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)npm is not installed$(NC)"; exit 1; }
	@command -v terraform >/dev/null 2>&1 || { echo "$(RED)Terraform is not installed$(NC)"; exit 1; }
	@command -v aws >/dev/null 2>&1 || { echo "$(RED)AWS CLI is not installed$(NC)"; exit 1; }
	@echo "$(GREEN)All dependencies are installed$(NC)"

check-env: ## Check if terraform.tfvars exists with required variables
	@echo "$(YELLOW)Checking terraform configuration...$(NC)"
	@test -f "$(TERRAFORM_DIR)/terraform.tfvars" || { echo "$(RED)terraform.tfvars file not found in $(TERRAFORM_DIR)$(NC)"; exit 1; }
	@grep -q "supabase_url" "$(TERRAFORM_DIR)/terraform.tfvars" || { echo "$(RED)supabase_url not found in terraform.tfvars$(NC)"; exit 1; }
	@grep -q "supabase_service_key" "$(TERRAFORM_DIR)/terraform.tfvars" || { echo "$(RED)supabase_service_key not found in terraform.tfvars$(NC)"; exit 1; }
	@echo "$(GREEN)Terraform configuration is ready$(NC)"

deps: ## Install Node.js dependencies
	@echo "$(YELLOW)Installing Node.js dependencies...$(NC)"
	cd $(BACKEND_DIR) && npm install
	@echo "$(GREEN)Dependencies installed$(NC)"

fmt: ## Format Node.js code
	@echo "$(YELLOW)Formatting Node.js code...$(NC)"
	cd $(BACKEND_DIR) && npx prettier --write .
	@echo "$(GREEN)Code formatted$(NC)"

lint: ## Run Node.js linter
	@echo "$(YELLOW)Running Node.js linter...$(NC)"
	cd $(BACKEND_DIR) && npm run lint
	@echo "$(GREEN)Linting completed$(NC)"

test: ## Run Node.js tests
	@echo "$(YELLOW)Running Node.js tests...$(NC)"
	cd $(BACKEND_DIR) && npm test
	@echo "$(GREEN)Tests completed$(NC)"

clean: ## Clean build artifacts
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf $(DIST_DIR)
	@echo "$(GREEN)Clean completed$(NC)"

build: deps ## Build all Lambda functions
	@echo "$(YELLOW)Building Lambda functions...$(NC)"
	cd $(BACKEND_DIR) && npm run build
	@echo "$(GREEN)Build completed$(NC)"

terraform-init: ## Initialize Terraform
	@echo "$(YELLOW)Checking Terraform initialization...$(NC)"
	@if [ ! -d "$(TERRAFORM_DIR)/.terraform" ]; then \
		echo "$(YELLOW)Initializing Terraform for the first time...$(NC)"; \
		cd $(TERRAFORM_DIR) && terraform init; \
		echo "$(GREEN)Terraform initialized$(NC)"; \
	else \
		echo "$(GREEN)Terraform already initialized, skipping init$(NC)"; \
		echo "$(YELLOW)Run 'make terraform-reinit' if you need to reinitialize$(NC)"; \
	fi

terraform-reinit: ## Force reinitialize Terraform
	@echo "$(YELLOW)Force reinitializing Terraform...$(NC)"
	cd $(TERRAFORM_DIR) && rm -rf .terraform .terraform.lock.hcl
	cd $(TERRAFORM_DIR) && terraform init
	@echo "$(GREEN)Terraform reinitialized$(NC)"

terraform-plan: ## Plan Terraform deployment (run 'make terraform-init' first if needed)
	@echo "$(YELLOW)Planning Terraform deployment...$(NC)"
	cd $(TERRAFORM_DIR) && terraform plan
	@echo "$(GREEN)Terraform plan completed$(NC)"

terraform-apply: ## Apply Terraform configuration (run 'make terraform-init' first if needed)
	@echo "$(YELLOW)Applying Terraform configuration...$(NC)"
	cd $(TERRAFORM_DIR) && terraform apply -auto-approve
	@echo "$(GREEN)Terraform applied$(NC)"

terraform-destroy: ## Destroy Terraform resources
	@echo "$(YELLOW)Destroying Terraform resources...$(NC)"
	cd $(TERRAFORM_DIR) && terraform destroy -auto-approve
	@echo "$(GREEN)Terraform destroyed$(NC)"

deploy: check-deps check-env build terraform-apply ## Full deployment pipeline
	@echo "$(GREEN)Deployment completed successfully!$(NC)"
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "1. Update your frontend environment variables with the API Gateway URL"
	@echo "2. Test the API endpoints"
	@echo "3. Monitor CloudWatch logs for any issues"
	@echo ""
	@echo "$(YELLOW)API Gateway URL:$(NC)"
	@cd $(TERRAFORM_DIR) && terraform output api_gateway_url

destroy: terraform-destroy ## Destroy all resources
	@echo "$(RED)All resources have been destroyed$(NC)"

# Development helpers
dev-build: deps ## Build for development (faster, no tests)
	@echo "$(YELLOW)Building for development...$(NC)"
	cd $(BACKEND_DIR) && npm run build
	@echo "$(GREEN)Development build completed$(NC)"

dev-deploy: check-deps check-env dev-build terraform-apply ## Quick deployment for development
	@echo "$(GREEN)Development deployment completed!$(NC)"

status: ## Show deployment status
	@echo "$(YELLOW)Deployment Status:$(NC)"
	@cd $(TERRAFORM_DIR) && terraform show -json | jq -r '.values.outputs | to_entries[] | "\(.key): \(.value.value)"' || echo "No deployment found"

outputs: ## Show Terraform outputs
	@echo "$(YELLOW)Terraform Outputs:$(NC)"
	@cd $(TERRAFORM_DIR) && terraform output

logs: ## Show recent Lambda logs (requires AWS CLI)
	@echo "$(YELLOW)Recent Lambda logs:$(NC)"
	@for func in $(LAMBDA_FUNCTIONS); do \
		echo "=== $$func logs ==="; \
		aws logs tail /aws/lambda/$(ENVIRONMENT)-$(PROJECT_NAME)-$$func --since 1h --follow=false || echo "No logs found"; \
		echo ""; \
	done

# Environment-specific targets
prod-deploy: ENVIRONMENT=prod
prod-deploy: deploy ## Deploy to production

staging-deploy: ENVIRONMENT=staging
staging-deploy: deploy ## Deploy to staging

# Validation targets
validate: fmt lint test ## Run all validation checks

pre-commit: validate build ## Run pre-commit checks

# Docker targets (for CI/CD)
docker-build: ## Build in Docker container
	docker run --rm -v $(PWD):/workspace -w /workspace/$(BACKEND_DIR) golang:1.21 make build

docker-test: ## Test in Docker container
	docker run --rm -v $(PWD):/workspace -w /workspace/$(BACKEND_DIR) golang:1.21 make test