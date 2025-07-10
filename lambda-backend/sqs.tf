# SQS Queue for OCR image processing tasks
resource "aws_sqs_queue" "ocr_queue" {
  name                       = "${var.lambda_function_name}-ocr-queue"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600  # 14 days
  receive_wait_time_seconds  = 0        # Short polling for immediate processing
  visibility_timeout_seconds = 900      # 15 minutes for OCR processing

  # Dead Letter Queue configuration for failed OCR tasks
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.ocr_dlq.arn
    maxReceiveCount     = 3  # Retry failed OCR 3 times
  })

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-ocr-queue"
    Type = "ocr-processing"
  })
}

# Dead Letter Queue for failed OCR processing
resource "aws_sqs_queue" "ocr_dlq" {
  name                       = "${var.lambda_function_name}-ocr-dlq"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600  # 14 days for investigation
  receive_wait_time_seconds  = 20

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-ocr-dlq"
    Type = "ocr-dead-letter-queue"
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

# SQS Queue Policy for Lambda access
data "aws_iam_policy_document" "sqs_queue_policy" {
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

    resources = [
      aws_sqs_queue.ocr_queue.arn
    ]
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

# Apply the policy to the OCR queue
resource "aws_sqs_queue_policy" "ocr_queue_policy" {
  queue_url = aws_sqs_queue.ocr_queue.id
  policy    = data.aws_iam_policy_document.sqs_queue_policy.json
}

# Apply the policy to the notification queue
resource "aws_sqs_queue_policy" "notification_queue_policy" {
  queue_url = aws_sqs_queue.notification_queue.id
  policy    = data.aws_iam_policy_document.notification_queue_policy.json
}

# CloudWatch Alarms for OCR queue monitoring
resource "aws_cloudwatch_metric_alarm" "ocr_queue_depth_alarm" {
  alarm_name          = "${var.lambda_function_name}-ocr-queue-depth-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApproximateNumberOfVisibleMessages"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Average"
  threshold           = "50"  # Alert if more than 50 images waiting
  alarm_description   = "High number of images waiting for OCR processing"
  alarm_actions       = []

  dimensions = {
    QueueName = aws_sqs_queue.ocr_queue.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "ocr_dlq_messages_alarm" {
  alarm_name          = "${var.lambda_function_name}-ocr-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ApproximateNumberOfVisibleMessages"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "Failed OCR processing detected in Dead Letter Queue"
  alarm_actions       = []

  dimensions = {
    QueueName = aws_sqs_queue.ocr_dlq.name
  }

  tags = var.tags
}

# CloudWatch Alarm for OCR processing time
resource "aws_cloudwatch_metric_alarm" "ocr_processing_time_alarm" {
  alarm_name          = "${var.lambda_function_name}-ocr-processing-slow"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "600"  # Alert if messages wait more than 10 minutes
  alarm_description   = "OCR processing is taking too long"
  alarm_actions       = []

  dimensions = {
    QueueName = aws_sqs_queue.ocr_queue.name
  }

  tags = var.tags
}