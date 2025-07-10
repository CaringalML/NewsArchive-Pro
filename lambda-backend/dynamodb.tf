# DynamoDB Tables Configuration

# Users Table
resource "aws_dynamodb_table" "users" {
  name           = "${var.lambda_function_name}-users-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  # Global secondary index for email lookups
  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-users-table"
    Type = "dynamodb-table"
  })
}

# Locations Table
resource "aws_dynamodb_table" "locations" {
  name           = "${var.lambda_function_name}-locations-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "location_id"

  attribute {
    name = "location_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  # Global secondary index for user_id lookups
  global_secondary_index {
    name            = "user-index"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-locations-table"
    Type = "dynamodb-table"
  })
}

# OCR Jobs Table
resource "aws_dynamodb_table" "ocr_jobs" {
  name           = "${var.lambda_function_name}-ocr-jobs-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "job_id"
  range_key      = "created_at"

  attribute {
    name = "job_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "location_id"
    type = "S"
  }

  # Global secondary index for user_id lookups
  global_secondary_index {
    name            = "user-index"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # Global secondary index for status lookups
  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # Global secondary index for location lookups
  global_secondary_index {
    name            = "location-index"
    hash_key        = "location_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # TTL for automatic deletion of old jobs (optional)
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  tags = merge(var.tags, {
    Name = "${var.lambda_function_name}-ocr-jobs-table"
    Type = "dynamodb-table"
  })
}

# Output the table names and ARNs
output "dynamodb_users_table_name" {
  value = aws_dynamodb_table.users.name
}

output "dynamodb_users_table_arn" {
  value = aws_dynamodb_table.users.arn
}

output "dynamodb_locations_table_name" {
  value = aws_dynamodb_table.locations.name
}

output "dynamodb_locations_table_arn" {
  value = aws_dynamodb_table.locations.arn
}

output "dynamodb_ocr_jobs_table_name" {
  value = aws_dynamodb_table.ocr_jobs.name
}

output "dynamodb_ocr_jobs_table_arn" {
  value = aws_dynamodb_table.ocr_jobs.arn
}

# DynamoDB Stream ARN for OCR Jobs (useful for triggering Lambda functions)
output "dynamodb_ocr_jobs_stream_arn" {
  value = aws_dynamodb_table.ocr_jobs.stream_arn
}