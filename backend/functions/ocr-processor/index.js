const { TextractClient, StartDocumentAnalysisCommand, GetDocumentAnalysisCommand } = require('@aws-sdk/client-textract');
const { ComprehendClient, DetectEntitiesCommand, DetectKeyPhrasesCommand, DetectSentimentCommand } = require('@aws-sdk/client-comprehend');
const { createClient } = require('@supabase/supabase-js');

const textractClient = new TextractClient({ region: process.env.AWS_REGION });
const comprehendClient = new ComprehendClient({ region: process.env.AWS_REGION });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  console.log('SQS Event:', JSON.stringify(event, null, 2));

  // Process each SQS message
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      const { pageId, s3Key, userId, jobId } = message;

      console.log(`Processing document for page: ${pageId}`);

      // Start Textract analysis
      const textractResult = await processWithTextract(s3Key);
      
      if (!textractResult.success) {
        throw new Error(`Textract processing failed: ${textractResult.error}`);
      }

      // Update page with OCR results
      const { error: ocrError } = await supabase
        .from('pages')
        .update({
          ocr_text: textractResult.text,
          ocr_confidence: textractResult.confidence,
          updated_at: new Date().toISOString()
        })
        .eq('id', pageId);

      if (ocrError) {
        console.error('OCR update error:', ocrError);
      }

      // Process with Comprehend if we have text
      let comprehendResult = null;
      if (textractResult.text && textractResult.text.trim()) {
        comprehendResult = await processWithComprehend(textractResult.text);
        
        if (comprehendResult.success) {
          // Save metadata to database
          const { error: metadataError } = await supabase
            .from('page_metadata')
            .upsert({
              page_id: pageId,
              language: comprehendResult.language,
              entities: comprehendResult.entities,
              key_phrases: comprehendResult.keyPhrases,
              sentiment: comprehendResult.sentiment
            });

          if (metadataError) {
            console.error('Metadata update error:', metadataError);
          }
        }
      }

      // Update processing job with results
      const resultData = {
        textract: textractResult
      };
      
      if (comprehendResult) {
        resultData.comprehend = comprehendResult;
      }

      const { error: jobError } = await supabase
        .from('processing_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result_data: resultData
        })
        .eq('aws_job_id', jobId);

      if (jobError) {
        console.error('Job update error:', jobError);
      }

      console.log(`Successfully processed document for page: ${pageId}`);

    } catch (error) {
      console.error('Processing error:', error);
      
      // Update job status to failed
      const message = JSON.parse(record.body);
      await supabase
        .from('processing_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('aws_job_id', message.jobId);
    }
  }
};

async function processWithTextract(s3Key) {
  try {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      throw new Error('S3_BUCKET environment variable not set');
    }

    // Start document analysis
    const startCommand = new StartDocumentAnalysisCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: bucket,
          Name: s3Key
        }
      },
      FeatureTypes: ['TABLES', 'FORMS']
    });

    const startResponse = await textractClient.send(startCommand);
    const jobId = startResponse.JobId;

    // Poll for completion
    let jobStatus = 'IN_PROGRESS';
    let getResponse;
    
    while (jobStatus === 'IN_PROGRESS') {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const getCommand = new GetDocumentAnalysisCommand({ JobId: jobId });
      getResponse = await textractClient.send(getCommand);
      jobStatus = getResponse.JobStatus;
    }

    if (jobStatus === 'FAILED') {
      throw new Error(getResponse.StatusMessage || 'Textract job failed');
    }

    // Extract text from blocks
    const textLines = [];
    let totalConfidence = 0;
    let blockCount = 0;

    for (const block of getResponse.Blocks || []) {
      if (block.BlockType === 'LINE' && block.Text) {
        textLines.push(block.Text);
        if (block.Confidence) {
          totalConfidence += block.Confidence;
          blockCount++;
        }
      }
    }

    const text = textLines.join('\n');
    const confidence = blockCount > 0 ? totalConfidence / blockCount : 0;

    return {
      success: true,
      text,
      confidence,
      blockCount
    };

  } catch (error) {
    console.error('Textract error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function processWithComprehend(text) {
  try {
    // Truncate text if too long (Comprehend has limits)
    const maxLength = 5000;
    const processedText = text.length > maxLength ? text.substring(0, maxLength) : text;

    // Detect entities
    const entitiesCommand = new DetectEntitiesCommand({
      Text: processedText,
      LanguageCode: 'en'
    });
    const entitiesResponse = await comprehendClient.send(entitiesCommand);

    // Detect key phrases
    const keyPhrasesCommand = new DetectKeyPhrasesCommand({
      Text: processedText,
      LanguageCode: 'en'
    });
    const keyPhrasesResponse = await comprehendClient.send(keyPhrasesCommand);

    // Detect sentiment
    const sentimentCommand = new DetectSentimentCommand({
      Text: processedText,
      LanguageCode: 'en'
    });
    const sentimentResponse = await comprehendClient.send(sentimentCommand);

    // Format results
    const entities = entitiesResponse.Entities?.map(entity => ({
      text: entity.Text,
      type: entity.Type,
      confidence: entity.Score
    })) || [];

    const keyPhrases = keyPhrasesResponse.KeyPhrases?.map(phrase => ({
      text: phrase.Text,
      confidence: phrase.Score
    })) || [];

    const sentiment = {
      sentiment: sentimentResponse.Sentiment,
      confidence: {
        Positive: sentimentResponse.SentimentScore?.Positive || 0,
        Negative: sentimentResponse.SentimentScore?.Negative || 0,
        Neutral: sentimentResponse.SentimentScore?.Neutral || 0,
        Mixed: sentimentResponse.SentimentScore?.Mixed || 0
      }
    };

    return {
      success: true,
      entities,
      keyPhrases,
      sentiment,
      language: 'en'
    };

  } catch (error) {
    console.error('Comprehend error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}