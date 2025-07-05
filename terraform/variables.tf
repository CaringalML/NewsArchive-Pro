# variables.tf - Updated to support frontend-to-backend API requests

# Basic infrastructure settings
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# Resource naming
variable "s3_bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
  default     = "caringalfrontend"
}

variable "waf_name" {
  description = "Name for the WAF ACL"
  default     = "cloudstruct-waf"
}

variable "oac_name" {
  description = "Name for the CloudFront Origin Access Control"
  default     = "cloudstruct-oac"
}

variable "function_name" {
  description = "Name for the CloudFront Function"
  default     = "cloudstruct-function"
}

variable "distribution_name" {
  description = "Name for the CloudFront distribution tag"
  type        = string
  default     = "cloudstruct-distribution"
}

# Domain configuration
variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "artisantiling.co.nz"
}

variable "www_domain_name" {
  description = "WWW domain name"
  type        = string
  default     = "www.artisantiling.co.nz"
}

# S3 origin configuration
variable "origin_id" {
  description = "Origin ID for the S3 bucket"
  type        = string
  default     = "S3-Frontend-App"
}

variable "react_app_path" {
  description = "Path to the React app in the S3 bucket"
  type        = string
  default     = "/frontend-build"
}

# CloudFront configuration
variable "cloudfront_price_class" {
  description = "CloudFront distribution price class"
  type        = string
  default     = "PriceClass_100"
}

variable "cloudfront_ttl" {
  description = "CloudFront distribution TTL settings"
  type        = object({
    min     = number
    default = number
    max     = number
  })
  default     = {
    min     = 0
    default = 3600
    max     = 86400
  }
}

# Updated to support all HTTP methods needed for CRUD operations
variable "cloudfront_allowed_methods" {
  description = "HTTP methods allowed by CloudFront"
  type        = list(string)
  default     = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
}

variable "cloudfront_cached_methods" {
  description = "HTTP methods cached by CloudFront"
  type        = list(string)
  default     = ["GET", "HEAD"]
}

# Headers to forward to origins - needed for API requests
variable "forwarded_headers" {
  description = "Headers to be forwarded to origin"
  type        = list(string)
  default     = ["Origin", "Authorization", "Content-Type", "Accept"]
}

variable "tls_protocol_version" {
  description = "Minimum TLS protocol version"
  type        = string
  default     = "TLSv1.2_2021"
}

# Error responses
variable "error_responses" {
  description = "Custom error response settings"
  type        = list(object({
    error_code         = number
    response_code      = number
    response_page_path = string
  }))
  default     = [
    {
      error_code         = 403
      response_code      = 200
      response_page_path = "/index.html"
    },
    {
      error_code         = 404
      response_code      = 200
      response_page_path = "/index.html"
    }
  ]
}

# WAF configuration
variable "waf_rate_limit" {
  description = "Rate limit for WAF rule"
  type        = number
  default     = 2000
}

variable "enable_waf" {
  description = "Enable WAF for CloudFront"
  type        = bool
  default     = true
}

# S3 CORS configuration 
variable "cors_allowed_headers" {
  description = "List of allowed headers for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "cors_allowed_methods" {
  description = "List of allowed methods for CORS"
  type        = list(string)
  default     = ["GET", "HEAD"]
}

variable "cors_max_age_seconds" {
  description = "Max age in seconds for CORS preflight cache"
  type        = number
  default     = 3600
}

# Resource tagging
variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {
    ManagedBy = "Terraform"
    Owner     = "Martin Caringal"
    Project   = "CloudStruct"
  }
}

# S3 bucket configuration
variable "force_destroy" {
  description = "Allow the bucket to be destroyed even if it contains objects"
  type        = bool
  default     = true
}

variable "versioning_enabled" {
  description = "Enable versioning for the S3 bucket"
  type        = bool
  default     = false
}

# CloudFront function configuration
variable "cloudfront_function_runtime" {
  description = "Runtime for CloudFront functions"
  type        = string
  default     = "cloudfront-js-1.0"
}