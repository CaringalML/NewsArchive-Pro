# New Lambda architecture for AWS Batch integration

# Create ZIP file for S3 Event Handler
data "archive_file" "s3_event_handler_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/s3-event-handler.js"
  output_path = "${path.module}/s3_event_handler.zip"
}

# Create ZIP file for Batch Job Submitter
data "archive_file" "batch_job_submitter_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/batch-job-submitter.js"
  output_path = "${path.module}/batch_job_submitter.zip"
}

# Lambda function for S3 Event Handler
resource "aws_lambda_function" "s3_event_handler" {
  filename         = data.archive_file.s3_event_handler_zip.output_path
  function_name    = "${var.lambda_function_name}-s3-event-handler"
  role            = aws_iam_role.lambda_role.arn
  handler         = "s3-event-handler.handler"
  runtime         = var.lambda_runtime
  timeout         = 30   # 30 seconds - quick processing
  memory_size     = 256  # Lower memory for lightweight function
  
  source_code_hash = data.archive_file.s3_event_handler_zip.output_base64sha256

  environment {
    variables = {
      DYNAMODB_TABLE_OCR_JOBS = aws_dynamodb_table.ocr_jobs.name
      SQS_QUEUE_URL           = aws_sqs_queue.ocr_processing_queue.url
      AWS_REGION_CONFIG       = var.aws_region
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.s3_event_handler_logs
  ]

  tags = var.tags
}

# Lambda function for Batch Job Submitter
resource "aws_lambda_function" "batch_job_submitter" {
  filename         = data.archive_file.batch_job_submitter_zip.output_path
  function_name    = "${var.lambda_function_name}-batch-job-submitter"
  role            = aws_iam_role.lambda_batch_submitter_role.arn
  handler         = "batch-job-submitter.handler"
  runtime         = var.lambda_runtime
  timeout         = 60   # 1 minute for job submission
  memory_size     = 512
  
  source_code_hash = data.archive_file.batch_job_submitter_zip.output_base64sha256

  environment {
    variables = {
      DYNAMODB_TABLE_OCR_JOBS = aws_dynamodb_table.ocr_jobs.name
      BATCH_JOB_QUEUE         = aws_batch_job_queue.ocr_job_queue.name
      BATCH_JOB_DEFINITION    = aws_batch_job_definition.ocr_job_definition.name
      AWS_REGION_CONFIG       = var.aws_region
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_batch_submitter_basic,
    aws_cloudwatch_log_group.batch_job_submitter_logs
  ]

  tags = var.tags
}

# SQS Event Source Mapping for Batch Job Submitter
resource "aws_lambda_event_source_mapping" "sqs_to_batch_submitter" {
  event_source_arn = aws_sqs_queue.ocr_processing_queue.arn
  function_name    = aws_lambda_function.batch_job_submitter.arn
  batch_size       = 10  # Process up to 10 messages at once
  maximum_batching_window_in_seconds = 5  # Wait max 5 seconds to batch

  scaling_config {
    maximum_concurrency = 10  # Limit concurrent executions
  }

  depends_on = [aws_iam_role_policy.lambda_batch_submitter_policy]
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "s3_event_handler_logs" {
  name              = "/aws/lambda/${var.lambda_function_name}-s3-event-handler"
  retention_in_days = 14

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "batch_job_submitter_logs" {
  name              = "/aws/lambda/${var.lambda_function_name}-batch-job-submitter"
  retention_in_days = 14

  tags = var.tags
}

# CloudWatch Alarms for Lambda functions
resource "aws_cloudwatch_metric_alarm" "s3_event_handler_errors" {
  alarm_name          = "${var.lambda_function_name}-s3-event-handler-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "S3 Event Handler Lambda errors"
  alarm_actions       = []

  dimensions = {
    FunctionName = aws_lambda_function.s3_event_handler.function_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "batch_job_submitter_errors" {
  alarm_name          = "${var.lambda_function_name}-batch-job-submitter-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Batch Job Submitter Lambda errors"
  alarm_actions       = []

  dimensions = {
    FunctionName = aws_lambda_function.batch_job_submitter.function_name
  }

  tags = var.tags
}