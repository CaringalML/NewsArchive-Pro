# SQS Queues for NewsArchive Pro Async Processing

# Dead Letter Queue for failed processing jobs
resource "aws_sqs_queue" "processing_dlq" {
  name                      = "${var.environment}-newsarchive-processing-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-processing-dlq"
    Type = "DeadLetterQueue"
  })
}

# Main processing queue
resource "aws_sqs_queue" "processing_queue" {
  name                      = "${var.environment}-newsarchive-processing-queue"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 1209600 # 14 days
  receive_wait_time_seconds = 10
  visibility_timeout_seconds = 900 # 15 minutes (same as Lambda timeout)

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.processing_dlq.arn
    maxReceiveCount     = 3
  })

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-processing-queue"
    Type = "ProcessingQueue"
  })
}

# SQS Queue Policy for Lambda access
resource "aws_sqs_queue_policy" "processing_queue_policy" {
  queue_url = aws_sqs_queue.processing_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution_role.arn
        }
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.processing_queue.arn
      }
    ]
  })
}

# CloudWatch Alarms for queue monitoring
resource "aws_cloudwatch_metric_alarm" "processing_queue_dlq_alarm" {
  alarm_name          = "${var.environment}-newsarchive-processing-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApproximateNumberOfVisibleMessages"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "This metric monitors dead letter queue messages"
  alarm_actions       = [] # Add SNS topic ARN if you want notifications

  dimensions = {
    QueueName = aws_sqs_queue.processing_dlq.name
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-processing-dlq-alarm"
  })
}

resource "aws_cloudwatch_metric_alarm" "processing_queue_age_alarm" {
  alarm_name          = "${var.environment}-newsarchive-processing-queue-age"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "1800" # 30 minutes
  alarm_description   = "This metric monitors message age in processing queue"
  alarm_actions       = [] # Add SNS topic ARN if you want notifications

  dimensions = {
    QueueName = aws_sqs_queue.processing_queue.name
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-processing-queue-age-alarm"
  })
}