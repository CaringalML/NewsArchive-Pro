resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "${var.oac_name}-${var.environment}"
  description                       = "OAC for S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "s3_distribution" {
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = var.cloudfront_price_class
  aliases             = [var.domain_name, var.www_domain_name]
  web_acl_id          = aws_wafv2_web_acl.cloudfront_waf.arn
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.storage_bucket.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
    origin_id                = var.origin_id
    origin_path              = var.react_app_path
  }

  default_cache_behavior {
    allowed_methods        = var.cloudfront_allowed_methods
    cached_methods         = var.cloudfront_cached_methods
    target_origin_id       = var.origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = true
      headers      = var.forwarded_headers
      cookies {
        forward = "none"
      }
    }

    min_ttl     = var.cloudfront_ttl.min
    default_ttl = var.cloudfront_ttl.default
    max_ttl     = var.cloudfront_ttl.max

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite_uri.arn
    }
  }

  dynamic "custom_error_response" {
    for_each = var.error_responses
    content {
      error_code         = custom_error_response.value.error_code
      response_code      = custom_error_response.value.response_code
      response_page_path = custom_error_response.value.response_page_path
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cert.arn
    minimum_protocol_version = var.tls_protocol_version
    ssl_support_method       = "sni-only"
  }

  tags = merge(
    var.tags, 
    {
      Environment = var.environment
      Name        = "${var.environment}-${var.distribution_name}"
    }
  )
}

resource "aws_cloudfront_function" "rewrite_uri" {
  name    = "${var.function_name}-${var.environment}"
  runtime = var.cloudfront_function_runtime
  comment = "Rewrite URI for React Router"
  publish = true
  code    = <<EOF
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Check whether the URI is missing a file extension
    if (!uri.includes('.')) {
        request.uri = '/index.html';
    }
    
    return request;
}
EOF
}