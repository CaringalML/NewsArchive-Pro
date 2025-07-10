# CloudWatch Log Group for main Lambda function
resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name              = "/aws/lambda/${var.lambda_function_name}"
  retention_in_days = 14

  tags = var.tags
}

# CloudWatch Log Group for OCR processor Lambda function
resource "aws_cloudwatch_log_group" "ocr_processor_log_group" {
  name              = "/aws/lambda/${var.lambda_function_name}-ocr-processor"
  retention_in_days = 14

  tags = var.tags
}

# CloudWatch Log Stream for main Lambda function
resource "aws_cloudwatch_log_stream" "lambda_log_stream" {
  name           = "${var.lambda_function_name}-log-stream"
  log_group_name = aws_cloudwatch_log_group.lambda_log_group.name
}

# CloudWatch Log Stream for OCR processor Lambda function
resource "aws_cloudwatch_log_stream" "ocr_processor_log_stream" {
  name           = "${var.lambda_function_name}-ocr-processor-log-stream"
  log_group_name = aws_cloudwatch_log_group.ocr_processor_log_group.name
}

# CloudWatch Log Group for Textract completion handler Lambda function
resource "aws_cloudwatch_log_group" "textract_completion_handler_log_group" {
  name              = "/aws/lambda/${var.lambda_function_name}-textract-completion"
  retention_in_days = 14

  tags = var.tags
}

# CloudWatch Log Stream for Textract completion handler Lambda function
resource "aws_cloudwatch_log_stream" "textract_completion_handler_log_stream" {
  name           = "${var.lambda_function_name}-textract-completion-log-stream"
  log_group_name = aws_cloudwatch_log_group.textract_completion_handler_log_group.name
}