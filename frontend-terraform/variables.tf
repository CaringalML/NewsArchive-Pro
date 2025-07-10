# =============================================================================
# BASIC INFRASTRUCTURE SETTINGS
# =============================================================================

variable "aws_region" {
  description = "AWS region for deploying NewsArchive Pro frontend infrastructure"
  type        = string
  default     = "ap-southeast-2"
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "AWS region must be in the format like 'us-east-1' or 'ap-southeast-2'."
  }
}

variable "environment" {
  description = "Deployment environment (production, staging, development)"
  type        = string
  default     = "production"
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development."
  }
}

# =============================================================================
# RESOURCE NAMING CONFIGURATION
# =============================================================================

variable "s3_bucket_name" {
  description = "Name of the S3 bucket storing React build artifacts for NewsArchive Pro"
  type        = string
  default     = "caringalfrontend"
  validation {
    condition     = can(regex("^[a-z0-9.-]+$", var.s3_bucket_name)) && length(var.s3_bucket_name) >= 3 && length(var.s3_bucket_name) <= 63
    error_message = "S3 bucket name must be 3-63 characters, lowercase letters, numbers, dots, and hyphens only."
  }
}

variable "oac_name" {
  description = "Name for the CloudFront Origin Access Control securing S3 access"
  type        = string
  default     = "newsarchive-pro-oac-v2"
}

variable "function_name" {
  description = "Name for the CloudFront Function handling React Router SPA routing"
  type        = string
  default     = "newsarchive-pro-function-v2"
}

variable "distribution_name" {
  description = "Name for the CloudFront distribution serving the React application"
  type        = string
  default     = "newsarchive-pro-distribution"
}

# =============================================================================
# S3 ORIGIN CONFIGURATION
# =============================================================================

variable "origin_id" {
  description = "Origin ID for the S3 bucket in CloudFront distribution"
  type        = string
  default     = "S3-Frontend-App"
}

variable "react_app_path" {
  description = "Path to the React build artifacts within the S3 bucket"
  type        = string
  default     = "/frontend-build"
  validation {
    condition     = can(regex("^/[a-zA-Z0-9_-]+", var.react_app_path))
    error_message = "React app path must start with '/' and contain valid characters."
  }
}

# =============================================================================
# CLOUDFRONT CDN CONFIGURATION
# =============================================================================

variable "cloudfront_price_class" {
  description = "CloudFront distribution price class (PriceClass_100: US/Canada/Europe, PriceClass_200: + Asia, PriceClass_All: Worldwide)"
  type        = string
  default     = "PriceClass_100"
  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.cloudfront_price_class)
    error_message = "Price class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

variable "cloudfront_ttl" {
  description = "CloudFront distribution TTL (Time To Live) cache settings in seconds"
  type        = object({
    min     = number  # Minimum cache duration (0 = no minimum)
    default = number  # Default cache duration (3600 = 1 hour)
    max     = number  # Maximum cache duration (86400 = 24 hours)
  })
  default     = {
    min     = 0      # Allow immediate cache invalidation
    default = 3600   # 1 hour default for React assets
    max     = 86400  # 24 hours maximum cache
  }
  validation {
    condition     = var.cloudfront_ttl.min >= 0 && var.cloudfront_ttl.default >= var.cloudfront_ttl.min && var.cloudfront_ttl.max >= var.cloudfront_ttl.default
    error_message = "TTL values must be: min >= 0, default >= min, max >= default."
  }
}

variable "cloudfront_allowed_methods" {
  description = "HTTP methods allowed by CloudFront for full CRUD operations (Create, Read, Update, Delete)"
  type        = list(string)
  default     = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
}

variable "cloudfront_cached_methods" {
  description = "HTTP methods cached by CloudFront (only GET and HEAD for performance)"
  type        = list(string)
  default     = ["GET", "HEAD"]
  validation {
    condition     = alltrue([for method in var.cloudfront_cached_methods : contains(["GET", "HEAD"], method)])
    error_message = "Only GET and HEAD methods should be cached for optimal performance."
  }
}

variable "forwarded_headers" {
  description = "Headers forwarded to origin for React app API communication (CORS, auth, content negotiation)"
  type        = list(string)
  default     = ["Origin", "Authorization", "Content-Type", "Accept"]
}

variable "error_responses" {
  description = "Custom error responses for React SPA routing (redirects 404/403 to index.html for client-side routing)"
  type        = list(object({
    error_code         = number  # HTTP error code from S3
    response_code      = number  # HTTP response code to client
    response_page_path = string  # Path to serve instead
  }))
  default     = [
    {
      error_code         = 403  # Forbidden - redirect to React app
      response_code      = 200  # OK - let React handle it
      response_page_path = "/index.html"
    },
    {
      error_code         = 404  # Not Found - redirect to React app
      response_code      = 200  # OK - let React Router handle it
      response_page_path = "/index.html"
    }
  ]
}

# =============================================================================
# S3 CORS CONFIGURATION FOR API INTEGRATION
# =============================================================================

variable "cors_allowed_headers" {
  description = "Headers allowed in CORS requests from React app to backend APIs"
  type        = list(string)
  default     = ["*"]  # Allow all headers for maximum flexibility
}

variable "cors_allowed_methods" {
  description = "HTTP methods allowed for CORS requests (full CRUD support for NewsArchive Pro)"
  type        = list(string)
  default     = ["GET", "HEAD", "PUT", "POST", "DELETE"]
  validation {
    condition     = length(var.cors_allowed_methods) > 0
    error_message = "At least one CORS method must be allowed."
  }
}

variable "cors_max_age_seconds" {
  description = "Maximum time in seconds that browsers can cache CORS preflight responses"
  type        = number
  default     = 3600  # 1 hour cache for preflight requests
  validation {
    condition     = var.cors_max_age_seconds >= 0 && var.cors_max_age_seconds <= 86400
    error_message = "CORS max age must be between 0 and 86400 seconds (24 hours)."
  }
}

# =============================================================================
# RESOURCE TAGGING AND METADATA
# =============================================================================

variable "tags" {
  description = "Common tags applied to all NewsArchive Pro frontend infrastructure resources"
  type        = map(string)
  default     = {
    ManagedBy   = "Terraform"
    Owner       = "Martin Caringal"
    Project     = "NewsArchive Pro"
    Application = "Historical Newspaper Digitization Platform"
    Component   = "Frontend Infrastructure"
    Repository  = "newsarchive-pro"
  }
}

# =============================================================================
# S3 BUCKET SECURITY AND LIFECYCLE CONFIGURATION
# =============================================================================

variable "force_destroy" {
  description = "Allow S3 bucket deletion even with objects (useful for development, use with caution in production)"
  type        = bool
  default     = true
}

variable "versioning_enabled" {
  description = "Enable S3 bucket versioning for React build artifacts (disabled by default for cost optimization)"
  type        = bool
  default     = false
}

# =============================================================================
# CLOUDFRONT FUNCTION CONFIGURATION
# =============================================================================

variable "cloudfront_function_runtime" {
  description = "JavaScript runtime version for CloudFront Functions handling React Router SPA routing"
  type        = string
  default     = "cloudfront-js-1.0"
  validation {
    condition     = contains(["cloudfront-js-1.0"], var.cloudfront_function_runtime)
    error_message = "CloudFront function runtime must be 'cloudfront-js-1.0'."
  }
}

