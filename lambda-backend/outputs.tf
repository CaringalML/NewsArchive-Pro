# Lambda Function outputs
output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.newsarchive_lambda.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.newsarchive_lambda.arn
}

output "lambda_function_invoke_arn" {
  description = "Invoke ARN of the Lambda function"
  value       = aws_lambda_function.newsarchive_lambda.invoke_arn
}

# Frontend Configuration outputs
output "frontend_cloudfront_url" {
  description = "Frontend CloudFront URL"
  value       = var.frontend_cloudfront_url
}

output "allowed_origins" {
  description = "Allowed CORS origins"
  value       = var.allowed_origins
}

# IAM Role outputs
output "lambda_role_arn" {
  description = "ARN of the IAM role for Lambda"
  value       = aws_iam_role.lambda_role.arn
}

# CloudWatch outputs
output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda_log_group.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda_log_group.arn
}

# Region output
output "aws_region" {
  description = "AWS region where resources are deployed"
  value       = var.aws_region
}

# S3 Bucket outputs
output "images_bucket_name" {
  description = "Name of the S3 bucket for image storage"
  value       = aws_s3_bucket.images_bucket.bucket
}

output "images_bucket_arn" {
  description = "ARN of the S3 bucket for image storage"
  value       = aws_s3_bucket.images_bucket.arn
}

output "images_bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.images_bucket.bucket_domain_name
}

# CloudFront outputs
output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.images_distribution.domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.images_distribution.id
}

output "cloudfront_url" {
  description = "HTTPS URL of the CloudFront distribution"
  value       = "https://${aws_cloudfront_distribution.images_distribution.domain_name}"
}

# Textract outputs
output "textract_sns_topic_arn" {
  description = "ARN of the SNS topic for Textract notifications"
  value       = aws_sns_topic.textract_completion.arn
}

output "textract_service_role_arn" {
  description = "ARN of the Textract service role"
  value       = aws_iam_role.textract_service_role.arn
}

output "textract_results_queue_url" {
  description = "URL of the Textract results SQS queue"
  value       = aws_sqs_queue.textract_results_queue.url
}

# SQS Queue outputs
output "ocr_queue_url" {
  description = "URL of the OCR processing queue"
  value       = aws_sqs_queue.ocr_queue.url
}

output "ocr_queue_arn" {
  description = "ARN of the OCR processing queue"
  value       = aws_sqs_queue.ocr_queue.arn
}

output "notification_queue_url" {
  description = "URL of the notification queue"
  value       = aws_sqs_queue.notification_queue.url
}

output "notification_queue_arn" {
  description = "ARN of the notification queue"
  value       = aws_sqs_queue.notification_queue.arn
}

output "ocr_dlq_url" {
  description = "URL of the OCR dead letter queue"
  value       = aws_sqs_queue.ocr_dlq.url
}

# CURL command for testing API Gateway
output "curl_command" {
  description = "CURL command to test the API Gateway"
  value       = "curl -X GET ${aws_apigatewayv2_api.newsarchive_api.api_endpoint}/${aws_apigatewayv2_stage.newsarchive_stage.name}/newsarchivepro"
}

# Browser URL for testing
output "browser_url" {
  description = "URL to test in browser"
  value       = "${aws_apigatewayv2_api.newsarchive_api.api_endpoint}/${aws_apigatewayv2_stage.newsarchive_stage.name}/newsarchivepro"
}