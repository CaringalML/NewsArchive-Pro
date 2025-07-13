# CloudFront Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "images_oac" {
  name                              = "${var.lambda_function_name}-images-oac"
  description                       = "OAC for images bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution for image delivery
resource "aws_cloudfront_distribution" "images_distribution" {
  origin {
    domain_name              = aws_s3_bucket.images_bucket.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.images_oac.id
    origin_id                = "S3-${aws_s3_bucket.images_bucket.bucket}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront distribution for OCR images"
  default_root_object = "index.html"

  # Cache behavior for processed images
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.images_bucket.bucket}"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400

    compress = true
  }

  # Cache behavior for uploaded images (shorter cache)
  ordered_cache_behavior {
    path_pattern     = "uploads/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.images_bucket.bucket}"

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 300   # 5 minutes for uploads
    max_ttl                = 3600  # 1 hour max
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  # Cache behavior for processed results (longer cache)
  ordered_cache_behavior {
    path_pattern     = "processed/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.images_bucket.bucket}"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    min_ttl                = 3600    # 1 hour min
    default_ttl            = 86400   # 24 hours default
    max_ttl                = 604800  # 7 days max
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  price_class = "PriceClass_100"  # Use only North America and Europe edge locations

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-cloudfront"
    Type = "cdn"
  })

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  # Custom error pages
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/error.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/error.html"
  }

  # Logging configuration removed for now to avoid ACL issues
  # logging_config {
  #   include_cookies = false
  #   bucket          = aws_s3_bucket.cloudfront_logs.bucket_domain_name
  #   prefix          = "cloudfront-logs/"
  # }
}

# S3 Bucket policy to allow CloudFront to access images
resource "aws_s3_bucket_policy" "images_bucket_policy" {
  bucket = aws_s3_bucket.images_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.images_bucket.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.images_distribution.arn
          }
        }
      }
    ]
  })
}