const { ComprehendClient, DetectEntitiesCommand, DetectKeyPhrasesCommand, DetectSentimentCommand } = require('@aws-sdk/client-comprehend');

// AWS SDK clients
const region = process.env.AWS_REGION || 'ap-southeast-2';
const comprehendClient = new ComprehendClient({ region });

/**
 * Extract entities from text using AWS Comprehend
 * @param {string} text - The text to analyze
 * @returns {Promise<Object>} - Entities, key phrases, and sentiment analysis
 */
async function analyzeTextWithComprehend(text) {
    try {
        if (!text || text.trim().length === 0) {
            return {
                entities: [],
                keyPhrases: [],
                sentiment: null,
                error: 'No text provided for analysis'
            };
        }

        // Limit text length to Comprehend's limits (5000 bytes for entities/key phrases)
        const maxLength = 4900; // Leave some buffer for UTF-8 encoding
        const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;

        // Detect entities
        const entitiesCommand = new DetectEntitiesCommand({
            Text: truncatedText,
            LanguageCode: 'en'
        });

        // Detect key phrases
        const keyPhrasesCommand = new DetectKeyPhrasesCommand({
            Text: truncatedText,
            LanguageCode: 'en'
        });

        // Detect sentiment
        const sentimentCommand = new DetectSentimentCommand({
            Text: truncatedText,
            LanguageCode: 'en'
        });

        // Execute all commands in parallel
        const [entitiesResult, keyPhrasesResult, sentimentResult] = await Promise.all([
            comprehendClient.send(entitiesCommand),
            comprehendClient.send(keyPhrasesCommand),
            comprehendClient.send(sentimentCommand)
        ]);

        // Process entities with confidence filtering
        const entities = entitiesResult.Entities
            .filter(entity => entity.Score >= 0.7) // Only include high-confidence entities
            .map(entity => ({
                text: entity.Text,
                type: entity.Type,
                score: entity.Score,
                beginOffset: entity.BeginOffset,
                endOffset: entity.EndOffset
            }));

        // Process key phrases with confidence filtering
        const keyPhrases = keyPhrasesResult.KeyPhrases
            .filter(phrase => phrase.Score >= 0.7)
            .map(phrase => ({
                text: phrase.Text,
                score: phrase.Score,
                beginOffset: phrase.BeginOffset,
                endOffset: phrase.EndOffset
            }));

        // Process sentiment
        const sentiment = {
            sentiment: sentimentResult.Sentiment,
            confidence: sentimentResult.SentimentScore,
            mixed: sentimentResult.SentimentScore.Mixed,
            negative: sentimentResult.SentimentScore.Negative,
            neutral: sentimentResult.SentimentScore.Neutral,
            positive: sentimentResult.SentimentScore.Positive
        };

        return {
            entities,
            keyPhrases,
            sentiment,
            textLength: text.length,
            truncated: text.length > maxLength,
            processingTimestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error analyzing text with Comprehend:', error);
        return {
            entities: [],
            keyPhrases: [],
            sentiment: null,
            error: error.message,
            processingTimestamp: new Date().toISOString()
        };
    }
}

/**
 * Extract and categorize entities by type
 * @param {Array} entities - Array of entities from Comprehend
 * @returns {Object} - Categorized entities
 */
function categorizeEntities(entities) {
    const categorized = {
        PERSON: [],
        LOCATION: [],
        ORGANIZATION: [],
        COMMERCIAL_ITEM: [],
        EVENT: [],
        DATE: [],
        QUANTITY: [],
        TITLE: [],
        OTHER: []
    };

    entities.forEach(entity => {
        const category = entity.type || 'OTHER';
        if (categorized[category]) {
            categorized[category].push({
                text: entity.text,
                score: entity.score
            });
        } else {
            categorized.OTHER.push({
                text: entity.text,
                score: entity.score,
                originalType: entity.type
            });
        }
    });

    // Remove empty categories
    Object.keys(categorized).forEach(key => {
        if (categorized[key].length === 0) {
            delete categorized[key];
        }
    });

    return categorized;
}

/**
 * Generate metadata summary from analysis results
 * @param {Object} analysis - Analysis results from analyzeTextWithComprehend
 * @returns {Object} - Structured metadata
 */
function generateMetadataSummary(analysis) {
    const categorizedEntities = categorizeEntities(analysis.entities);
    
    // Extract top entities by category
    const topEntities = {};
    Object.keys(categorizedEntities).forEach(category => {
        topEntities[category] = categorizedEntities[category]
            .sort((a, b) => b.score - a.score)
            .slice(0, 5) // Top 5 entities per category
            .map(entity => entity.text);
    });

    // Extract top key phrases
    const topKeyPhrases = analysis.keyPhrases
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(phrase => phrase.text);

    return {
        entities: topEntities,
        keyPhrases: topKeyPhrases,
        sentiment: analysis.sentiment ? {
            overall: analysis.sentiment.sentiment,
            confidence: Math.max(
                analysis.sentiment.confidence.Mixed,
                analysis.sentiment.confidence.Negative,
                analysis.sentiment.confidence.Neutral,
                analysis.sentiment.confidence.Positive
            )
        } : null,
        summary: {
            totalEntities: analysis.entities.length,
            totalKeyPhrases: analysis.keyPhrases.length,
            textLength: analysis.textLength,
            truncated: analysis.truncated,
            processingTimestamp: analysis.processingTimestamp
        }
    };
}

module.exports = {
    analyzeTextWithComprehend,
    categorizeEntities,
    generateMetadataSummary
};