# Primary S3 Bucket for NewsArchive Pro React Frontend
# Stores compiled React application build artifacts and static assets
# Configured for CloudFront distribution with secure access controls
resource "aws_s3_bucket" "storage_bucket" {
  bucket        = var.s3_bucket_name
  force_destroy = var.force_destroy  # Allows bucket deletion even with objects (useful for development)

  # Resource tagging for organization and cost allocation
  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Name        = "${var.environment}-${var.s3_bucket_name}"
      Purpose     = "React Frontend Static Assets"
      Component   = "Frontend Infrastructure"
      Application = "NewsArchive Pro"
    }
  )
}

# S3 Bucket Versioning Configuration
# Disabled by default for cost optimization on static frontend assets
# Can be enabled if deployment rollback capability is needed
resource "aws_s3_bucket_versioning" "storage_bucket" {
  bucket = aws_s3_bucket.storage_bucket.id
  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"  # Suspended for cost savings
  }
}

# S3 Bucket Public Access Block - Security Configuration
# Prevents accidental public exposure of React build artifacts
# Ensures all access goes through CloudFront for security and performance
resource "aws_s3_bucket_public_access_block" "storage_bucket" {
  bucket = aws_s3_bucket.storage_bucket.id

  # Block all public access to maintain security
  block_public_acls       = true  # Block public ACLs on bucket and objects
  block_public_policy     = true  # Block public bucket policies
  ignore_public_acls      = true  # Ignore existing public ACLs
  restrict_public_buckets = true  # Restrict cross-account bucket access
}

# S3 CORS Configuration for React Application
# Enables cross-origin requests from React app to backend APIs
# Supports full CRUD operations for NewsArchive Pro functionality
resource "aws_s3_bucket_cors_configuration" "s3_cors" {
  bucket = aws_s3_bucket.storage_bucket.id

  cors_rule {
    allowed_headers = var.cors_allowed_headers  # All headers (*) for flexibility
    allowed_methods = var.cors_allowed_methods  # GET, POST, PUT, DELETE, HEAD for full CRUD
    allowed_origins = ["*"]                     # Allow all origins (can be restricted to specific domains)
    expose_headers  = ["ETag"]                  # Expose ETag for cache validation
    max_age_seconds = var.cors_max_age_seconds  # Cache preflight requests for 1 hour
  }
}

# S3 Object for React Build Directory Structure
# Creates the frontend-build/ folder where compiled React assets will be stored
# This serves as the root path for the CloudFront distribution
resource "aws_s3_object" "react_build" {
  bucket  = aws_s3_bucket.storage_bucket.id
  key     = "frontend-build/"  # Root directory for React build output
  content = ""                 # Empty content - this just creates the folder structure

  # Detailed tagging for asset management
  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Purpose     = "React Build Artifacts"
      ContentType = "Directory Structure"
      BuildPath   = "frontend-build"
    }
  )
}


# S3 Bucket Policy for Secure CloudFront Access
# Grants CloudFront exclusive access to S3 bucket content
# Implements Origin Access Control (OAC) security model
resource "aws_s3_bucket_policy" "allow_cloudfront_access" {
  bucket = aws_s3_bucket.storage_bucket.id
  
  # IAM policy allowing only CloudFront to access S3 objects
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"  # Only CloudFront service can access
        }
        Action   = [
          "s3:GetObject",     # Read individual objects (React files)
          "s3:ListBucket"     # List bucket contents for directory navigation
        ]
        Resource = [
          "${aws_s3_bucket.storage_bucket.arn}/*",  # All objects in bucket
          aws_s3_bucket.storage_bucket.arn           # Bucket itself
        ]
        Condition = {
          StringEquals = {
            # Restrict access to specific CloudFront distribution only
            "AWS:SourceArn" = aws_cloudfront_distribution.s3_distribution.arn
          }
        }
      }
    ]
  })
}