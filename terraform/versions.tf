terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Use a stable version 
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"  # Latest stable version as of March 2025
    }
  }
  
  required_version = ">= 1.0.0"
}