/**
 * Comprehend Service
 * AWS Comprehend integration for NLP analysis
 */

const { 
  ComprehendClient, 
  DetectEntitiesCommand, 
  DetectKeyPhrasesCommand, 
  DetectSentimentCommand 
} = require('@aws-sdk/client-comprehend');
const config = require('../config');
const { logger } = require('../utils/logger');

const comprehendClient = new ComprehendClient({ region: config.aws.region });

const MAX_TEXT_LENGTH = 5000;

/**
 * Analyze text with AWS Comprehend
 * @param {string} text - Text to analyze
 * @returns {object} Analysis result
 */
exports.analyzeText = async (text) => {
  try {
    // Truncate text if too long
    const processedText = text.length > MAX_TEXT_LENGTH 
      ? text.substring(0, MAX_TEXT_LENGTH) 
      : text;

    logger.info('Starting Comprehend analysis', { 
      textLength: processedText.length 
    });

    // Run all analyses in parallel
    const [entities, keyPhrases, sentiment] = await Promise.all([
      this.detectEntities(processedText),
      this.detectKeyPhrases(processedText),
      this.detectSentiment(processedText)
    ]);

    logger.info('Comprehend analysis completed', {
      entitiesCount: entities.length,
      keyPhrasesCount: keyPhrases.length,
      sentiment: sentiment.sentiment
    });

    return {
      success: true,
      entities,
      keyPhrases,
      sentiment,
      language: 'en'
    };

  } catch (error) {
    logger.error('Comprehend error', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Detect entities in text
 * @param {string} text - Text to analyze
 * @returns {array} Detected entities
 */
exports.detectEntities = async (text) => {
  const command = new DetectEntitiesCommand({
    Text: text,
    LanguageCode: 'en'
  });
  
  const response = await comprehendClient.send(command);
  
  return (response.Entities || []).map(entity => ({
    text: entity.Text,
    type: entity.Type,
    confidence: Math.round(entity.Score * 100) / 100
  }));
};

/**
 * Detect key phrases in text
 * @param {string} text - Text to analyze
 * @returns {array} Detected key phrases
 */
exports.detectKeyPhrases = async (text) => {
  const command = new DetectKeyPhrasesCommand({
    Text: text,
    LanguageCode: 'en'
  });
  
  const response = await comprehendClient.send(command);
  
  return (response.KeyPhrases || []).map(phrase => ({
    text: phrase.Text,
    confidence: Math.round(phrase.Score * 100) / 100
  }));
};

/**
 * Detect sentiment in text
 * @param {string} text - Text to analyze
 * @returns {object} Sentiment analysis
 */
exports.detectSentiment = async (text) => {
  const command = new DetectSentimentCommand({
    Text: text,
    LanguageCode: 'en'
  });
  
  const response = await comprehendClient.send(command);
  
  return {
    sentiment: response.Sentiment,
    confidence: {
      Positive: Math.round((response.SentimentScore?.Positive || 0) * 100) / 100,
      Negative: Math.round((response.SentimentScore?.Negative || 0) * 100) / 100,
      Neutral: Math.round((response.SentimentScore?.Neutral || 0) * 100) / 100,
      Mixed: Math.round((response.SentimentScore?.Mixed || 0) * 100) / 100
    }
  };
};