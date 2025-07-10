# S3 Bucket for storing uploaded images
resource "aws_s3_bucket" "images_bucket" {
  bucket = "${var.lambda_function_name}-images-${random_id.suffix.hex}"

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-images-bucket"
    Type = "image-storage"
  })
}

# S3 Bucket versioning - DISABLED for cost optimization
resource "aws_s3_bucket_versioning" "images_bucket_versioning" {
  bucket = aws_s3_bucket.images_bucket.id
  versioning_configuration {
    status = "Disabled"
  }
}

# S3 Bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "images_bucket_encryption" {
  bucket = aws_s3_bucket.images_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket public access block (secure by default)
resource "aws_s3_bucket_public_access_block" "images_bucket_pab" {
  bucket = aws_s3_bucket.images_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket CORS configuration for web uploads
resource "aws_s3_bucket_cors_configuration" "images_bucket_cors" {
  bucket = aws_s3_bucket.images_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# S3 Bucket lifecycle configuration optimized for Instant Retrieval and permanent archival
resource "aws_s3_bucket_lifecycle_configuration" "images_bucket_lifecycle" {
  bucket = aws_s3_bucket.images_bucket.id

  rule {
    id     = "image_lifecycle_instant_retrieval_optimized"
    status = "Enabled"

    # Apply to all objects in bucket
    filter {
      prefix = ""
    }

    # Move to Standard-IA after 30 days (minimum required)
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier Instant Retrieval after 60 days
    transition {
      days          = 60
      storage_class = "GLACIER_IR"
    }

    # Move to Glacier Flexible Retrieval after 150 days (90+ days after GLACIER_IR)
    transition {
      days          = 150
      storage_class = "GLACIER"
    }

    # Final destination: Glacier Deep Archive after 365 days (PERMANENT STORAGE)
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    # Clean up incomplete multipart uploads after 3 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 3
    }
  }

  # Separate rule for processed OCR results - optimized for frequent access
  rule {
    id     = "processed_results_lifecycle"
    status = "Enabled"

    filter {
      prefix = "processed/"
    }

    # Move to Standard-IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier Instant Retrieval after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }

    # Move to Glacier Flexible after 180 days (90+ days after GLACIER_IR)
    transition {
      days          = 180
      storage_class = "GLACIER"
    }

    # Final destination: Deep Archive after 730 days (PERMANENT STORAGE)
    transition {
      days          = 730
      storage_class = "DEEP_ARCHIVE"
    }
  }

  # Rule for frequently accessed OCR results - keep in Instant Retrieval longer
  rule {
    id     = "frequent_access_results"
    status = "Enabled"

    filter {
      prefix = "results/frequent/"
    }

    # Move to Standard-IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Keep in Glacier Instant Retrieval for longer period
    transition {
      days          = 60
      storage_class = "GLACIER_IR"
    }

    # Move to regular Glacier after sufficient gap (90+ days from GLACIER_IR)
    transition {
      days          = 150
      storage_class = "GLACIER"
    }

    # Final archive after 2 years
    transition {
      days          = 730
      storage_class = "DEEP_ARCHIVE"
    }
  }

  # Rule for temporary upload files - these can still be deleted quickly
  rule {
    id     = "temp_uploads_cleanup"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    # Delete temporary files after 1 day (these are truly temporary)
    expiration {
      days = 1
    }
  }
}

# S3 Intelligent Tiering configuration for automatic cost optimization
resource "aws_s3_bucket_intelligent_tiering_configuration" "images_bucket_intelligent_tiering" {
  bucket = aws_s3_bucket.images_bucket.id
  name   = "entire-bucket-intelligent-tiering"

  # Apply to all objects in the bucket
  filter {
    prefix = ""
  }

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180  # Move to Deep Archive Access after 180 days
  }

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90   # Move to Archive Access after 90 days
  }

  status = "Enabled"
}

# CloudWatch log group for S3 access logs
resource "aws_cloudwatch_log_group" "s3_access_logs" {
  name              = "/aws/s3/${aws_s3_bucket.images_bucket.bucket}-access"
  retention_in_days = 7  # Reduced retention for cost savings

  tags = var.tags
}

# S3 Bucket notification for new image uploads
resource "aws_s3_bucket_notification" "images_bucket_notification" {
  bucket = aws_s3_bucket.images_bucket.id

  queue {
    queue_arn     = aws_sqs_queue.ocr_queue.arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "uploads/"
    filter_suffix = ""
  }

  depends_on = [aws_sqs_queue_policy.s3_notification_policy]
}

# SQS policy to allow S3 to send messages
resource "aws_sqs_queue_policy" "s3_notification_policy" {
  queue_url = aws_sqs_queue.ocr_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3Publish"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.ocr_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_s3_bucket.images_bucket.arn
          }
        }
      }
    ]
  })
}