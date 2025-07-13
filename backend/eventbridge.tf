# EventBridge configuration for ECR to Batch auto-updates
# Automatically updates Batch job definitions when new images are pushed to ECR

# EventBridge Rule for ECR Image Push Events
resource "aws_cloudwatch_event_rule" "ecr_image_push" {
  name        = "${var.project_name}-ecr-image-push"
  description = "Triggers when new images are pushed to ECR"

  event_pattern = jsonencode({
    source      = ["aws.ecr"]
    detail-type = ["ECR Image Action"]
    detail = {
      action-type = ["PUSH"]
      result      = ["SUCCESS"]
      repository-name = [aws_ecr_repository.newsarchivepro_backend.name]
    }
  })

  tags = var.tags
}

# EventBridge Target - Lambda Function
resource "aws_cloudwatch_event_target" "ecr_batch_updater_target" {
  rule      = aws_cloudwatch_event_rule.ecr_image_push.name
  target_id = "ECRBatchUpdaterTarget"
  arn       = aws_lambda_function.ecr_batch_updater.arn

  # Input transformer to pass relevant ECR information
  input_transformer {
    input_paths = {
      repository = "$.detail.repository-name"
      imageTag   = "$.detail.image-tag"
      registryId = "$.detail.registry-id"
      region     = "$.region"
      account    = "$.account"
      time       = "$.time"
    }
    
    input_template = jsonencode({
      source         = "aws.ecr"
      detail-type    = "ECR Image Action"
      detail = {
        repository-name = "<repository>"
        image-tag      = "<imageTag>"
        registry-id    = "<registryId>"
        action-type    = "PUSH"
        result         = "SUCCESS"
      }
      region  = "<region>"
      account = "<account>"
      time    = "<time>"
    })
  }
}

# Lambda permission for EventBridge to invoke the function
resource "aws_lambda_permission" "allow_eventbridge_ecr_batch_updater" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ecr_batch_updater.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.ecr_image_push.arn
}

# IAM Role for ECR-Batch Updater Lambda
resource "aws_iam_role" "ecr_batch_updater_role" {
  name = "${var.project_name}-ecr-batch-updater-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM Policy for ECR-Batch Updater Lambda
resource "aws_iam_policy" "ecr_batch_updater_policy" {
  name        = "${var.project_name}-ecr-batch-updater-policy"
  description = "Policy for ECR-Batch Updater Lambda to access ECR and Batch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # CloudWatch Logs permissions
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/aws/lambda/${var.project_name}-ecr-batch-updater*"
      },
      {
        # ECR permissions to verify images
        Effect = "Allow"
        Action = [
          "ecr:DescribeRepositories",
          "ecr:DescribeImages",
          "ecr:GetAuthorizationToken",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer"
        ]
        Resource = [
          aws_ecr_repository.newsarchivepro_backend.arn,
          "arn:aws:ecr:${var.aws_region}:*:repository/${aws_ecr_repository.newsarchivepro_backend.name}"
        ]
      },
      {
        # Batch permissions to update job definitions
        Effect = "Allow"
        Action = [
          "batch:DescribeJobDefinitions",
          "batch:RegisterJobDefinition",
          "batch:DeregisterJobDefinition"
        ]
        Resource = [
          "arn:aws:batch:${var.aws_region}:*:job-definition/${var.project_name}-ocr-job-definition*",
          "arn:aws:batch:${var.aws_region}:*:job-queue/${var.project_name}-ocr-job-queue*"
        ]
      },
      {
        # Additional Batch permissions for job queue operations
        Effect = "Allow"
        Action = [
          "batch:DescribeJobQueues",
          "batch:ListJobs"
        ]
        Resource = "*"
      },
      {
        # IAM permissions to pass role to Batch jobs
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = [
          aws_iam_role.batch_job_role.arn,
          aws_iam_role.batch_execution_role.arn
        ]
      }
    ]
  })

  tags = var.tags
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "ecr_batch_updater_policy_attachment" {
  role       = aws_iam_role.ecr_batch_updater_role.name
  policy_arn = aws_iam_policy.ecr_batch_updater_policy.arn
}

# ECR-Batch Updater Lambda Function
resource "aws_lambda_function" "ecr_batch_updater" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project_name}-ecr-batch-updater"
  role            = aws_iam_role.ecr_batch_updater_role.arn
  handler         = "ecr-batch-updater.handler"
  runtime         = var.lambda_runtime
  timeout         = 300  # 5 minutes for Batch operations
  memory_size     = 256  # Sufficient for API calls
  
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      PROJECT_NAME                  = var.project_name
      ECR_REPOSITORY_NAME          = aws_ecr_repository.newsarchivepro_backend.name
      BATCH_JOB_DEFINITION_NAME    = aws_batch_job_definition.ocr_job_definition.name
      BATCH_JOB_QUEUE              = aws_batch_job_queue.ocr_job_queue.name
      LOG_LEVEL                    = "INFO"
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecr_batch_updater_policy_attachment,
    aws_cloudwatch_log_group.ecr_batch_updater_logs
  ]

  tags = merge(var.tags, {
    Function = "ecr-batch-updater"
    Type     = "automation"
  })
}

# CloudWatch Log Group for ECR-Batch Updater Lambda
resource "aws_cloudwatch_log_group" "ecr_batch_updater_logs" {
  name              = "/aws/lambda/${var.project_name}-ecr-batch-updater"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# CloudWatch Alarm for ECR-Batch Updater Errors
resource "aws_cloudwatch_metric_alarm" "ecr_batch_updater_errors" {
  alarm_name          = "${var.project_name}-ecr-batch-updater-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Alert when ECR-Batch Updater Lambda fails"
  alarm_actions       = []

  dimensions = {
    FunctionName = aws_lambda_function.ecr_batch_updater.function_name
  }

  tags = var.tags
}

# SNS Topic for ECR-Batch Update Notifications (optional)
resource "aws_sns_topic" "ecr_batch_updates" {
  name = "${var.project_name}-ecr-batch-updates"

  tags = var.tags
}

# CloudWatch Custom Metric for successful updates
resource "aws_cloudwatch_log_metric_filter" "ecr_batch_update_success" {
  name           = "${var.project_name}-ecr-batch-update-success"
  log_group_name = aws_cloudwatch_log_group.ecr_batch_updater_logs.name
  pattern        = "[timestamp, level=\"✅\", message=\"ECR-Batch update completed*\"]"

  metric_transformation {
    name      = "ECRBatchUpdateSuccess"
    namespace = "NewsArchive/ECRBatch"
    value     = "1"
  }
}

# CloudWatch Custom Metric for failed updates
resource "aws_cloudwatch_log_metric_filter" "ecr_batch_update_failure" {
  name           = "${var.project_name}-ecr-batch-update-failure"
  log_group_name = aws_cloudwatch_log_group.ecr_batch_updater_logs.name
  pattern        = "[timestamp, level=\"❌\", message=\"ECR-Batch update failed*\"]"

  metric_transformation {
    name      = "ECRBatchUpdateFailure"
    namespace = "NewsArchive/ECRBatch"
    value     = "1"
  }
}

# Output the EventBridge rule ARN
output "ecr_eventbridge_rule_arn" {
  value       = aws_cloudwatch_event_rule.ecr_image_push.arn
  description = "ARN of the EventBridge rule for ECR image push events"
}

# Output the Lambda function ARN
output "ecr_batch_updater_lambda_arn" {
  value       = aws_lambda_function.ecr_batch_updater.arn
  description = "ARN of the ECR-Batch Updater Lambda function"
}

# Output the SNS topic ARN
output "ecr_batch_notifications_topic_arn" {
  value       = aws_sns_topic.ecr_batch_updates.arn
  description = "ARN of the SNS topic for ECR-Batch update notifications"
}