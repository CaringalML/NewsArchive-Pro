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