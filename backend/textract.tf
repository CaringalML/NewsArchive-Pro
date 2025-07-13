# SNS Topic for Textract job completion notifications
resource "aws_sns_topic" "textract_completion" {
  name = "${var.lambda_function_name}-textract-completion"

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-textract-topic"
    Type = "textract-notification"
  })
}

# SNS Topic policy to allow Textract to publish
resource "aws_sns_topic_policy" "textract_completion_policy" {
  arn = aws_sns_topic.textract_completion.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowTextractPublish"
        Effect = "Allow"
        Principal = {
          Service = "textract.amazonaws.com"
        }
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.textract_completion.arn
      }
    ]
  })
}

# SQS Queue for Textract job completion notifications
resource "aws_sqs_queue" "textract_results_queue" {
  name                       = "${var.lambda_function_name}-textract-results"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600  # 14 days
  receive_wait_time_seconds  = 20
  visibility_timeout_seconds = 300

  # Dead Letter Queue for failed result processing
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.textract_results_dlq.arn
    maxReceiveCount     = 3
  })

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-textract-results"
    Type = "textract-results"
  })
}

# Dead Letter Queue for failed Textract result processing
resource "aws_sqs_queue" "textract_results_dlq" {
  name                       = "${var.lambda_function_name}-textract-results-dlq"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600
  receive_wait_time_seconds  = 20

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-textract-results-dlq"
    Type = "textract-results-dlq"
  })
}

# SNS subscription to forward Textract notifications to SQS
resource "aws_sns_topic_subscription" "textract_to_sqs" {
  topic_arn = aws_sns_topic.textract_completion.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.textract_results_queue.arn
}

# SQS policy to allow SNS to send messages
resource "aws_sqs_queue_policy" "textract_results_queue_policy" {
  queue_url = aws_sqs_queue.textract_results_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSNSMessages"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.textract_results_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.textract_completion.arn
          }
        }
      }
    ]
  })
}

# IAM role for Textract service
resource "aws_iam_role" "textract_service_role" {
  name = "${var.lambda_function_name}-textract-role-${random_id.suffix.hex}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "textract.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM policy for Textract to access S3 and SNS
resource "aws_iam_role_policy" "textract_service_policy" {
  name = "${var.lambda_function_name}-textract-policy-${random_id.suffix.hex}"
  role = aws_iam_role.textract_service_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = "${aws_s3_bucket.images_bucket.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl"
        ]
        Resource = "${aws_s3_bucket.images_bucket.arn}/textract-output/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.textract_completion.arn
      }
    ]
  })
}

# CloudWatch Log Group for Textract operations
resource "aws_cloudwatch_log_group" "textract_logs" {
  name              = "/aws/textract/${var.lambda_function_name}"
  retention_in_days = 14

  tags = var.tags
}

# CloudWatch Alarms for Textract monitoring
resource "aws_cloudwatch_metric_alarm" "textract_errors" {
  alarm_name          = "${var.lambda_function_name}-textract-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UserErrorCount"
  namespace           = "AWS/Textract"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "High number of Textract errors detected"
  alarm_actions       = []

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "textract_throttles" {
  alarm_name          = "${var.lambda_function_name}-textract-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ThrottledCount"
  namespace           = "AWS/Textract"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Textract API throttling detected"
  alarm_actions       = []

  tags = var.tags
}