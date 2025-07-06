# Lambda Functions for NewsArchive Pro Backend

# Lambda execution role
resource "aws_iam_role" "lambda_execution_role" {
  name = "${var.environment}-newsarchive-lambda-role"

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

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-lambda-role"
  })
}

# Lambda execution policy
resource "aws_iam_role_policy" "lambda_execution_policy" {
  name = "${var.environment}-newsarchive-lambda-policy"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${aws_s3_bucket.storage_bucket.arn}",
          "${aws_s3_bucket.storage_bucket.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "textract:StartDocumentAnalysis",
          "textract:GetDocumentAnalysis",
          "textract:StartDocumentTextDetection",
          "textract:GetDocumentTextDetection"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "comprehend:DetectEntities",
          "comprehend:DetectKeyPhrases",
          "comprehend:DetectSentiment",
          "comprehend:DetectDominantLanguage"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          aws_sqs_queue.processing_queue.arn,
          aws_sqs_queue.processing_dlq.arn
        ]
      }
    ]
  })
}

# Attach basic execution role
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_execution_role.name
}

# API Gateway Lambda - Get Signed Upload URL
resource "aws_lambda_function" "get_upload_url" {
  filename         = "../backend/dist/get-upload-url.zip"
  function_name    = "${var.environment}-newsarchive-get-upload-url"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("../backend/dist/get-upload-url.zip")
  runtime         = var.lambda_runtime
  timeout         = 30
  memory_size     = 128

  environment {
    variables = {
      S3_BUCKET           = aws_s3_bucket.storage_bucket.bucket
      SUPABASE_URL        = var.supabase_url
      SUPABASE_SERVICE_KEY = var.supabase_service_key
      ENVIRONMENT         = var.environment
      CLOUDFRONT_DOMAIN   = aws_cloudfront_distribution.s3_distribution.domain_name
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.get_upload_url_logs
  ]

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-get-upload-url"
  })
}

# Process Document Lambda - Start Processing Pipeline
resource "aws_lambda_function" "process_document" {
  filename         = "../backend/dist/process-document.zip"
  function_name    = "${var.environment}-newsarchive-process-document"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("../backend/dist/process-document.zip")
  runtime         = var.lambda_runtime
  timeout         = 300
  memory_size     = 256

  environment {
    variables = {
      S3_BUCKET           = aws_s3_bucket.storage_bucket.bucket
      SUPABASE_URL        = var.supabase_url
      SUPABASE_SERVICE_KEY = var.supabase_service_key
      PROCESSING_QUEUE_URL = aws_sqs_queue.processing_queue.url
      ENVIRONMENT         = var.environment
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.process_document_logs
  ]

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-process-document"
  })
}

# OCR Processor Lambda - Handle Textract Jobs
resource "aws_lambda_function" "ocr_processor" {
  filename         = "../backend/dist/ocr-processor.zip"
  function_name    = "${var.environment}-newsarchive-ocr-processor"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("../backend/dist/ocr-processor.zip")
  runtime         = var.lambda_runtime
  timeout         = 900
  memory_size     = 512

  environment {
    variables = {
      S3_BUCKET           = aws_s3_bucket.storage_bucket.bucket
      SUPABASE_URL        = var.supabase_url
      SUPABASE_SERVICE_KEY = var.supabase_service_key
      ENVIRONMENT         = var.environment
      CLOUDFRONT_DOMAIN   = aws_cloudfront_distribution.s3_distribution.domain_name
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.ocr_processor_logs
  ]

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-ocr-processor"
  })
}

# SQS Event Source for OCR Processor
resource "aws_lambda_event_source_mapping" "ocr_processor_sqs" {
  event_source_arn = aws_sqs_queue.processing_queue.arn
  function_name    = aws_lambda_function.ocr_processor.arn
  batch_size       = 1
  maximum_batching_window_in_seconds = 5
}

# Processing Status Lambda - Get Processing Job Status
resource "aws_lambda_function" "get_processing_status" {
  filename         = "../backend/dist/get-processing-status.zip"
  function_name    = "${var.environment}-newsarchive-get-processing-status"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("../backend/dist/get-processing-status.zip")
  runtime         = var.lambda_runtime
  timeout         = 30
  memory_size     = 128

  environment {
    variables = {
      SUPABASE_URL        = var.supabase_url
      SUPABASE_SERVICE_KEY = var.supabase_service_key
      ENVIRONMENT         = var.environment
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.get_processing_status_logs
  ]

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-get-processing-status"
  })
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "get_upload_url_logs" {
  name              = "/aws/lambda/${var.environment}-newsarchive-get-upload-url"
  retention_in_days = 14

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-get-upload-url-logs"
  })
}

resource "aws_cloudwatch_log_group" "process_document_logs" {
  name              = "/aws/lambda/${var.environment}-newsarchive-process-document"
  retention_in_days = 14

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-process-document-logs"
  })
}

resource "aws_cloudwatch_log_group" "ocr_processor_logs" {
  name              = "/aws/lambda/${var.environment}-newsarchive-ocr-processor"
  retention_in_days = 14

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-ocr-processor-logs"
  })
}

resource "aws_cloudwatch_log_group" "get_processing_status_logs" {
  name              = "/aws/lambda/${var.environment}-newsarchive-get-processing-status"
  retention_in_days = 14

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-get-processing-status-logs"
  })
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "get_upload_url_api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_upload_url.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.newsarchive_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "process_document_api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.process_document.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.newsarchive_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_processing_status_api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_processing_status.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.newsarchive_api.execution_arn}/*/*"
}