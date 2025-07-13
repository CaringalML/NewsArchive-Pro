#!/usr/bin/env node

/**
 * Dockerized OCR Application for AWS Batch
 * Processes images using AWS Textract and Comprehend
 * Runs as a standalone container job
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS SDK
const textract = new AWS.Textract({
    region: process.env.AWS_DEFAULT_REGION || 'ap-southeast-2'
});

const comprehend = new AWS.Comprehend({
    region: process.env.AWS_DEFAULT_REGION || 'ap-southeast-2'
});

const s3 = new AWS.S3({
    region: process.env.AWS_DEFAULT_REGION || 'ap-southeast-2'
});

const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_DEFAULT_REGION || 'ap-southeast-2',
    maxRetries: 3
});

const sqs = new AWS.SQS({
    region: process.env.AWS_DEFAULT_REGION || 'ap-southeast-2'
});

class OCRProcessor {
    constructor() {
        this.jobId = process.env.jobId;
        this.userId = process.env.userId;
        this.s3Bucket = process.env.s3Bucket;
        this.s3Key = process.env.s3Key;
        this.fileName = process.env.fileName;
        this.fileSize = parseInt(process.env.fileSize || '0');

        console.log('🚀 OCR Processor initialized:', {
            jobId: this.jobId,
            userId: this.userId,
            s3Bucket: this.s3Bucket,
            s3Key: this.s3Key,
            fileName: this.fileName,
            fileSize: this.fileSize
        });
    }

    async processImage() {
        try {
            console.log(`📄 Starting OCR processing for job ${this.jobId}`);
            
            // Update job status to processing
            await this.updateJobStatus('processing', { 
                message: 'Batch job started OCR processing',
                batch_started_at: new Date().toISOString()
            });

            // Step 1: Start Textract job
            console.log('🔍 Starting Textract document analysis...');
            const textractJobId = await this.startTextractJob();
            
            // Step 2: Poll for Textract completion
            console.log(`⏳ Polling for Textract job completion: ${textractJobId}`);
            const textractResult = await this.pollTextractJob(textractJobId);
            
            // Step 3: Process and enhance text
            console.log('✨ Processing and enhancing OCR text...');
            const processedText = await this.processOCRText(textractResult);
            
            // Step 4: Perform AI analysis with Comprehend
            console.log('🧠 Analyzing text with AWS Comprehend...');
            const comprehendAnalysis = await this.analyzeWithComprehend(processedText.correctedText);
            
            // Step 5: Save results
            console.log('💾 Saving OCR results...');
            const results = {
                job_id: this.jobId,
                original_text: textractResult.extractedText,
                corrected_text: processedText.correctedText,
                confidence_score: textractResult.averageConfidence,
                corrections_applied: processedText.correctionsCount,
                entities: comprehendAnalysis.entities,
                key_phrases: comprehendAnalysis.keyPhrases,
                sentiment: comprehendAnalysis.sentiment,
                processing_time: Date.now() - this.startTime,
                completed_at: new Date().toISOString()
            };

            await this.saveResults(results);
            
            // Step 6: Update job status to completed
            await this.updateJobStatus('completed', {
                message: 'OCR processing completed successfully',
                completed_at: new Date().toISOString(),
                processing_time_ms: Date.now() - this.startTime,
                confidence_score: textractResult.averageConfidence,
                corrections_applied: processedText.correctionsCount
            });

            // Step 7: Send results to results queue
            await this.sendResultsNotification(results);

            console.log(`✅ OCR processing completed successfully for job ${this.jobId}`);
            return results;

        } catch (error) {
            console.error(`❌ OCR processing failed for job ${this.jobId}:`, error);
            
            await this.updateJobStatus('failed', {
                error: error.message,
                error_type: error.name,
                failed_at: new Date().toISOString(),
                message: 'Batch OCR processing failed'
            });

            throw error;
        }
    }

    async startTextractJob() {
        const params = {
            DocumentLocation: {
                S3Object: {
                    Bucket: this.s3Bucket,
                    Name: this.s3Key
                }
            },
            FeatureTypes: ['TABLES', 'FORMS'],
            JobTag: `ocr-job-${this.jobId}`
        };

        const response = await textract.startDocumentAnalysis(params).promise();
        console.log(`📋 Textract job started: ${response.JobId}`);
        return response.JobId;
    }

    async pollTextractJob(textractJobId, maxAttempts = 60) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await textract.getDocumentAnalysis({
                    JobId: textractJobId
                }).promise();

                console.log(`🔄 Textract job status (attempt ${attempt}): ${response.JobStatus}`);

                if (response.JobStatus === 'SUCCEEDED') {
                    return this.extractTextFromTextractResponse(response);
                } else if (response.JobStatus === 'FAILED') {
                    throw new Error(`Textract job failed: ${response.StatusMessage}`);
                }

                // Smart backoff: exponential up to 30 seconds, then fixed
                const delay = Math.min(Math.pow(2, Math.min(attempt, 5)) * 1000, 30000);
                console.log(`⏱️ Waiting ${delay}ms before next poll...`);
                await this.sleep(delay);

            } catch (error) {
                if (error.code === 'InvalidJobIdException') {
                    throw new Error(`Invalid Textract job ID: ${textractJobId}`);
                }
                console.warn(`⚠️ Textract polling error (attempt ${attempt}):`, error.message);
                
                if (attempt === maxAttempts) {
                    throw error;
                }
                await this.sleep(5000);
            }
        }

        throw new Error(`Textract job timed out after ${maxAttempts} attempts`);
    }

    extractTextFromTextractResponse(response) {
        let extractedText = '';
        let totalConfidence = 0;
        let wordCount = 0;

        if (response.Blocks) {
            response.Blocks.forEach(block => {
                if (block.BlockType === 'WORD') {
                    extractedText += block.Text + ' ';
                    if (block.Confidence) {
                        totalConfidence += block.Confidence;
                        wordCount++;
                    }
                }
            });
        }

        const averageConfidence = wordCount > 0 ? totalConfidence / wordCount : 0;
        
        console.log(`📊 Extracted ${wordCount} words with average confidence: ${averageConfidence.toFixed(2)}%`);

        return {
            extractedText: extractedText.trim(),
            averageConfidence: averageConfidence,
            wordCount: wordCount
        };
    }

    async processOCRText(textractResult) {
        // Apply rule-based corrections for common OCR errors
        const corrections = [
            // Common OCR misreads
            { pattern: /\bl\b/g, replacement: 'I' },  // Lowercase L mistaken for I
            { pattern: /\b0\b/g, replacement: 'O' },  // Zero mistaken for O
            { pattern: /rn/g, replacement: 'm' },     // rn mistaken for m
            { pattern: /\s+/g, replacement: ' ' },    // Multiple spaces
            // Add more corrections based on historical newspaper patterns
            { pattern: /\bthe\s+the\b/gi, replacement: 'the' }, // Duplicate words
            { pattern: /\bof\s+of\b/gi, replacement: 'of' },
            { pattern: /\band\s+and\b/gi, replacement: 'and' }
        ];

        let correctedText = textractResult.extractedText;
        let correctionsCount = 0;

        corrections.forEach(correction => {
            const matches = correctedText.match(correction.pattern);
            if (matches) {
                correctionsCount += matches.length;
                correctedText = correctedText.replace(correction.pattern, correction.replacement);
            }
        });

        console.log(`🔧 Applied ${correctionsCount} text corrections`);

        return {
            correctedText: correctedText.trim(),
            correctionsCount: correctionsCount
        };
    }

    async analyzeWithComprehend(text) {
        try {
            // Limit text size for Comprehend (5000 UTF-8 bytes max)
            const maxBytes = 5000;
            let analysisText = text;
            if (Buffer.byteLength(text, 'utf8') > maxBytes) {
                analysisText = text.substring(0, Math.floor(maxBytes * 0.9));
                console.log('📏 Text truncated for Comprehend analysis');
            }

            const [entitiesResult, keyPhrasesResult, sentimentResult] = await Promise.all([
                comprehend.detectEntities({
                    Text: analysisText,
                    LanguageCode: 'en'
                }).promise().catch(err => {
                    console.warn('⚠️ Entity detection failed:', err.message);
                    return { Entities: [] };
                }),

                comprehend.detectKeyPhrases({
                    Text: analysisText,
                    LanguageCode: 'en'
                }).promise().catch(err => {
                    console.warn('⚠️ Key phrase detection failed:', err.message);
                    return { KeyPhrases: [] };
                }),

                comprehend.detectSentiment({
                    Text: analysisText,
                    LanguageCode: 'en'
                }).promise().catch(err => {
                    console.warn('⚠️ Sentiment analysis failed:', err.message);
                    return { Sentiment: 'NEUTRAL', SentimentScore: {} };
                })
            ]);

            console.log(`🎯 Comprehend analysis completed: ${entitiesResult.Entities?.length || 0} entities, ${keyPhrasesResult.KeyPhrases?.length || 0} key phrases`);

            return {
                entities: entitiesResult.Entities || [],
                keyPhrases: keyPhrasesResult.KeyPhrases || [],
                sentiment: {
                    sentiment: sentimentResult.Sentiment,
                    scores: sentimentResult.SentimentScore
                }
            };

        } catch (error) {
            console.warn('⚠️ Comprehend analysis failed:', error.message);
            return {
                entities: [],
                keyPhrases: [],
                sentiment: { sentiment: 'NEUTRAL', scores: {} }
            };
        }
    }

    async saveResults(results) {
        // Save results to S3
        const s3Key = `results/${this.userId}/${this.jobId}/ocr-results.json`;
        
        await s3.putObject({
            Bucket: this.s3Bucket,
            Key: s3Key,
            Body: JSON.stringify(results, null, 2),
            ContentType: 'application/json',
            Metadata: {
                'job-id': this.jobId,
                'user-id': this.userId,
                'processed-at': new Date().toISOString()
            }
        }).promise();

        console.log(`💾 Results saved to S3: s3://${this.s3Bucket}/${s3Key}`);
    }

    async updateJobStatus(status, additionalFields = {}) {
        const updateParams = {
            TableName: process.env.DYNAMODB_TABLE_OCR_JOBS,
            Key: { job_id: this.jobId },
            UpdateExpression: 'SET #status = :status, updated_at = :updated_at',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
                ':status': status,
                ':updated_at': new Date().toISOString()
            }
        };

        // Add additional fields
        Object.keys(additionalFields).forEach((key, index) => {
            updateParams.UpdateExpression += `, #${key} = :${key}`;
            updateParams.ExpressionAttributeNames[`#${key}`] = key;
            updateParams.ExpressionAttributeValues[`:${key}`] = additionalFields[key];
        });

        await dynamodb.update(updateParams).promise();
        console.log(`📝 Job ${this.jobId} status updated to: ${status}`);
    }

    async sendResultsNotification(results) {
        const message = {
            job_id: this.jobId,
            user_id: this.userId,
            status: 'completed',
            results_s3_key: `results/${this.userId}/${this.jobId}/ocr-results.json`,
            timestamp: new Date().toISOString()
        };

        await sqs.sendMessage({
            QueueUrl: process.env.RESULTS_QUEUE_URL,
            MessageBody: JSON.stringify(message),
            MessageAttributes: {
                'job_id': { DataType: 'String', StringValue: this.jobId },
                'user_id': { DataType: 'String', StringValue: this.userId },
                'status': { DataType: 'String', StringValue: 'completed' }
            }
        }).promise();

        console.log(`📤 Results notification sent to queue`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Main execution
async function main() {
    const startTime = Date.now();
    
    try {
        console.log('🎬 Starting OCR Batch processing...');
        
        const processor = new OCRProcessor();
        processor.startTime = startTime;
        
        const results = await processor.processImage();
        
        const totalTime = Date.now() - startTime;
        console.log(`🎉 OCR processing completed in ${totalTime}ms`);
        
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Fatal error in OCR processing:', error);
        process.exit(1);
    }
}

// Handle process signals
process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📴 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

// Start processing
if (require.main === module) {
    main();
}

module.exports = OCRProcessor;