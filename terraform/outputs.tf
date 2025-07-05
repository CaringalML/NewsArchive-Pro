output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.s3_distribution.domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.s3_distribution.id
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.storage_bucket.id
}

output "website_url" {
  description = "The website URL (CloudFront domain)"
  value       = "https://${aws_cloudfront_distribution.s3_distribution.domain_name}"
}