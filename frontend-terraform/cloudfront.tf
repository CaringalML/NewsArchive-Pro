# Origin Access Control for secure S3 access
# This prevents direct access to S3 bucket and ensures all traffic goes through CloudFront
resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "${var.oac_name}-${var.environment}"
  description                       = "Origin Access Control for NewsArchive Pro React frontend S3 bucket - ensures secure access from CloudFront only"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution for NewsArchive Pro React Application
# Provides global content delivery network (CDN) for fast React app loading worldwide
# Includes SPA routing support, HTTPS enforcement, and optimized caching
resource "aws_cloudfront_distribution" "s3_distribution" {
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = var.cloudfront_price_class
  default_root_object = "index.html"
  comment             = "NewsArchive Pro React Frontend CDN - Global distribution for historical newspaper digitization platform"

  # S3 Origin Configuration for React Build Artifacts
  # Points to the S3 bucket containing the compiled React application
  origin {
    domain_name              = aws_s3_bucket.storage_bucket.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
    origin_id                = var.origin_id
    origin_path              = var.react_app_path
  }


  # Default Cache Behavior for React Application
  # Supports full CRUD operations for API interactions while optimizing static asset delivery
  default_cache_behavior {
    allowed_methods        = var.cloudfront_allowed_methods  # GET, POST, PUT, DELETE for full CRUD support
    cached_methods         = var.cloudfront_cached_methods   # Only cache GET and HEAD for static assets
    target_origin_id       = var.origin_id
    viewer_protocol_policy = "redirect-to-https"              # Force HTTPS for security
    compress               = true                             # Enable gzip compression for faster loading

    # Header and Query String Forwarding for API Integration
    # Forwards necessary headers for React app to communicate with backend APIs
    forwarded_values {
      query_string = true                    # Forward query parameters for API calls
      headers      = var.forwarded_headers  # Forward Origin, Authorization, Content-Type, Accept
      cookies {
        forward = "none"                     # Don't forward cookies for better caching
      }
    }

    # TTL Settings optimized for React SPA
    min_ttl     = var.cloudfront_ttl.min      # 0 - Allow immediate cache invalidation
    default_ttl = var.cloudfront_ttl.default  # 3600 (1 hour) - Balance between performance and freshness
    max_ttl     = var.cloudfront_ttl.max      # 86400 (24 hours) - Maximum cache duration

    # CloudFront Function for React Router Support
    # Redirects non-file requests to index.html for client-side routing
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite_uri.arn
    }
  }

  # Custom Error Responses for Single Page Application (SPA)
  # Redirects 404/403 errors to index.html to enable React Router functionality
  dynamic "custom_error_response" {
    for_each = var.error_responses
    content {
      error_code         = custom_error_response.value.error_code      # 404, 403
      response_code      = custom_error_response.value.response_code    # 200
      response_page_path = custom_error_response.value.response_page_path # "/index.html"
    }
  }

  # Geographic Restrictions
  # Currently allowing global access for NewsArchive Pro research platform
  restrictions {
    geo_restriction {
      restriction_type = "none"  # No geographic restrictions - worldwide access
    }
  }

  # SSL/TLS Certificate Configuration
  # Using CloudFront default certificate for HTTPS support
  viewer_certificate {
    cloudfront_default_certificate = true  # Uses *.cloudfront.net certificate
  }

  # Resource Tags for Organization and Cost Management
  tags = merge(
    var.tags, 
    {
      Environment = var.environment
      Name        = "${var.environment}-${var.distribution_name}"
      Purpose     = "React Frontend CDN"
      Component   = "Frontend Infrastructure"
    }
  )
}

# CloudFront Function for React Router Support
# This function enables client-side routing for the React SPA by redirecting
# requests without file extensions to index.html, allowing React Router to handle routing
resource "aws_cloudfront_function" "rewrite_uri" {
  name    = "${var.function_name}-${var.environment}"
  runtime = var.cloudfront_function_runtime
  comment = "NewsArchive Pro SPA Router - Redirects non-file requests to index.html for React Router compatibility"
  publish = true
  
  # JavaScript function executed at CloudFront edge locations
  # Runs on every viewer request before forwarding to origin
  code    = <<EOF
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Check whether the URI is missing a file extension (not a static asset)
    // This handles routes like /dashboard, /search, /collections etc.
    if (!uri.includes('.')) {
        // Redirect to index.html to let React Router handle the routing
        request.uri = '/index.html';
    }
    
    // Return the potentially modified request
    return request;
}
EOF

  # Lifecycle management for zero-downtime updates
  lifecycle {
    create_before_destroy = true
  }
}