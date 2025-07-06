# API Gateway for NewsArchive Pro Backend

# API Gateway REST API
resource "aws_api_gateway_rest_api" "newsarchive_api" {
  name        = "${var.environment}-newsarchive-api"
  description = "NewsArchive Pro Backend API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-api"
  })
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "newsarchive_api_deployment" {
  depends_on = [
    aws_api_gateway_method.get_upload_url_post,
    aws_api_gateway_method.process_document_post,
    aws_api_gateway_method.get_processing_status_get,
    aws_api_gateway_method.options_upload_url,
    aws_api_gateway_method.options_process_document,
    aws_api_gateway_method.options_processing_status
  ]

  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.upload_url.id,
      aws_api_gateway_resource.process_document.id,
      aws_api_gateway_resource.processing_status.id,
      aws_api_gateway_method.get_upload_url_post.id,
      aws_api_gateway_method.process_document_post.id,
      aws_api_gateway_method.get_processing_status_get.id,
      aws_api_gateway_integration.get_upload_url_integration.id,
      aws_api_gateway_integration.process_document_integration.id,
      aws_api_gateway_integration.get_processing_status_integration.id,
      aws_api_gateway_integration_response.get_upload_url_integration_response.id,
      aws_api_gateway_integration_response.process_document_integration_response.id,
      aws_api_gateway_integration_response.get_processing_status_integration_response.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "newsarchive_api_stage" {
  deployment_id = aws_api_gateway_deployment.newsarchive_api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.newsarchive_api.id
  stage_name    = var.environment

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
      integrationError = "$context.integration.error"
    })
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-api-stage"
  })
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/apigateway/${var.environment}-newsarchive-api"
  retention_in_days = 14

  tags = merge(var.tags, {
    Name = "${var.environment}-newsarchive-api-logs"
  })
}

# CORS Configuration
locals {
  cors_headers = {
    "Access-Control-Allow-Origin"  = "*"
    "Access-Control-Allow-Headers" = "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
    "Access-Control-Allow-Methods" = "GET,POST,OPTIONS"
  }
}

# API Resources

# /upload-url resource
resource "aws_api_gateway_resource" "upload_url" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  parent_id   = aws_api_gateway_rest_api.newsarchive_api.root_resource_id
  path_part   = "upload-url"
}

# /process-document resource
resource "aws_api_gateway_resource" "process_document" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  parent_id   = aws_api_gateway_rest_api.newsarchive_api.root_resource_id
  path_part   = "process-document"
}

# /processing-status resource
resource "aws_api_gateway_resource" "processing_status" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  parent_id   = aws_api_gateway_rest_api.newsarchive_api.root_resource_id
  path_part   = "processing-status"
}

# /processing-status/{jobId} resource
resource "aws_api_gateway_resource" "processing_status_job_id" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  parent_id   = aws_api_gateway_resource.processing_status.id
  path_part   = "{jobId}"
}

# API Methods

# POST /upload-url
resource "aws_api_gateway_method" "get_upload_url_post" {
  rest_api_id   = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id   = aws_api_gateway_resource.upload_url.id
  http_method   = "POST"
  authorization = "NONE"

  request_parameters = {
    "method.request.header.Authorization" = false
  }
}

# POST /process-document
resource "aws_api_gateway_method" "process_document_post" {
  rest_api_id   = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id   = aws_api_gateway_resource.process_document.id
  http_method   = "POST"
  authorization = "NONE"

  request_parameters = {
    "method.request.header.Authorization" = false
  }
}

# GET /processing-status/{jobId}
resource "aws_api_gateway_method" "get_processing_status_get" {
  rest_api_id   = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id   = aws_api_gateway_resource.processing_status_job_id.id
  http_method   = "GET"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.jobId" = true
    "method.request.header.Authorization" = false
  }
}

# OPTIONS methods for CORS

# OPTIONS /upload-url
resource "aws_api_gateway_method" "options_upload_url" {
  rest_api_id   = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id   = aws_api_gateway_resource.upload_url.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# OPTIONS /process-document
resource "aws_api_gateway_method" "options_process_document" {
  rest_api_id   = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id   = aws_api_gateway_resource.process_document.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# OPTIONS /processing-status/{jobId}
resource "aws_api_gateway_method" "options_processing_status" {
  rest_api_id   = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id   = aws_api_gateway_resource.processing_status_job_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Lambda Integrations

# Integration for POST /upload-url
resource "aws_api_gateway_integration" "get_upload_url_integration" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.upload_url.id
  http_method = aws_api_gateway_method.get_upload_url_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.get_upload_url.invoke_arn
}

# Integration for POST /process-document
resource "aws_api_gateway_integration" "process_document_integration" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.process_document.id
  http_method = aws_api_gateway_method.process_document_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.process_document.invoke_arn
}

# Integration for GET /processing-status/{jobId}
resource "aws_api_gateway_integration" "get_processing_status_integration" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.processing_status_job_id.id
  http_method = aws_api_gateway_method.get_processing_status_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.get_processing_status.invoke_arn
}

# CORS Integrations

# OPTIONS /upload-url integration
resource "aws_api_gateway_integration" "options_upload_url_integration" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.upload_url.id
  http_method = aws_api_gateway_method.options_upload_url.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# OPTIONS /process-document integration
resource "aws_api_gateway_integration" "options_process_document_integration" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.process_document.id
  http_method = aws_api_gateway_method.options_process_document.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# OPTIONS /processing-status/{jobId} integration
resource "aws_api_gateway_integration" "options_processing_status_integration" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.processing_status_job_id.id
  http_method = aws_api_gateway_method.options_processing_status.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Method Responses

# POST /upload-url responses
resource "aws_api_gateway_method_response" "get_upload_url_response_200" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.upload_url.id
  http_method = aws_api_gateway_method.get_upload_url_post.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

# POST /process-document responses
resource "aws_api_gateway_method_response" "process_document_response_200" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.process_document.id
  http_method = aws_api_gateway_method.process_document_post.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

# GET /processing-status/{jobId} responses
resource "aws_api_gateway_method_response" "get_processing_status_response_200" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.processing_status_job_id.id
  http_method = aws_api_gateway_method.get_processing_status_get.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

# OPTIONS method responses
resource "aws_api_gateway_method_response" "options_upload_url_response_200" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.upload_url.id
  http_method = aws_api_gateway_method.options_upload_url.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_method_response" "options_process_document_response_200" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.process_document.id
  http_method = aws_api_gateway_method.options_process_document.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_method_response" "options_processing_status_response_200" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.processing_status_job_id.id
  http_method = aws_api_gateway_method.options_processing_status.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

# Integration Responses

# Integration responses for main methods (add CORS headers)
resource "aws_api_gateway_integration_response" "get_upload_url_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.upload_url.id
  http_method = aws_api_gateway_method.get_upload_url_post.http_method
  status_code = aws_api_gateway_method_response.get_upload_url_response_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
  }

  depends_on = [aws_api_gateway_integration.get_upload_url_integration]
}

resource "aws_api_gateway_integration_response" "process_document_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.process_document.id
  http_method = aws_api_gateway_method.process_document_post.http_method
  status_code = aws_api_gateway_method_response.process_document_response_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
  }

  depends_on = [aws_api_gateway_integration.process_document_integration]
}

resource "aws_api_gateway_integration_response" "get_processing_status_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.processing_status_job_id.id
  http_method = aws_api_gateway_method.get_processing_status_get.http_method
  status_code = aws_api_gateway_method_response.get_processing_status_response_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
  }

  depends_on = [aws_api_gateway_integration.get_processing_status_integration]
}

# OPTIONS integration responses
resource "aws_api_gateway_integration_response" "options_upload_url_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.upload_url.id
  http_method = aws_api_gateway_method.options_upload_url.http_method
  status_code = aws_api_gateway_method_response.options_upload_url_response_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
  }

  depends_on = [aws_api_gateway_integration.options_upload_url_integration]
}

resource "aws_api_gateway_integration_response" "options_process_document_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.process_document.id
  http_method = aws_api_gateway_method.options_process_document.http_method
  status_code = aws_api_gateway_method_response.options_process_document_response_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
  }

  depends_on = [aws_api_gateway_integration.options_process_document_integration]
}

resource "aws_api_gateway_integration_response" "options_processing_status_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.newsarchive_api.id
  resource_id = aws_api_gateway_resource.processing_status_job_id.id
  http_method = aws_api_gateway_method.options_processing_status.http_method
  status_code = aws_api_gateway_method_response.options_processing_status_response_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
  }

  depends_on = [aws_api_gateway_integration.options_processing_status_integration]
}