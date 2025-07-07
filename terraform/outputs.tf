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

# Backend Infrastructure Outputs

output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = "https://${aws_api_gateway_rest_api.newsarchive_api.id}.execute-api.${var.aws_region}.amazonaws.com/${var.environment}"
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = aws_api_gateway_rest_api.newsarchive_api.id
}

output "lambda_function_name" {
  description = "Name of the single Lambda function"
  value       = aws_lambda_function.newsarchive.function_name
}

output "processing_queue_url" {
  description = "URL of the SQS processing queue"
  value       = aws_sqs_queue.processing_queue.url
}

output "processing_queue_arn" {
  description = "ARN of the SQS processing queue"
  value       = aws_sqs_queue.processing_queue.arn
}

output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution_role.arn
}