/**
 * ECR to Batch Auto-Updater Lambda Function
 * 
 * Automatically updates AWS Batch job definitions when new images are pushed to ECR
 * Triggered by EventBridge on ECR image push events
 */

const { BatchClient, DescribeJobDefinitionsCommand, RegisterJobDefinitionCommand } = require('@aws-sdk/client-batch');
const { ECRClient, DescribeRepositoriesCommand, DescribeImagesCommand } = require('@aws-sdk/client-ecr');

const region = process.env.AWS_REGION || 'ap-southeast-2';
const batchClient = new BatchClient({ region });
const ecrClient = new ECRClient({ region });

class ECRBatchUpdater {
    constructor() {
        this.PROJECT_NAME = process.env.PROJECT_NAME || 'newsarchivepro';
        this.ECR_REPOSITORY_NAME = process.env.ECR_REPOSITORY_NAME || 'newsarchive-backend';
        this.BATCH_JOB_DEFINITION_NAME = process.env.BATCH_JOB_DEFINITION_NAME || `${this.PROJECT_NAME}-ocr-job-definition`;
        this.BATCH_JOB_QUEUE = process.env.BATCH_JOB_QUEUE || `${this.PROJECT_NAME}-ocr-job-queue`;
    }

    /**
     * Parse ECR event from EventBridge
     * @param {Object} event - EventBridge event
     * @returns {Object} - Parsed ECR information
     */
    parseECREvent(event) {
        try {
            console.log('📦 Processing ECR event:', JSON.stringify(event, null, 2));

            // EventBridge ECR push event structure
            const detail = event.detail;
            
            if (!detail) {
                throw new Error('No event detail found');
            }

            const repositoryName = detail['repository-name'];
            const imageTag = detail['image-tag'] || 'latest';
            const registryId = detail['registry-id'];
            const region = event.region || this.region;

            // Construct image URI
            const imageUri = `${registryId}.dkr.ecr.${region}.amazonaws.com/${repositoryName}:${imageTag}`;

            console.log(`🐳 New ECR image detected:`, {
                repository: repositoryName,
                tag: imageTag,
                uri: imageUri,
                registryId: registryId
            });

            return {
                repositoryName,
                imageTag,
                imageUri,
                registryId,
                region
            };
        } catch (error) {
            console.error('❌ Error parsing ECR event:', error);
            throw new Error(`Failed to parse ECR event: ${error.message}`);
        }
    }

    /**
     * Verify ECR image exists and get metadata
     * @param {Object} ecrInfo - ECR information
     * @returns {Object} - Image metadata
     */
    async verifyECRImage(ecrInfo) {
        try {
            console.log(`🔍 Verifying ECR image: ${ecrInfo.imageUri}`);

            const command = new DescribeImagesCommand({
                repositoryName: ecrInfo.repositoryName,
                registryId: ecrInfo.registryId,
                imageIds: [
                    {
                        imageTag: ecrInfo.imageTag
                    }
                ]
            });

            const response = await ecrClient.send(command);
            
            if (!response.imageDetails || response.imageDetails.length === 0) {
                throw new Error(`No image found with tag: ${ecrInfo.imageTag}`);
            }

            const imageDetail = response.imageDetails[0];
            console.log(`✅ Image verified:`, {
                pushed: imageDetail.imagePushedAt,
                size: `${Math.round(imageDetail.imageSizeInBytes / 1024 / 1024)}MB`,
                digest: imageDetail.imageDigest?.substring(0, 20) + '...'
            });

            return {
                ...ecrInfo,
                imagePushedAt: imageDetail.imagePushedAt,
                imageSizeInBytes: imageDetail.imageSizeInBytes,
                imageDigest: imageDetail.imageDigest
            };
        } catch (error) {
            console.error('❌ Error verifying ECR image:', error);
            throw new Error(`Failed to verify ECR image: ${error.message}`);
        }
    }

    /**
     * Get current Batch job definition
     * @returns {Object} - Current job definition
     */
    async getCurrentJobDefinition() {
        try {
            console.log(`📋 Getting current Batch job definition: ${this.BATCH_JOB_DEFINITION_NAME}`);

            const command = new DescribeJobDefinitionsCommand({
                jobDefinitionName: this.BATCH_JOB_DEFINITION_NAME,
                status: 'ACTIVE'
            });

            const response = await batchClient.send(command);
            
            if (!response.jobDefinitions || response.jobDefinitions.length === 0) {
                throw new Error(`No active job definition found: ${this.BATCH_JOB_DEFINITION_NAME}`);
            }

            // Get the most recent active job definition
            const jobDefinition = response.jobDefinitions
                .sort((a, b) => b.revision - a.revision)[0];

            console.log(`📋 Current job definition:`, {
                name: jobDefinition.jobDefinitionName,
                revision: jobDefinition.revision,
                status: jobDefinition.status,
                currentImage: jobDefinition.containerProperties?.image
            });

            return jobDefinition;
        } catch (error) {
            console.error('❌ Error getting current job definition:', error);
            throw new Error(`Failed to get job definition: ${error.message}`);
        }
    }

    /**
     * Create new job definition with updated image
     * @param {Object} currentJobDef - Current job definition
     * @param {Object} imageInfo - New image information
     * @returns {Object} - New job definition response
     */
    async createUpdatedJobDefinition(currentJobDef, imageInfo) {
        try {
            console.log(`🔄 Creating new job definition with image: ${imageInfo.imageUri}`);

            // Check if image is already the same
            const currentImage = currentJobDef.containerProperties?.image;
            if (currentImage === imageInfo.imageUri) {
                console.log(`⏭️ Image already up to date: ${imageInfo.imageUri}`);
                return { skipped: true, reason: 'Image already current' };
            }

            // Create updated container properties
            const updatedContainerProperties = {
                ...currentJobDef.containerProperties,
                image: imageInfo.imageUri
            };

            // Prepare new job definition
            const newJobDefinition = {
                jobDefinitionName: currentJobDef.jobDefinitionName,
                type: currentJobDef.type,
                containerProperties: updatedContainerProperties,
                retryStrategy: currentJobDef.retryStrategy,
                timeout: currentJobDef.timeout,
                tags: {
                    ...currentJobDef.tags,
                    'UpdatedBy': 'ecr-batch-updater',
                    'UpdatedAt': new Date().toISOString(),
                    'PreviousRevision': currentJobDef.revision.toString(),
                    'ImageTag': imageInfo.imageTag,
                    'ImageDigest': imageInfo.imageDigest?.substring(0, 20)
                }
            };

            // Add platform capabilities if present (for Fargate)
            if (currentJobDef.platformCapabilities) {
                newJobDefinition.platformCapabilities = currentJobDef.platformCapabilities;
            }

            console.log(`📝 Registering new job definition revision...`);
            
            const command = new RegisterJobDefinitionCommand(newJobDefinition);
            const response = await batchClient.send(command);

            console.log(`✅ New job definition created:`, {
                name: response.jobDefinitionName,
                revision: response.revision,
                arn: response.jobDefinitionArn,
                previousRevision: currentJobDef.revision,
                newImage: imageInfo.imageUri
            });

            return {
                skipped: false,
                previousRevision: currentJobDef.revision,
                newRevision: response.revision,
                newJobDefinitionArn: response.jobDefinitionArn,
                updatedImage: imageInfo.imageUri
            };
        } catch (error) {
            console.error('❌ Error creating updated job definition:', error);
            throw new Error(`Failed to create updated job definition: ${error.message}`);
        }
    }

    /**
     * Send notification about the update
     * @param {Object} updateResult - Update result
     * @param {Object} imageInfo - Image information
     */
    async sendNotification(updateResult, imageInfo) {
        try {
            if (updateResult.skipped) {
                console.log(`📬 Notification: Job definition update skipped - ${updateResult.reason}`);
                return;
            }

            console.log(`📬 Notification: Batch job definition updated successfully`, {
                jobDefinition: this.BATCH_JOB_DEFINITION_NAME,
                previousRevision: updateResult.previousRevision,
                newRevision: updateResult.newRevision,
                newImage: imageInfo.imageUri,
                imageTag: imageInfo.imageTag,
                pushedAt: imageInfo.imagePushedAt
            });

            // Here you could add SNS notifications, Slack webhooks, etc.
            // For now, we'll just log the success
            
        } catch (error) {
            console.error('⚠️ Error sending notification (non-critical):', error);
            // Don't throw here - notification failure shouldn't fail the whole process
        }
    }
}

/**
 * Lambda handler function
 * @param {Object} event - EventBridge event
 * @returns {Object} - Response
 */
exports.handler = async (event) => {
    const startTime = Date.now();
    console.log('🚀 ECR-Batch Updater Lambda triggered');
    
    const updater = new ECRBatchUpdater();
    
    try {
        // Parse ECR event
        const ecrInfo = updater.parseECREvent(event);
        
        // Only process events for our OCR repository
        if (ecrInfo.repositoryName !== updater.ECR_REPOSITORY_NAME) {
            console.log(`⏭️ Skipping event for repository: ${ecrInfo.repositoryName} (not ${updater.ECR_REPOSITORY_NAME})`);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Event skipped - wrong repository',
                    repository: ecrInfo.repositoryName,
                    expectedRepository: updater.ECR_REPOSITORY_NAME
                })
            };
        }

        // Verify ECR image exists
        const imageInfo = await updater.verifyECRImage(ecrInfo);
        
        // Get current job definition
        const currentJobDef = await updater.getCurrentJobDefinition();
        
        // Create updated job definition
        const updateResult = await updater.createUpdatedJobDefinition(currentJobDef, imageInfo);
        
        // Send notification
        await updater.sendNotification(updateResult, imageInfo);
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ ECR-Batch update completed in ${processingTime}ms`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Batch job definition updated successfully',
                repository: imageInfo.repositoryName,
                imageTag: imageInfo.imageTag,
                imageUri: imageInfo.imageUri,
                skipped: updateResult.skipped,
                previousRevision: updateResult.previousRevision,
                newRevision: updateResult.newRevision,
                processingTimeMs: processingTime,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ ECR-Batch update failed after ${processingTime}ms:`, error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'ECR-Batch update failed',
                message: error.message,
                processingTimeMs: processingTime,
                timestamp: new Date().toISOString()
            })
        };
    }
};

// Export for testing
module.exports = {
    ECRBatchUpdater,
    handler: exports.handler
};