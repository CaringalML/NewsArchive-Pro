const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

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

// Table names from environment variables or defaults
const TABLES = {
  USERS: process.env.USERS_TABLE || 'newsarchive-pro-users-prod',
  LOCATIONS: process.env.LOCATIONS_TABLE || 'newsarchive-pro-locations-prod',
  OCR_JOBS: process.env.OCR_JOBS_TABLE || 'newsarchive-pro-ocr-jobs-prod'
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

// Locations table operations
const createLocation = async (locationData) => {
  const timestamp = new Date().toISOString();
  const locationId = locationData.location_id || require('uuid').v4();
  
  const item = {
    location_id: locationId,
    user_id: locationData.user_id,
    name: locationData.name,
    type: locationData.type || 'folder',
    parent_id: locationData.parent_id || null,
    path: locationData.path || '/',
    created_at: timestamp,
    updated_at: timestamp,
    ...locationData
  };

  const params = {
    TableName: TABLES.LOCATIONS,
    Item: item
  };

  await dynamoDb.send(new PutCommand(params));
  return item;
};

const getLocation = async (locationId) => {
  const params = {
    TableName: TABLES.LOCATIONS,
    Key: { location_id: locationId }
  };

  const result = await dynamoDb.send(new GetCommand(params));
  return result.Item;
};

const getLocationsByUser = async (userId) => {
  const params = {
    TableName: TABLES.LOCATIONS,
    IndexName: 'user-index',
    KeyConditionExpression: 'user_id = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  };

  const result = await dynamoDb.send(new QueryCommand(params));
  return result.Items || [];
};

// OCR Jobs table operations
const createOCRJob = async (jobData) => {
  const timestamp = new Date().toISOString();
  const jobId = jobData.job_id || require('uuid').v4();
  
  const item = {
    job_id: jobId,
    created_at: timestamp,
    user_id: jobData.user_id,
    location_id: jobData.location_id,
    filename: jobData.filename,
    s3_key: jobData.s3_key,
    status: jobData.status || 'pending',
    extracted_text: jobData.extracted_text || '',
    corrected_text: jobData.corrected_text || '',
    correction_confidence: jobData.correction_confidence || 0,
    correction_model: jobData.correction_model || '',
    document_type: jobData.document_type || '',
    error: jobData.error || null,
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

const getOCRJobsByLocation = async (locationId, limit = 50) => {
  const params = {
    TableName: TABLES.OCR_JOBS,
    IndexName: 'location-index',
    KeyConditionExpression: 'location_id = :locationId',
    ExpressionAttributeValues: {
      ':locationId': locationId
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
  // Location operations
  createLocation,
  getLocation,
  getLocationsByUser,
  // OCR Job operations
  createOCRJob,
  getOCRJob,
  updateOCRJob,
  getOCRJobsByUser,
  getOCRJobsByStatus,
  getOCRJobsByLocation
};