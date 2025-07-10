// Enhanced rule-based OCR text correction system
// This demonstrates advanced text processing without requiring external AI services

// Comprehensive OCR error patterns based on real-world data
const OCR_ERROR_PATTERNS = {
    // Character substitutions (most common OCR errors)
    characterPairs: [
        ['0', 'O'], ['0', 'o'], ['0', 'Q'],
        ['1', 'l'], ['1', 'I'], ['1', '|'],
        ['5', 'S'], ['5', 's'], ['8', 'B'],
        ['6', 'G'], ['9', 'g'], ['2', 'Z'],
        ['rn', 'm'], ['vv', 'w'], ['ii', 'n'],
        ['lI', 'Il'], ['cl', 'd'], ['cI', 'd']
    ],
    
    // Common word corrections with context
    wordCorrections: {
        // Basic words
        'tbe': 'the', 'tbis': 'this', 'tben': 'then', 'tbat': 'that', 'tbere': 'there',
        'wbat': 'what', 'wben': 'when', 'wbere': 'where', 'wbo': 'who', 'wby': 'why',
        'witb': 'with', 'whicb': 'which', 'wbile': 'while',
        
        // Common verbs
        'rnake': 'make', 'rnaking': 'making', 'rnakes': 'makes', 'rnade': 'made',
        'corne': 'come', 'corning': 'coming', 'cornes': 'comes', 'carne': 'came',
        'sorne': 'some', 'sornetimes': 'sometimes', 'sornething': 'something',
        'becorne': 'become', 'becorning': 'becoming',
        
        // Common nouns
        'narne': 'name', 'narnes': 'names', 'narned': 'named',
        'tirne': 'time', 'tirnes': 'times', 'tirnely': 'timely',
        'hornepage': 'homepage', 'horne': 'home',
        'ernail': 'email', 'ernails': 'emails',
        'nurnber': 'number', 'nurnbers': 'numbers',
        'systern': 'system', 'systerns': 'systems',
        'prograrn': 'program', 'prograrns': 'programs',
        'docurnent': 'document', 'docurnents': 'documents',
        
        // Business/tech terms
        'cornpany': 'company', 'cornpanies': 'companies',
        'cornputer': 'computer', 'cornputers': 'computers',
        'infornation': 'information', 'inforrnation': 'information',
        'developrnent': 'development', 'developrnent': 'development',
        'rnanagement': 'management', 'rnanager': 'manager',
        'custorner': 'customer', 'custorners': 'customers',
        'payrment': 'payment', 'payrnent': 'payment',
        
        // Common OCR errors with 'h'
        'tlie': 'the', 'tliat': 'that', 'tliis': 'this',
        'otlier': 'other', 'anotlier': 'another',
        
        // Double letter issues
        'tlhe': 'the', 'thhe': 'the', 'tthe': 'the',
        'wiith': 'with', 'withh': 'with',
        
        // Missing letters
        'th': 'the', 'nd': 'and', 'fr': 'for',
        'hve': 'have', 'hav': 'have',
        'ws': 'was', 'hs': 'has'
    },
    
    // Context-aware replacements
    contextualCorrections: [
        { pattern: /\b(\w+)rn(\w+)/g, replacement: (match, p1, p2) => p1 + 'm' + p2 },
        { pattern: /\b(\w+)vv(\w+)/g, replacement: (match, p1, p2) => p1 + 'w' + p2 },
        { pattern: /\bcl(\w+)/g, replacement: (match, p1) => 'd' + p1 },
        { pattern: /\b([A-Z])0([A-Z])/g, replacement: (match, p1, p2) => p1 + 'O' + p2 }
    ]
};

// Common English words for validation
const COMMON_WORDS = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
    'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
    'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
    'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
    'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
    'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
    'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
    'give', 'day', 'most', 'us', 'name', 'email', 'phone', 'address', 'company'
]);

// Helper function to calculate edit distance
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Find the best correction for a word
function findBestCorrection(word) {
    const lowerWord = word.toLowerCase();
    
    // Check if it's already a common word
    if (COMMON_WORDS.has(lowerWord)) {
        return word;
    }
    
    // Check direct corrections
    if (OCR_ERROR_PATTERNS.wordCorrections[lowerWord]) {
        // Preserve original case
        const correction = OCR_ERROR_PATTERNS.wordCorrections[lowerWord];
        if (word[0] === word[0].toUpperCase()) {
            return correction.charAt(0).toUpperCase() + correction.slice(1);
        }
        return correction;
    }
    
    // Try character substitutions
    let bestCorrection = word;
    let minDistance = Infinity;
    
    for (const [error, correct] of OCR_ERROR_PATTERNS.characterPairs) {
        const corrected = word.replace(new RegExp(error, 'g'), correct);
        if (COMMON_WORDS.has(corrected.toLowerCase())) {
            const distance = levenshteinDistance(word, corrected);
            if (distance < minDistance) {
                minDistance = distance;
                bestCorrection = corrected;
            }
        }
    }
    
    return bestCorrection;
}

// Enhanced text preprocessing
function preprocessText(text) {
    // Normalize whitespace while preserving structure
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
}

// Apply smart spacing corrections
function fixSpacing(text) {
    return text
        // Remove space before punctuation
        .replace(/\s+([.,!?;:'])/g, '$1')
        // Add space after punctuation (except in decimals/abbreviations)
        .replace(/([.,!?;:])(?![0-9])(?=[A-Za-z])/g, '$1 ')
        // Fix multiple spaces
        .replace(/\s{2,}/g, ' ')
        // Fix spacing around parentheses
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        // Fix spacing around quotes
        .replace(/"\s+/g, '"')
        .replace(/\s+"/g, '"')
        .trim();
}

// Detect and preserve formats (emails, URLs, numbers)
function preserveSpecialFormats(text) {
    const preserved = [];
    let processedText = text;
    
    // Preserve emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    processedText = processedText.replace(emailRegex, (match) => {
        preserved.push(match);
        return `__PRESERVED_${preserved.length - 1}__`;
    });
    
    // Preserve URLs
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    processedText = processedText.replace(urlRegex, (match) => {
        preserved.push(match);
        return `__PRESERVED_${preserved.length - 1}__`;
    });
    
    // Preserve phone numbers
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    processedText = processedText.replace(phoneRegex, (match) => {
        preserved.push(match);
        return `__PRESERVED_${preserved.length - 1}__`;
    });
    
    return { processedText, preserved };
}

// Restore preserved formats
function restoreSpecialFormats(text, preserved) {
    let restoredText = text;
    preserved.forEach((item, index) => {
        restoredText = restoredText.replace(`__PRESERVED_${index}__`, item);
    });
    return restoredText;
}

// Optimized main correction function
function correctOCRText(text, options = {}) {
    const {
        preserveCase = true,
        preserveFormat = true,
        aggressiveCorrection = false
    } = options;
    
    // Quick exit for empty text
    if (!text || text.length === 0) {
        return {
            original: text,
            corrected: text,
            confidence: 1.0,
            corrections: 0,
            model: 'enhanced-rule-based'
        };
    }
    
    // Preprocess
    let correctedText = preprocessText(text);
    
    // Preserve special formats
    const { processedText, preserved } = preserveSpecialFormats(correctedText);
    correctedText = processedText;
    
    // Apply word-level corrections
    const words = correctedText.split(/\s+/);
    const correctedWords = words.map(word => {
        // Skip preserved placeholders
        if (word.startsWith('__PRESERVED_')) {
            return word;
        }
        
        // Remove punctuation for correction
        const punctuation = word.match(/[.,!?;:'"]+$/);
        const cleanWord = word.replace(/[.,!?;:'"]+$/, '');
        
        // Find best correction
        const corrected = findBestCorrection(cleanWord);
        
        // Reattach punctuation
        return corrected + (punctuation ? punctuation[0] : '');
    });
    
    correctedText = correctedWords.join(' ');
    
    // Apply contextual corrections
    OCR_ERROR_PATTERNS.contextualCorrections.forEach(({ pattern, replacement }) => {
        correctedText = correctedText.replace(pattern, replacement);
    });
    
    // Fix spacing
    correctedText = fixSpacing(correctedText);
    
    // Restore special formats
    correctedText = restoreSpecialFormats(correctedText, preserved);
    
    // Calculate confidence based on changes made
    const distance = levenshteinDistance(text, correctedText);
    const confidence = Math.max(0.5, 1 - (distance / Math.max(text.length, 1)));
    
    return {
        original: text,
        corrected: correctedText,
        confidence: confidence,
        corrections: distance,
        model: 'enhanced-rule-based'
    };
}

// Specialized corrections for different document types
const documentTypeEnhancements = {
    businessCard: (text) => {
        // Common business card terms
        const businessTerms = {
            'CEO': ['CE0', 'CEQ', 'CBO'],
            'Manager': ['Managor', 'Managar', 'Manger'],
            'Director': ['Directer', 'Direcctor'],
            'Phone': ['Phono', 'Phome'],
            'Mobile': ['Mobilo', 'Moblie'],
            'Email': ['Ernail', 'Bmail', 'Emaii']
        };
        
        let enhanced = text;
        Object.entries(businessTerms).forEach(([correct, errors]) => {
            errors.forEach(error => {
                enhanced = enhanced.replace(new RegExp(`\\b${error}\\b`, 'gi'), correct);
            });
        });
        
        return enhanced;
    },
    
    invoice: (text) => {
        // Common invoice terms
        const invoiceTerms = {
            'Invoice': ['lnvoice', 'Involce'],
            'Total': ['Totai', 'Totel'],
            'Amount': ['Arnount', 'Amoumt'],
            'Payment': ['Payrnent', 'Payrment'],
            'Due': ['Duo', 'Oue'],
            'Date': ['Dato', 'Oate']
        };
        
        let enhanced = text;
        Object.entries(invoiceTerms).forEach(([correct, errors]) => {
            errors.forEach(error => {
                enhanced = enhanced.replace(new RegExp(`\\b${error}\\b`, 'gi'), correct);
            });
        });
        
        return enhanced;
    },
    
    general: (text) => text
};

// Export functions
module.exports = {
    correctOCRText,
    findBestCorrection,
    preprocessText,
    fixSpacing,
    documentTypeEnhancements,
    OCR_ERROR_PATTERNS
};