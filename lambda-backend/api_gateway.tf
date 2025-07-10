# API Gateway V2 (HTTP API) Configuration
resource "aws_apigatewayv2_api" "newsarchive_api" {
  name          = "newsarchive-pro-api-${var.environment}"
  protocol_type = "HTTP"
  description   = "NewsArchive Pro API Gateway"
  
  cors_configuration {
    allow_credentials = false
    allow_headers = [
      "content-type",
      "x-amz-date",
      "authorization",
      "x-api-key",
      "x-amz-security-token",
      "x-amz-user-agent",
      "x-amzn-trace-id"
    ]
    allow_methods = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS"
    ]
    allow_origins = var.allowed_origins
    max_age = 86400
  }

  tags = {
    Name        = "newsarchive-pro-api-${var.environment}"
    Environment = var.environment
    Project     = "NewsArchive Pro"
  }
}

# API Gateway Stage
resource "aws_apigatewayv2_stage" "newsarchive_stage" {
  api_id      = aws_apigatewayv2_api.newsarchive_api.id
  name        = var.environment
  auto_deploy = true

  default_route_settings {
    detailed_metrics_enabled = true
    logging_level            = "INFO"
    data_trace_enabled       = true
    throttling_rate_limit    = 2000
    throttling_burst_limit   = 1000
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      error          = "$context.error.message"
    })
  }

  tags = {
    Name        = "newsarchive-pro-stage-${var.environment}"
    Environment = var.environment
    Project     = "NewsArchive Pro"
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/apigateway/newsarchive-pro-${var.environment}"
  retention_in_days = 14

  tags = {
    Name        = "newsarchive-pro-api-logs-${var.environment}"
    Environment = var.environment
    Project     = "NewsArchive Pro"
  }
}

# Lambda Integration
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id           = aws_apigatewayv2_api.newsarchive_api.id
  integration_type = "AWS_PROXY"
  
  connection_type    = "INTERNET"
  description        = "Lambda proxy integration"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.newsarchive_lambda.invoke_arn
  
  timeout_milliseconds = 30000
}

# Routes
resource "aws_apigatewayv2_route" "newsarchive_route" {
  api_id    = aws_apigatewayv2_api.newsarchive_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# Default route for root path
resource "aws_apigatewayv2_route" "newsarchive_root_route" {
  api_id    = aws_apigatewayv2_api.newsarchive_api.id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.newsarchive_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.newsarchive_api.execution_arn}/*/*"
}


# Output the API Gateway URL
output "api_gateway_url" {
  description = "API Gateway URL"
  value       = aws_apigatewayv2_api.newsarchive_api.api_endpoint
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_apigatewayv2_api.newsarchive_api.id
}

output "api_gateway_stage_url" {
  description = "API Gateway Stage URL"
  value       = "${aws_apigatewayv2_api.newsarchive_api.api_endpoint}/${aws_apigatewayv2_stage.newsarchive_stage.name}"
}