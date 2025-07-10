const { Client } = require('pg');
const { TextractClient, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');

// Database connection configuration
const dbConfig = {
    connectionString: 'postgresql://postgres.ofzrtzmcnwjnjleehkcx:MLCcaringal000@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres',
    ssl: {
        rejectUnauthorized: false
    }
};

// AWS SDK clients
const region = process.env.AWS_REGION || 'ap-southeast-2';
const textractClient = new TextractClient({ region });

// Helper function to get Textract results
async function getTextractResults(jobId) {
    const command = new GetDocumentTextDetectionCommand({
        JobId: jobId
    });
    return await textractClient.send(command);
}

// Main handler function
exports.handler = async (event) => {
    console.log('Textract Completion Handler Event:', JSON.stringify(event, null, 2));
    
    // Process each SQS record (SNS notifications from Textract)
    for (const record of event.Records) {
        const client = new Client(dbConfig);
        
        try {
            // Parse the SNS message from SQS
            const snsMessage = JSON.parse(record.body);
            const textractNotification = JSON.parse(snsMessage.Message);
            
            console.log('Textract notification:', JSON.stringify(textractNotification, null, 2));
            
            const { JobId, Status, API, Timestamp } = textractNotification;
            
            if (!JobId) {
                console.log('No JobId found in notification');
                continue;
            }
            
            // Connect to database
            await client.connect();
            
            // Find the OCR job by Textract job ID
            const jobResult = await client.query(
                'SELECT * FROM ocr_jobs WHERE textract_job_id = $1',
                [JobId]
            );
            
            if (jobResult.rows.length === 0) {
                console.log(`No OCR job found for Textract job ID: ${JobId}`);
                continue;
            }
            
            const job = jobResult.rows[0];
            console.log(`Processing completion for OCR job ${job.id}, Textract status: ${Status}`);
            
            if (Status === 'SUCCEEDED') {
                // Get the full results from Textract
                const textractResults = await getTextractResults(JobId);
                
                // Extract text from results
                const extractedText = textractResults.Blocks
                    ?.filter(block => block.BlockType === 'LINE')
                    ?.map(block => block.Text)
                    ?.join('\n') || '';
                
                // Calculate average confidence
                const confidenceScores = textractResults.Blocks
                    ?.filter(block => block.Confidence)
                    ?.map(block => block.Confidence) || [];
                const avgConfidence = confidenceScores.length > 0 
                    ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
                    : null;
                
                // Update job with results
                await client.query(`
                    UPDATE ocr_jobs SET 
                        status = $1, 
                        processing_stage = $2, 
                        extracted_text = $3, 
                        confidence_score = $4, 
                        textract_response = $5,
                        textract_completed_at = NOW(),
                        processing_completed_at = NOW()
                    WHERE id = $6
                `, [
                    'completed', 
                    'finished', 
                    extractedText, 
                    avgConfidence, 
                    JSON.stringify(textractResults),
                    job.id
                ]);
                
                console.log(`OCR job ${job.id} completed successfully. Extracted ${extractedText.length} characters.`);
                
            } else if (Status === 'FAILED') {
                // Get failure details
                const textractResults = await getTextractResults(JobId);
                const errorMessage = textractResults.StatusMessage || 'Textract processing failed';
                
                await client.query(
                    'UPDATE ocr_jobs SET status = $1, processing_stage = $2, error_message = $3, textract_completed_at = NOW() WHERE id = $4',
                    ['failed', 'textract_failed', errorMessage, job.id]
                );
                
                console.log(`OCR job ${job.id} failed: ${errorMessage}`);
                
            } else {
                console.log(`Unexpected Textract status for job ${job.id}: ${Status}`);
            }
            
        } catch (error) {
            console.error(`Error processing Textract completion:`, error);
            
            // We don't update the database here as we don't know which job failed
            // The job will remain in processing state and can be retried manually if needed
            
        } finally {
            try {
                await client.end();
            } catch (closeError) {
                console.error('Error closing database connection:', closeError);
            }
        }
    }
    
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Textract completion processing completed',
            processedRecords: event.Records.length
        })
    };
};