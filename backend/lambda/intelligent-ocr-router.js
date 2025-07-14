/**
 * Intelligent OCR Router
 * Decides whether to process OCR in Lambda (fast) or AWS Batch (heavy)
 * Implements Lambda-First approach with intelligent fallback
 */

const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { BatchClient, SubmitJobCommand } = require('@aws-sdk/client-batch');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { updateOCRJob, dynamoDb, TABLES } = require('./dynamodb-client');
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');

const region = process.env.AWS_REGION || 'ap-southeast-2';
const sqsClient = new SQSClient({ region });
const batchClient = new BatchClient({ region });
const lambdaClient = new LambdaClient({ region });

class IntelligentOCRRouter {
    constructor() {
        this.LAMBDA_TIMEOUT_THRESHOLD = 4.5 * 60 * 1000; // 4.5 minutes in ms
        this.LARGE_FILE_SIZE_THRESHOLD = 50 * 1024 * 1024; // 50MB
        this.COMPLEX_DOCUMENT_PAGES_THRESHOLD = 10; // Multi-page docs > 10 pages
        
        // Environment variables
        this.OCR_QUEUE_URL = process.env.OCR_QUEUE_URL;
        this.BATCH_JOB_QUEUE = process.env.BATCH_JOB_QUEUE;
        this.BATCH_JOB_DEFINITION = process.env.BATCH_JOB_DEFINITION;
        this.OCR_PROCESSOR_FUNCTION_NAME = process.env.OCR_PROCESSOR_FUNCTION_NAME;
    }

    /**
     * Get actual page count for grouped multi-page documents
     * @param {string} groupId - Group ID
     * @returns {Promise<number>} - Total page count
     */
    async getGroupPageCount(groupId) {
        if (!groupId) return 1;
        
        try {
            const params = {
                TableName: TABLES.OCR_JOBS,
                IndexName: 'group-index',
                KeyConditionExpression: 'group_id = :groupId',
                ExpressionAttributeValues: {
                    ':groupId': groupId
                },
                ProjectionExpression: 'page_number'
            };
            
            const result = await dynamoDb.send(new QueryCommand(params));
            return result.Items ? result.Items.length : 1;
        } catch (error) {
            console.error('Error getting group page count:', error);
            return 1; // Fallback to single page
        }
    }

    /**
     * Analyze job requirements and decide processing route
     * @param {Object} jobData - OCR job data
     * @returns {Object} - Routing decision with reasoning
     */
    async analyzeProcessingRequirements(jobData) {
        console.log('🔍 Analyzing Processing Requirements:', {
            job_id: jobData.job_id,
            forceBatch: jobData.forceBatch,
            force_batch: jobData.force_batch,
            file_size: `${(jobData.file_size / 1024 / 1024).toFixed(1)}MB`,
            force_batch_type: typeof jobData.force_batch,
            forceBatch_type: typeof jobData.forceBatch
        });
        
        // Check for force batch override first
        if (jobData.forceBatch || jobData.force_batch) {
            console.log('🏭 FORCE BATCH DETECTED! Overriding to AWS Batch processing');
            return {
                fileSize: jobData.file_size || 0,
                isMultiPage: jobData.is_multi_page || false,
                pageCount: jobData.page_count || 1,
                estimatedComplexity: 'forced',
                estimatedProcessingTime: 300, // 5 minutes estimate for forced batch
                factors: ['User forced AWS Batch processing'],
                recommendation: 'batch'
            };
        } else {
            console.log('⚡ No force batch detected, proceeding with automatic routing');
        }

        // Get actual page count for grouped documents
        const actualPageCount = jobData.group_id ? 
            await this.getGroupPageCount(jobData.group_id) : 
            (jobData.page_count || 1);
            
        const analysis = {
            fileSize: jobData.file_size || 0,
            isMultiPage: jobData.is_multi_page || !!jobData.group_id,
            pageCount: actualPageCount,
            estimatedComplexity: 'low',
            estimatedProcessingTime: 0,
            factors: [],
            recommendation: 'lambda'
        };

        // Factor 1: File size analysis
        if (analysis.fileSize > this.LARGE_FILE_SIZE_THRESHOLD) {
            analysis.factors.push(`Large file size: ${(analysis.fileSize / 1024 / 1024).toFixed(1)}MB`);
            analysis.estimatedComplexity = 'high';
            analysis.estimatedProcessingTime += 180; // 3 minutes base for large files
        } else {
            analysis.estimatedProcessingTime += 60; // 1 minute base for normal files
        }

        // Factor 2: Multi-page document analysis
        if (analysis.isMultiPage && analysis.pageCount > this.COMPLEX_DOCUMENT_PAGES_THRESHOLD) {
            analysis.factors.push(`Complex multi-page document: ${analysis.pageCount} pages`);
            analysis.estimatedComplexity = 'high';
            analysis.estimatedProcessingTime += analysis.pageCount * 20; // 20 seconds per page
        }

        // Factor 3: Document type complexity (if available)
        const filename = jobData.filename || '';
        if (filename.toLowerCase().includes('newspaper') || 
            filename.toLowerCase().includes('magazine') ||
            filename.toLowerCase().includes('complex')) {
            analysis.factors.push('Complex document type detected');
            analysis.estimatedComplexity = 'medium';
            analysis.estimatedProcessingTime += 90; // Additional 1.5 minutes
        }

        // Factor 4: Historical processing patterns (placeholder for future ML)
        // Could analyze user's historical processing times here

        // Make routing decision
        const estimatedTimeMs = analysis.estimatedProcessingTime * 1000;
        
        if (analysis.fileSize > this.LARGE_FILE_SIZE_THRESHOLD) {
            analysis.recommendation = 'batch';
            analysis.factors.push('File size exceeds Lambda limit');
        } else if (estimatedTimeMs > this.LAMBDA_TIMEOUT_THRESHOLD) {
            analysis.recommendation = 'batch';
            analysis.factors.push(`Estimated processing time (${analysis.estimatedProcessingTime}s) exceeds Lambda timeout`);
        } else if (analysis.isMultiPage && analysis.pageCount > this.COMPLEX_DOCUMENT_PAGES_THRESHOLD) {
            analysis.recommendation = 'batch';
            analysis.factors.push('Complex multi-page document better suited for Batch');
        }

        return analysis;
    }

    /**
     * Route OCR job to appropriate processing system
     * @param {Object} jobData - OCR job data
     * @returns {Object} - Routing result
     */
    async routeOCRJob(jobData) {
        try {
            const analysis = await this.analyzeProcessingRequirements(jobData);
            
            console.log(`🧠 OCR Routing Analysis for job ${jobData.job_id}:`, {
                recommendation: analysis.recommendation,
                complexity: analysis.estimatedComplexity,
                estimatedTime: `${analysis.estimatedProcessingTime}s`,
                factors: analysis.factors,
                fileSize: `${(analysis.fileSize / 1024 / 1024).toFixed(1)}MB`
            });

            // Update job with routing decision
            await updateOCRJob(jobData.job_id, jobData.created_at, {
                processing_route: analysis.recommendation,
                processing_complexity: analysis.estimatedComplexity,
                estimated_processing_time: analysis.estimatedProcessingTime,
                routing_factors: JSON.stringify(analysis.factors),
                routing_decided_at: new Date().toISOString(),
                forced_batch: jobData.force_batch || false
            });

            if (analysis.recommendation === 'batch') {
                return await this.routeToBatch(jobData, analysis);
            } else {
                return await this.routeToLambda(jobData, analysis);
            }

        } catch (error) {
            console.error(`❌ Error routing OCR job ${jobData.job_id}:`, error);
            
            // Fallback to Lambda for errors in routing logic
            console.log(`🔄 Falling back to Lambda processing for job ${jobData.job_id}`);
            return await this.routeToLambda(jobData, { recommendation: 'lambda', factors: ['Fallback due to routing error'] });
        }
    }

    /**
     * Route job to Lambda processing (fast) - Direct invocation
     * @param {Object} jobData - OCR job data
     * @param {Object} analysis - Routing analysis
     * @returns {Object} - Lambda routing result
     */
    async routeToLambda(jobData, analysis) {
        try {
            const payload = {
                Records: [{
                    body: JSON.stringify({
                        job_id: jobData.job_id,
                        created_at: jobData.created_at,
                        s3_bucket: jobData.s3_bucket,
                        s3_key: jobData.s3_key,
                        user_id: jobData.user_id,
                        filename: jobData.filename,
                        file_size: jobData.file_size,
                        processing_route: 'lambda',
                        routing_analysis: analysis
                    })
                }]
            };

            // Update job status to processing
            await updateOCRJob(jobData.job_id, jobData.created_at, {
                status: 'processing',
                processing_route: 'lambda',
                started_at: new Date().toISOString(),
                queue_type: 'direct_invocation',
                forced_batch: false  // Lambda jobs are never force batch
            });

            // Invoke OCR processor Lambda directly (async)
            const invokeCommand = new InvokeCommand({
                FunctionName: this.OCR_PROCESSOR_FUNCTION_NAME,
                InvocationType: 'Event', // Async invocation
                Payload: JSON.stringify(payload)
            });

            await lambdaClient.send(invokeCommand);

            console.log(`🚀 Job ${jobData.job_id} routed to Lambda processing (direct invocation)`);

            return {
                success: true,
                route: 'lambda',
                processor: 'AWS Lambda',
                estimatedTime: `${analysis.estimatedProcessingTime}s`,
                queueType: 'Direct Invocation',
                message: 'Job sent to Lambda for immediate processing'
            };

        } catch (error) {
            console.error(`❌ Error routing to Lambda:`, error);
            
            // Fallback: update job status to failed
            await updateOCRJob(jobData.job_id, jobData.created_at, {
                status: 'failed',
                error: error.message,
                failed_at: new Date().toISOString()
            });
            
            throw new Error(`Failed to route to Lambda: ${error.message}`);
        }
    }

    /**
     * Route job to AWS Batch processing (heavy duty)
     * @param {Object} jobData - OCR job data
     * @param {Object} analysis - Routing analysis
     * @returns {Object} - Batch routing result
     */
    async routeToBatch(jobData, analysis) {
        try {
            const batchJobParams = {
                jobName: `ocr-job-${jobData.job_id}-${Date.now()}`,
                jobQueue: this.BATCH_JOB_QUEUE,
                jobDefinition: this.BATCH_JOB_DEFINITION,
                parameters: {
                    jobId: jobData.job_id,
                    createdAt: jobData.created_at,
                    userId: jobData.user_id,
                    s3Bucket: jobData.s3_bucket,
                    s3Key: jobData.s3_key,
                    fileName: jobData.filename,
                    fileSize: String(jobData.file_size || 0),
                    processingRoute: 'batch',
                    forcedBatch: String(jobData.force_batch || false)
                },
                tags: {
                    JobId: jobData.job_id,
                    UserId: jobData.user_id,
                    ProcessingRoute: 'batch',
                    Complexity: analysis.estimatedComplexity,
                    ForcedBatch: jobData.force_batch ? 'true' : 'false',
                    Service: 'newsarchive-ocr'
                }
            };

            console.log(`📦 Submitting Batch job for ${jobData.job_id}:`, batchJobParams.jobName);
            
            const batchCommand = new SubmitJobCommand(batchJobParams);
            const batchResponse = await batchClient.send(batchCommand);

            // Update job status
            await updateOCRJob(jobData.job_id, jobData.created_at, {
                status: 'submitted',
                processing_route: 'batch',
                batch_job_id: batchResponse.jobId,
                batch_job_name: batchResponse.jobName,
                batch_submitted_at: new Date().toISOString(),
                queue_type: 'aws_batch',
                forced_batch: jobData.force_batch || false
            });

            console.log(`🏭 Job ${jobData.job_id} routed to AWS Batch processing: ${batchResponse.jobId}`);

            return {
                success: true,
                route: 'batch',
                processor: 'AWS Batch',
                batchJobId: batchResponse.jobId,
                batchJobName: batchResponse.jobName,
                estimatedTime: `${analysis.estimatedProcessingTime}s`,
                queueType: 'AWS Batch',
                message: 'Job submitted to AWS Batch for heavy processing'
            };

        } catch (error) {
            console.error(`❌ Error routing to Batch:`, error);
            
            // Fallback to Lambda if Batch submission fails
            console.log(`🔄 Batch submission failed, falling back to Lambda for job ${jobData.job_id}`);
            return await this.routeToLambda(jobData, { 
                ...analysis, 
                recommendation: 'lambda',
                factors: [...analysis.factors, 'Batch submission failed - fallback to Lambda']
            });
        }
    }

    /**
     * Get processing route recommendation without actually routing
     * @param {Object} jobData - OCR job data
     * @returns {Object} - Route recommendation
     */
    async getRouteRecommendation(jobData) {
        const analysis = await this.analyzeProcessingRequirements(jobData);
        return {
            recommendation: analysis.recommendation,
            complexity: analysis.estimatedComplexity,
            estimatedTime: analysis.estimatedProcessingTime,
            factors: analysis.factors,
            processor: analysis.recommendation === 'batch' ? 'AWS Batch' : 'AWS Lambda'
        };
    }
}

// Export singleton instance
const intelligentOCRRouter = new IntelligentOCRRouter();

module.exports = {
    IntelligentOCRRouter,
    intelligentOCRRouter
};