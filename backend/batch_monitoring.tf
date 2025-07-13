# Comprehensive monitoring and logging for AWS Batch jobs

# CloudWatch Log Group for Batch jobs (already created in batch.tf)
# aws_cloudwatch_log_group.batch_logs

# CloudWatch Alarms for Batch monitoring
resource "aws_cloudwatch_metric_alarm" "batch_failed_jobs" {
  alarm_name          = "${var.project_name}-batch-failed-jobs"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FailedJobs"
  namespace           = "AWS/Batch"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Alert when Batch OCR jobs fail"
  alarm_actions       = []

  dimensions = {
    JobQueue = aws_batch_job_queue.ocr_job_queue.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "batch_queue_size" {
  alarm_name          = "${var.project_name}-batch-queue-size-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "RunnableJobs"
  namespace           = "AWS/Batch"
  period              = "300"
  statistic           = "Average"
  threshold           = "50"
  alarm_description   = "High number of runnable jobs in Batch queue"
  alarm_actions       = []

  dimensions = {
    JobQueue = aws_batch_job_queue.ocr_job_queue.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "batch_running_jobs" {
  alarm_name          = "${var.project_name}-batch-running-jobs-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "RunningJobs"
  namespace           = "AWS/Batch"
  period              = "300"
  statistic           = "Average"
  threshold           = "20"
  alarm_description   = "High number of running Batch jobs - may indicate stuck jobs"
  alarm_actions       = []

  dimensions = {
    JobQueue = aws_batch_job_queue.ocr_job_queue.name
  }

  tags = var.tags
}

# Custom CloudWatch Dashboard for OCR Processing and ECR-Batch Automation
resource "aws_cloudwatch_dashboard" "ocr_processing_dashboard" {
  dashboard_name = "${var.project_name}-ocr-processing"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Batch", "RunnableJobs", "JobQueue", aws_batch_job_queue.ocr_job_queue.name],
            [".", "RunningJobs", ".", "."],
            [".", "PendingJobs", ".", "."],
            [".", "FailedJobs", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Batch Job Status"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfVisibleMessages", "QueueName", aws_sqs_queue.ocr_processing_queue.name],
            [".", ".", ".", aws_sqs_queue.ocr_results_queue.name],
            [".", "NumberOfMessagesSent", "QueueName", aws_sqs_queue.ocr_processing_queue.name],
            [".", ".", ".", aws_sqs_queue.ocr_results_queue.name]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "SQS Queue Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.s3_event_handler.function_name],
            [".", "Errors", ".", "."],
            [".", "Duration", ".", "."],
            [".", "Invocations", ".", aws_lambda_function.batch_job_submitter.function_name],
            [".", "Errors", ".", "."],
            [".", "Duration", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Lambda Function Metrics"
          period  = 300
        }
      },
      {
        type   = "log"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          query   = "SOURCE '${aws_cloudwatch_log_group.batch_logs.name}' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
          region  = var.aws_region
          title   = "Recent Batch Job Errors"
          view    = "table"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["NewsArchive/ECRBatch", "ECRBatchUpdateSuccess"],
            [".", "ECRBatchUpdateFailure"],
            ["AWS/Lambda", "Invocations", "FunctionName", "${var.project_name}-ecr-batch-updater"],
            [".", "Errors", ".", "."],
            [".", "Duration", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ECR-Batch Auto-Update Metrics"
          period  = 300
        }
      },
      {
        type   = "log"
        x      = 12
        y      = 12
        width  = 12
        height = 6

        properties = {
          query   = "SOURCE '/aws/lambda/${var.project_name}-ecr-batch-updater' | fields @timestamp, @message | filter @message like /✅/ or @message like /🐳/ or @message like /📋/ | sort @timestamp desc | limit 20"
          region  = var.aws_region
          title   = "Recent ECR-Batch Updates"
          view    = "table"
        }
      }
    ]
  })
}

# CloudWatch Insights Queries for troubleshooting
resource "aws_cloudwatch_query_definition" "batch_job_failures" {
  name = "${var.project_name}-batch-job-failures"

  log_group_names = [
    aws_cloudwatch_log_group.batch_logs.name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /ERROR/ or @message like /FAILED/
| sort @timestamp desc
| limit 50
EOF
}

resource "aws_cloudwatch_query_definition" "batch_job_performance" {
  name = "${var.project_name}-batch-job-performance"

  log_group_names = [
    aws_cloudwatch_log_group.batch_logs.name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /processing completed/
| parse @message "processing completed in *ms" as duration
| stats avg(duration), max(duration), min(duration) by bin(5m)
EOF
}

resource "aws_cloudwatch_query_definition" "lambda_errors" {
  name = "${var.project_name}-lambda-errors"

  log_group_names = [
    aws_cloudwatch_log_group.s3_event_handler_logs.name,
    aws_cloudwatch_log_group.batch_job_submitter_logs.name
  ]

  query_string = <<EOF
fields @timestamp, @message, @logStream
| filter @message like /ERROR/ or @message like /Failed/
| sort @timestamp desc
| limit 100
EOF
}

resource "aws_cloudwatch_query_definition" "ecr_batch_updates" {
  name = "${var.project_name}-ecr-batch-updates"

  log_group_names = [
    aws_cloudwatch_log_group.ecr_batch_updater_logs.name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /🐳 New ECR image detected/ or @message like /✅ New job definition created/ or @message like /⏭️ Image already up to date/
| stats count() by bin(5m)
| sort @timestamp desc
EOF
}

resource "aws_cloudwatch_query_definition" "ecr_batch_failures" {
  name = "${var.project_name}-ecr-batch-failures"

  log_group_names = [
    aws_cloudwatch_log_group.ecr_batch_updater_logs.name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /❌/ or @message like /ERROR/
| sort @timestamp desc
| limit 50
EOF
}

# SNS Topic for critical alerts (optional - can be enabled later)
resource "aws_sns_topic" "ocr_alerts" {
  name = "${var.project_name}-ocr-alerts"

  tags = var.tags
}

# CloudWatch Composite Alarm for overall system health
resource "aws_cloudwatch_composite_alarm" "ocr_system_health" {
  alarm_name          = "${var.project_name}-ocr-system-health"
  alarm_description   = "Overall health of OCR processing system"
  
  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.batch_failed_jobs.alarm_name}) OR ALARM(${aws_cloudwatch_metric_alarm.ocr_processing_queue_depth_alarm.alarm_name}) OR ALARM(${aws_cloudwatch_metric_alarm.s3_event_handler_errors.alarm_name}) OR ALARM(${aws_cloudwatch_metric_alarm.batch_job_submitter_errors.alarm_name})"

  # actions_enabled = true
  # alarm_actions   = [aws_sns_topic.ocr_alerts.arn]
}

# Custom Metrics for application-level monitoring
resource "aws_cloudwatch_log_metric_filter" "ocr_success_rate" {
  name           = "${var.project_name}-ocr-success-rate"
  log_group_name = aws_cloudwatch_log_group.batch_logs.name
  pattern        = "[timestamp, level=\"INFO\", message=\"OCR processing completed successfully*\"]"

  metric_transformation {
    name      = "OCRSuccessfulJobs"
    namespace = "NewsArchive/OCR"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "ocr_failure_rate" {
  name           = "${var.project_name}-ocr-failure-rate"
  log_group_name = aws_cloudwatch_log_group.batch_logs.name
  pattern        = "[timestamp, level=\"ERROR\", message=\"OCR processing failed*\"]"

  metric_transformation {
    name      = "OCRFailedJobs"
    namespace = "NewsArchive/OCR"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "average_processing_time" {
  name           = "${var.project_name}-avg-processing-time"
  log_group_name = aws_cloudwatch_log_group.batch_logs.name
  pattern        = "[timestamp, level, message=\"OCR processing completed in\", duration, unit=\"ms\"]"

  metric_transformation {
    name      = "OCRProcessingTime"
    namespace = "NewsArchive/OCR"
    value     = "$duration"
    unit      = "Milliseconds"
  }
}