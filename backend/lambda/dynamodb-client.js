const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  maxAttempts: 3,
  requestHandler: {
    requestTimeout: 5000,
    httpsAgent: {
      maxSockets: 50,
      keepAlive: true
    }
  }
});

// Create DynamoDB Document Client
const dynamoDb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
    convertClassInstanceToMap: false
  },
  unmarshallOptions: {
    wrapNumbers: false
  }
});

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Table names from environment variables or defaults
const TABLES = {
  USERS: process.env.USERS_TABLE || 'newsarchive-pro-users-prod',
  OCR_JOBS: process.env.OCR_JOBS_TABLE || 'newsarchive-pro-ocr-jobs-prod'
};

// S3 bucket for file cleanup
const S3_BUCKET = process.env.S3_BUCKET || 'newsarchivepro-images-1747a635';

// Helper function to delete S3 file
const deleteS3File = async (s3Key) => {
  if (!s3Key) return { success: false, reason: 'No S3 key provided' };
  
  try {
    const deleteParams = {
      Bucket: S3_BUCKET,
      Key: s3Key
    };
    
    await s3Client.send(new DeleteObjectCommand(deleteParams));
    console.log(`Successfully deleted S3 file: ${s3Key}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to delete S3 file ${s3Key}:`, error);
    // Don't throw error - file might already be deleted or not exist
    return { success: false, error: error.message };
  }
};

// Helper functions for common DynamoDB operations

// Users table operations
const createUser = async (userData) => {
  const timestamp = new Date().toISOString();
  const item = {
    user_id: userData.user_id,
    email: userData.email,
    name: userData.name || '',
    created_at: timestamp,
    updated_at: timestamp,
    ...userData
  };

  const params = {
    TableName: TABLES.USERS,
    Item: item,
    ConditionExpression: 'attribute_not_exists(user_id)'
  };

  try {
    await dynamoDb.send(new PutCommand(params));
    return item;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      throw new Error('User already exists');
    }
    throw error;
  }
};

const getUser = async (userId) => {
  const params = {
    TableName: TABLES.USERS,
    Key: { user_id: userId }
  };

  const result = await dynamoDb.send(new GetCommand(params));
  return result.Item;
};

const getUserByEmail = async (email) => {
  const params = {
    TableName: TABLES.USERS,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email
    }
  };

  const result = await dynamoDb.send(new QueryCommand(params));
  return result.Items?.[0];
};


// OCR Jobs table operations
const createOCRJob = async (jobData) => {
  const timestamp = new Date().toISOString();
  const jobId = jobData.job_id || require('uuid').v4();
  
  const item = {
    job_id: jobId,
    created_at: timestamp,
    user_id: jobData.user_id,
    filename: jobData.filename,
    s3_key: jobData.s3_key,
    status: jobData.status || 'pending',
    extracted_text: jobData.extracted_text || '',
    corrected_text: jobData.corrected_text || '',
    correction_confidence: jobData.correction_confidence || 0,
    correction_model: jobData.correction_model || '',
    document_type: jobData.document_type || '',
    error: jobData.error || null,
    // Comprehend metadata fields
    entities: jobData.entities || null,
    key_phrases: jobData.key_phrases || null,
    sentiment: jobData.sentiment || null,
    metadata_summary: jobData.metadata_summary || null,
    comprehend_processed: jobData.comprehend_processed || false,
    updated_at: timestamp,
    // Set TTL to 90 days from now (optional)
    ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
    ...jobData
  };

  const params = {
    TableName: TABLES.OCR_JOBS,
    Item: item
  };

  await dynamoDb.send(new PutCommand(params));
  return item;
};

const getOCRJob = async (jobId, createdAt) => {
  const params = {
    TableName: TABLES.OCR_JOBS,
    Key: { 
      job_id: jobId,
      created_at: createdAt
    }
  };

  const result = await dynamoDb.send(new GetCommand(params));
  return result.Item;
};

const updateOCRJob = async (jobId, createdAt, updates) => {
  const timestamp = new Date().toISOString();
  
  // Build update expression
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {
    ':updated_at': timestamp
  };

  updateExpressions.push('#updated_at = :updated_at');
  expressionAttributeNames['#updated_at'] = 'updated_at';

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      const placeholder = `#${key}`;
      const valuePlaceholder = `:${key}`;
      updateExpressions.push(`${placeholder} = ${valuePlaceholder}`);
      expressionAttributeNames[placeholder] = key;
      expressionAttributeValues[valuePlaceholder] = value;
    }
  });

  const params = {
    TableName: TABLES.OCR_JOBS,
    Key: { 
      job_id: jobId,
      created_at: createdAt
    },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };

  const result = await dynamoDb.send(new UpdateCommand(params));
  return result.Attributes;
};

// Delete a single OCR job
const deleteOCRJob = async (jobId, createdAt) => {
  const params = {
    TableName: TABLES.OCR_JOBS,
    Key: { 
      job_id: jobId,
      created_at: createdAt
    },
    ReturnValues: 'ALL_OLD'
  };
  
  const result = await dynamoDb.send(new DeleteCommand(params));
  const deletedJob = result.Attributes;
  
  // Also delete the S3 file if it exists
  if (deletedJob && deletedJob.s3_key) {
    const s3Result = await deleteS3File(deletedJob.s3_key);
    deletedJob.s3_cleanup = s3Result;
  }
  
  return deletedJob;
};

// Delete all OCR jobs in a group (multi-page document)
const deleteOCRGroup = async (groupId) => {
  // First, query all jobs in the group
  const queryParams = {
    TableName: TABLES.OCR_JOBS,
    IndexName: 'group-index',
    KeyConditionExpression: 'group_id = :groupId',
    ExpressionAttributeValues: {
      ':groupId': groupId
    }
  };
  
  const queryResult = await dynamoDb.send(new QueryCommand(queryParams));
  const jobs = queryResult.Items || [];
  
  if (jobs.length === 0) {
    throw new Error(`No jobs found for group ${groupId}`);
  }
  
  // Delete all jobs in the group using batch write
  const deleteRequests = jobs.map(job => ({
    DeleteRequest: {
      Key: {
        job_id: job.job_id,
        created_at: job.created_at
      }
    }
  }));
  
  // DynamoDB batch write can handle max 25 items at a time
  const batches = [];
  for (let i = 0; i < deleteRequests.length; i += 25) {
    batches.push(deleteRequests.slice(i, i + 25));
  }
  
  const deletedJobs = [];
  for (const batch of batches) {
    const batchParams = {
      RequestItems: {
        [TABLES.OCR_JOBS]: batch
      }
    };
    
    await dynamoDb.send(new BatchWriteCommand(batchParams));
    deletedJobs.push(...batch.map(req => req.DeleteRequest.Key));
  }
  
  // Also delete all S3 files for jobs in this group
  const s3CleanupResults = [];
  for (const job of jobs) {
    if (job.s3_key) {
      const s3Result = await deleteS3File(job.s3_key);
      s3CleanupResults.push({
        job_id: job.job_id,
        s3_key: job.s3_key,
        s3_cleanup: s3Result
      });
    }
  }
  
  return {
    deletedCount: deletedJobs.length,
    deletedJobs: deletedJobs,
    s3Cleanup: s3CleanupResults
  };
};

const getOCRJobsByUser = async (userId, limit = 50) => {
  const params = {
    TableName: TABLES.OCR_JOBS,
    IndexName: 'user-index',
    KeyConditionExpression: 'user_id = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    },
    ScanIndexForward: false, // Sort by created_at descending
    Limit: limit
  };

  const result = await dynamoDb.send(new QueryCommand(params));
  return result.Items || [];
};

const getOCRJobsByStatus = async (status, limit = 100) => {
  const params = {
    TableName: TABLES.OCR_JOBS,
    IndexName: 'status-index',
    KeyConditionExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': status
    },
    ScanIndexForward: false, // Sort by created_at descending
    Limit: limit
  };

  const result = await dynamoDb.send(new QueryCommand(params));
  return result.Items || [];
};


// Export all functions and the DynamoDB client
module.exports = {
  dynamoDb,
  TABLES,
  // User operations
  createUser,
  getUser,
  getUserByEmail,
  // OCR Job operations
  createOCRJob,
  getOCRJob,
  updateOCRJob,
  deleteOCRJob,
  deleteOCRGroup,
  getOCRJobsByUser,
  getOCRJobsByStatus
};