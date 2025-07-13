variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-2"
}

variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "newsarchivepro-lambda"
}

variable "lambda_runtime" {
  description = "Runtime for the Lambda function"
  type        = string
  default     = "nodejs20.x"
}

variable "lambda_timeout" {
  description = "Timeout for the Lambda function in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory_size" {
  description = "Memory size for the Lambda function in MB"
  type        = number
  default     = 128
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "frontend_cloudfront_domain" {
  description = "Frontend CloudFront distribution domain"
  type        = string
  default     = "d1gnn36zhrv38g.cloudfront.net"
}

variable "frontend_cloudfront_url" {
  description = "Frontend CloudFront distribution URL"
  type        = string
  default     = "https://d1gnn36zhrv38g.cloudfront.net"
}

variable "allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = [
    "http://localhost:3000",
    "https://d1gnn36zhrv38g.cloudfront.net"
  ]
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    Environment = "dev"
    Project     = "newsarchivepro"
    ManagedBy   = "terraform"
  }
}

# AWS Batch variables
variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "newsarchivepro"
}

variable "batch_compute_max_vcpus" {
  description = "Maximum vCPUs for Batch Fargate compute environment"
  type        = number
  default     = 16  # Reduced for Fargate cost efficiency
}

variable "batch_job_vcpus" {
  description = "vCPUs for each Batch OCR job (Fargate valid values: 0.25, 0.5, 1.0, 2.0, 4.0)"
  type        = string
  default     = "1.0"
}

variable "batch_job_memory" {
  description = "Memory (MB) for each Batch OCR job (must match Fargate vCPU requirements)"
  type        = string
  default     = "2048"  # 2GB for 1 vCPU
}

variable "batch_job_timeout" {
  description = "Timeout (seconds) for Batch OCR jobs"
  type        = number
  default     = 3600  # 1 hour
}

variable "batch_job_retry_attempts" {
  description = "Number of retry attempts for failed Batch jobs"
  type        = number
  default     = 3
}

# SQS variables
variable "sqs_processing_queue_visibility_timeout" {
  description = "Visibility timeout for OCR processing queue (seconds)"
  type        = number
  default     = 300  # 5 minutes
}

variable "sqs_results_queue_visibility_timeout" {
  description = "Visibility timeout for OCR results queue (seconds)"
  type        = number
  default     = 300  # 5 minutes
}

# Lambda function specific variables
variable "s3_event_handler_memory" {
  description = "Memory (MB) for S3 Event Handler Lambda"
  type        = number
  default     = 256
}

variable "s3_event_handler_timeout" {
  description = "Timeout (seconds) for S3 Event Handler Lambda"
  type        = number
  default     = 30
}

variable "batch_job_submitter_memory" {
  description = "Memory (MB) for Batch Job Submitter Lambda"
  type        = number
  default     = 512
}

variable "batch_job_submitter_timeout" {
  description = "Timeout (seconds) for Batch Job Submitter Lambda"
  type        = number
  default     = 60
}

# Monitoring variables
variable "batch_queue_size_alarm_threshold" {
  description = "Threshold for high Batch queue size alarm"
  type        = number
  default     = 50
}

variable "sqs_queue_depth_alarm_threshold" {
  description = "Threshold for high SQS queue depth alarm"
  type        = number
  default     = 50
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}