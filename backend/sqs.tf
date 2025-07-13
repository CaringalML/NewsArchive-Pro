# SQS Queue for OCR processing jobs - fed by S3 Event Handler Lambda
resource "aws_sqs_queue" "ocr_processing_queue" {
  name                       = "${var.lambda_function_name}-ocr-processing-queue"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600  # 14 days
  receive_wait_time_seconds  = 20       # Long polling for efficiency
  visibility_timeout_seconds = 300      # 5 minutes for Batch job submission

  # Dead Letter Queue configuration for failed job submissions
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.ocr_processing_dlq.arn
    maxReceiveCount     = 3  # Retry failed job submissions 3 times
  })

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-ocr-processing-queue"
    Type = "batch-job-submission"
  })
}

# Dead Letter Queue for failed job submissions
resource "aws_sqs_queue" "ocr_processing_dlq" {
  name                       = "${var.lambda_function_name}-ocr-processing-dlq"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600  # 14 days for investigation
  receive_wait_time_seconds  = 20

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-ocr-processing-dlq"
    Type = "batch-job-submission-dlq"
  })
}

# SQS Queue for OCR results - Batch jobs send results here
resource "aws_sqs_queue" "ocr_results_queue" {
  name                       = "${var.lambda_function_name}-ocr-results-queue"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 345600   # 4 days
  receive_wait_time_seconds  = 20
  visibility_timeout_seconds = 300      # 5 minutes for result processing

  # Dead Letter Queue for failed result processing
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.ocr_results_dlq.arn
    maxReceiveCount     = 3
  })

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-ocr-results-queue"
    Type = "batch-results"
  })
}

# Dead Letter Queue for failed result processing
resource "aws_sqs_queue" "ocr_results_dlq" {
  name                       = "${var.lambda_function_name}-ocr-results-dlq"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600  # 14 days
  receive_wait_time_seconds  = 20

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-ocr-results-dlq"
    Type = "batch-results-dlq"
  })
}

# SQS Queue for quick notifications (OCR completion alerts)
resource "aws_sqs_queue" "notification_queue" {
  name                       = "${var.lambda_function_name}-notification-queue"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 345600   # 4 days
  receive_wait_time_seconds  = 20
  visibility_timeout_seconds = 60       # 1 minute for quick notifications

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-notification-queue"
    Type = "notification-queue"
  })
}

# SQS Queue Policy for OCR processing queue
data "aws_iam_policy_document" "ocr_processing_queue_policy" {
  statement {
    sid    = "AllowLambdaAccess"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.lambda_role.arn]
    }

    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:SendMessage",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl"
    ]

    resources = [aws_sqs_queue.ocr_processing_queue.arn]
  }
}

# SQS Queue Policy for OCR results queue
data "aws_iam_policy_document" "ocr_results_queue_policy" {
  statement {
    sid    = "AllowLambdaAccess"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.lambda_role.arn]
    }

    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:SendMessage",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl"
    ]

    resources = [aws_sqs_queue.ocr_results_queue.arn]
  }
}

# SQS Queue Policy for notification queue
data "aws_iam_policy_document" "notification_queue_policy" {
  statement {
    sid    = "AllowLambdaAccessNotification"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.lambda_role.arn]
    }

    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:SendMessage",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl"
    ]

    resources = [
      aws_sqs_queue.notification_queue.arn
    ]
  }
}

# Apply the policy to the OCR processing queue
resource "aws_sqs_queue_policy" "ocr_processing_queue_policy" {
  queue_url = aws_sqs_queue.ocr_processing_queue.id
  policy    = data.aws_iam_policy_document.ocr_processing_queue_policy.json
}

# Apply the policy to the OCR results queue
resource "aws_sqs_queue_policy" "ocr_results_queue_policy" {
  queue_url = aws_sqs_queue.ocr_results_queue.id
  policy    = data.aws_iam_policy_document.ocr_results_queue_policy.json
}

# Apply the policy to the notification queue
resource "aws_sqs_queue_policy" "notification_queue_policy" {
  queue_url = aws_sqs_queue.notification_queue.id
  policy    = data.aws_iam_policy_document.notification_queue_policy.json
}

# CloudWatch Alarms for OCR processing queue monitoring
resource "aws_cloudwatch_metric_alarm" "ocr_processing_queue_depth_alarm" {
  alarm_name          = "${var.lambda_function_name}-ocr-processing-queue-depth-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApproximateNumberOfVisibleMessages"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Average"
  threshold           = "50"  # Alert if more than 50 jobs waiting
  alarm_description   = "High number of OCR jobs waiting for Batch submission"
  alarm_actions       = []

  dimensions = {
    QueueName = aws_sqs_queue.ocr_processing_queue.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "ocr_processing_dlq_messages_alarm" {
  alarm_name          = "${var.lambda_function_name}-ocr-processing-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ApproximateNumberOfVisibleMessages"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "Failed Batch job submissions detected in Dead Letter Queue"
  alarm_actions       = []

  dimensions = {
    QueueName = aws_sqs_queue.ocr_processing_dlq.name
  }

  tags = var.tags
}

# CloudWatch Alarm for OCR results queue monitoring
resource "aws_cloudwatch_metric_alarm" "ocr_results_queue_depth_alarm" {
  alarm_name          = "${var.lambda_function_name}-ocr-results-queue-depth-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApproximateNumberOfVisibleMessages"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Average"
  threshold           = "100"  # Alert if more than 100 results waiting
  alarm_description   = "High number of OCR results waiting for processing"
  alarm_actions       = []

  dimensions = {
    QueueName = aws_sqs_queue.ocr_results_queue.name
  }

  tags = var.tags
}

# CloudWatch Alarm for Batch job submission time
resource "aws_cloudwatch_metric_alarm" "batch_submission_time_alarm" {
  alarm_name          = "${var.lambda_function_name}-batch-submission-slow"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "300"  # Alert if messages wait more than 5 minutes for submission
  alarm_description   = "Batch job submission is taking too long"
  alarm_actions       = []

  dimensions = {
    QueueName = aws_sqs_queue.ocr_processing_queue.name
  }

  tags = var.tags
}