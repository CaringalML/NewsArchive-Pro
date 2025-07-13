# AWS Batch infrastructure for OCR processing
# This replaces the Lambda-based OCR processing with scalable Batch jobs

# Batch Compute Environment - Using Fargate for cost efficiency
resource "aws_batch_compute_environment" "ocr_compute_env" {
  compute_environment_name = "${var.project_name}-ocr-compute-env"
  type                     = "MANAGED"
  state                    = "ENABLED"
  service_role            = aws_iam_role.batch_service_role.arn

  compute_resources {
    type               = "FARGATE"
    
    max_vcpus     = var.batch_compute_max_vcpus
    
    subnets = data.aws_subnets.default.ids
    security_group_ids = [aws_security_group.batch_compute.id]
  }

  depends_on = [aws_iam_role_policy_attachment.batch_service_role_policy]
}

# Batch Job Queue
resource "aws_batch_job_queue" "ocr_job_queue" {
  name     = "${var.project_name}-ocr-job-queue"
  state    = "ENABLED"
  priority = 1
  
  compute_environment_order {
    order               = 1
    compute_environment = aws_batch_compute_environment.ocr_compute_env.arn
  }

  tags = var.tags
}

# Batch Job Definition for OCR Processing - Fargate compatible
resource "aws_batch_job_definition" "ocr_job_definition" {
  name = "${var.project_name}-ocr-job-definition"
  type = "container"

  platform_capabilities = ["FARGATE"]

  container_properties = jsonencode({
    image = "${aws_ecr_repository.newsarchivepro_backend.repository_url}:ocr-batch"
    
    # Fargate resources must be specified as resourceRequirements
    resourceRequirements = [
      {
        type  = "VCPU"
        value = "1.0"  # 1 vCPU for Fargate (valid values: 0.25, 0.5, 1.0, 2.0, 4.0)
      },
      {
        type  = "MEMORY"
        value = "2048"  # 2GB memory (valid range depends on vCPU)
      }
    ]
    
    jobRoleArn = aws_iam_role.batch_job_role.arn
    executionRoleArn = aws_iam_role.batch_execution_role.arn
    
    environment = [
      {
        name  = "AWS_DEFAULT_REGION"
        value = var.aws_region
      },
      {
        name  = "DYNAMODB_TABLE_USERS"
        value = aws_dynamodb_table.users.name
      },
      {
        name  = "DYNAMODB_TABLE_OCR_JOBS"
        value = aws_dynamodb_table.ocr_jobs.name
      },
      {
        name  = "S3_BUCKET_IMAGES"
        value = aws_s3_bucket.images_bucket.bucket
      },
      {
        name  = "SQS_QUEUE_URL"
        value = aws_sqs_queue.ocr_processing_queue.url
      },
      {
        name  = "RESULTS_QUEUE_URL"
        value = aws_sqs_queue.ocr_results_queue.url
      }
    ]
    
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.batch_logs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ocr-job"
      }
    }
    
    # Fargate requires these to be empty
    mountPoints = []
    volumes     = []
    
    # Fargate platform version
    fargatePlatformConfiguration = {
      platformVersion = "LATEST"
    }
  })

  retry_strategy {
    attempts = var.batch_job_retry_attempts
  }

  timeout {
    attempt_duration_seconds = var.batch_job_timeout
  }

  tags = var.tags
}

# Security Group for Batch Compute Environment
resource "aws_security_group" "batch_compute" {
  name_prefix = "${var.project_name}-batch-compute"
  description = "Security group for Batch compute environment"
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-batch-compute-sg"
  })
}

# CloudWatch Log Group for Batch Jobs
resource "aws_cloudwatch_log_group" "batch_logs" {
  name              = "/aws/batch/${var.project_name}-ocr-jobs"
  retention_in_days = 14

  tags = var.tags
}

# Data sources for VPC and subnets
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}