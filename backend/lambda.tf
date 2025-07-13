# Create ZIP file for main Lambda deployment
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda_function.zip"
  excludes    = ["ocr-processor.js"] # Exclude from main Lambda
}

# Create separate ZIP file for OCR processor Lambda
data "archive_file" "ocr_processor_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/ocr_processor.zip"
  excludes    = ["index.js"] # Exclude main API handler from OCR processor
}

# Main Lambda function (API)
resource "aws_lambda_function" "newsarchive_lambda" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = var.lambda_function_name
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = var.lambda_runtime
  timeout         = var.lambda_timeout
  memory_size     = var.lambda_memory_size
  
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      S3_BUCKET = aws_s3_bucket.images_bucket.bucket
      CLOUDFRONT_DOMAIN = aws_cloudfront_distribution.images_distribution.domain_name
      OCR_QUEUE_URL = aws_sqs_queue.ocr_processing_queue.url
      NOTIFICATION_QUEUE_URL = aws_sqs_queue.notification_queue.url
      USERS_TABLE = aws_dynamodb_table.users.name
      OCR_JOBS_TABLE = aws_dynamodb_table.ocr_jobs.name
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.lambda_log_group,
  ]

  tags = var.tags
}

# OCR Processor Lambda function (Background worker)
resource "aws_lambda_function" "ocr_processor" {
  filename         = data.archive_file.ocr_processor_zip.output_path
  function_name    = "${var.lambda_function_name}-ocr-processor"
  role            = aws_iam_role.lambda_role.arn
  handler         = "ai-enhanced-ocr-processor.handler"
  runtime         = var.lambda_runtime
  timeout         = 300  # 5 minutes (optimized)
  memory_size     = 1024  # More memory for faster processing
  
  source_code_hash = data.archive_file.ocr_processor_zip.output_base64sha256

  environment {
    variables = {
      S3_BUCKET = aws_s3_bucket.images_bucket.bucket
      TEXTRACT_SNS_TOPIC_ARN = aws_sns_topic.textract_completion.arn
      TEXTRACT_ROLE_ARN = aws_iam_role.textract_service_role.arn
      USERS_TABLE = aws_dynamodb_table.users.name
      OCR_JOBS_TABLE = aws_dynamodb_table.ocr_jobs.name
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.ocr_processor_log_group,
  ]

  tags = merge(var.tags, {
    Type = "ocr-processor"
  })
}

# SQS Event Source Mapping for OCR processor
resource "aws_lambda_event_source_mapping" "ocr_queue_trigger" {
  event_source_arn                        = aws_sqs_queue.ocr_processing_queue.arn
  function_name                           = aws_lambda_function.ocr_processor.arn
  batch_size                              = 1  # Process one OCR job at a time
  enabled                                 = true
  maximum_batching_window_in_seconds      = 0  # No batching delay - immediate processing
  
  # Enable partial batch failure handling
  function_response_types = ["ReportBatchItemFailures"]
  
  # Configure scaling for immediate processing
  scaling_config {
    maximum_concurrency = 20  # Increased for better throughput
  }
}

# Textract Completion Handler Lambda function
resource "aws_lambda_function" "textract_completion_handler" {
  filename         = data.archive_file.ocr_processor_zip.output_path
  function_name    = "${var.lambda_function_name}-textract-completion"
  role            = aws_iam_role.lambda_role.arn
  handler         = "textract-completion-handler.handler"
  runtime         = var.lambda_runtime
  timeout         = 60  # 1 minute for completion processing
  memory_size     = 256  # Less memory needed for completion processing
  
  source_code_hash = data.archive_file.ocr_processor_zip.output_base64sha256

  environment {
    variables = {
      S3_BUCKET = aws_s3_bucket.images_bucket.bucket
      USERS_TABLE = aws_dynamodb_table.users.name
      OCR_JOBS_TABLE = aws_dynamodb_table.ocr_jobs.name
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.textract_completion_handler_log_group,
  ]

  tags = merge(var.tags, {
    Type = "textract-completion-handler"
  })
}

# SQS Event Source Mapping for Textract completion handler
resource "aws_lambda_event_source_mapping" "textract_completion_trigger" {
  event_source_arn = aws_sqs_queue.textract_results_queue.arn
  function_name    = aws_lambda_function.textract_completion_handler.arn
  batch_size       = 1  # Process one completion at a time
  enabled          = true
}

# Automated Job Recovery Lambda function
resource "aws_lambda_function" "job_recovery" {
  filename         = data.archive_file.ocr_processor_zip.output_path
  function_name    = "${var.lambda_function_name}-job-recovery"
  role            = aws_iam_role.lambda_role.arn
  handler         = "automated-job-recovery.handler"
  runtime         = var.lambda_runtime
  timeout         = 300  # 5 minutes for job recovery
  memory_size     = 256  # Less memory needed for recovery
  
  source_code_hash = data.archive_file.ocr_processor_zip.output_base64sha256

  environment {
    variables = {
      S3_BUCKET = aws_s3_bucket.images_bucket.bucket
      OCR_QUEUE_URL = aws_sqs_queue.ocr_processing_queue.url
      USERS_TABLE = aws_dynamodb_table.users.name
      OCR_JOBS_TABLE = aws_dynamodb_table.ocr_jobs.name
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
  ]

  tags = merge(var.tags, {
    Type = "job-recovery"
  })
}

# CloudWatch Event Rule for job recovery (runs every 5 minutes)
resource "aws_cloudwatch_event_rule" "job_recovery_schedule" {
  name                = "${var.lambda_function_name}-job-recovery-schedule"
  description         = "Trigger job recovery Lambda every 5 minutes"
  schedule_expression = "rate(5 minutes)"
}

# CloudWatch Event Target for job recovery
resource "aws_cloudwatch_event_target" "job_recovery_target" {
  rule      = aws_cloudwatch_event_rule.job_recovery_schedule.name
  target_id = "JobRecoveryTarget"
  arn       = aws_lambda_function.job_recovery.arn
}

# Lambda permission for CloudWatch Events
resource "aws_lambda_permission" "allow_cloudwatch_job_recovery" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.job_recovery.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.job_recovery_schedule.arn
}

