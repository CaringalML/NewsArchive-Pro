#!/usr/bin/env node

/**
 * AWS Batch Debug Test
 * Tests if AWS Batch should be triggered based on current routing logic
 */

const testFiles = [
    {
        filename: "small_newspaper_page1.jpg",
        fileSize: 2 * 1024 * 1024, // 2MB
        isMultiPage: false,
        pageCount: 1
    },
    {
        filename: "large_newspaper_scan.jpg", 
        fileSize: 60 * 1024 * 1024, // 60MB (>50MB threshold)
        isMultiPage: false,
        pageCount: 1
    },
    {
        filename: "complex_newspaper_document.pdf",
        fileSize: 30 * 1024 * 1024, // 30MB
        isMultiPage: true,
        pageCount: 15 // >10 pages threshold
    },
    {
        filename: "newspaper_collection.pdf",
        fileSize: 45 * 1024 * 1024, // 45MB
        isMultiPage: true,
        pageCount: 8
    }
];

// Simulate the routing logic from intelligent-ocr-router.js
function analyzeProcessingRequirements(jobData) {
    const LARGE_FILE_SIZE_THRESHOLD = 50 * 1024 * 1024; // 50MB
    const COMPLEX_DOCUMENT_PAGES_THRESHOLD = 10; // Multi-page docs > 10 pages
    const LAMBDA_TIMEOUT_THRESHOLD = 4.5 * 60 * 1000; // 4.5 minutes in ms

    const analysis = {
        fileSize: jobData.fileSize || 0,
        isMultiPage: jobData.isMultiPage || false,
        pageCount: jobData.pageCount || 1,
        estimatedComplexity: 'low',
        estimatedProcessingTime: 0,
        factors: [],
        recommendation: 'lambda'
    };

    // Factor 1: File size analysis
    if (analysis.fileSize > LARGE_FILE_SIZE_THRESHOLD) {
        analysis.factors.push(`Large file size: ${(analysis.fileSize / 1024 / 1024).toFixed(1)}MB`);
        analysis.estimatedComplexity = 'high';
        analysis.estimatedProcessingTime += 180; // 3 minutes base for large files
    } else {
        analysis.estimatedProcessingTime += 60; // 1 minute base for normal files
    }

    // Factor 2: Multi-page document analysis
    if (analysis.isMultiPage && analysis.pageCount > COMPLEX_DOCUMENT_PAGES_THRESHOLD) {
        analysis.factors.push(`Complex multi-page document: ${analysis.pageCount} pages`);
        analysis.estimatedComplexity = 'high';
        analysis.estimatedProcessingTime += analysis.pageCount * 20; // 20 seconds per page
    }

    // Factor 3: Document type complexity
    const filename = jobData.filename || '';
    if (filename.toLowerCase().includes('newspaper') || 
        filename.toLowerCase().includes('magazine') ||
        filename.toLowerCase().includes('complex')) {
        analysis.factors.push('Complex document type detected');
        analysis.estimatedComplexity = 'medium';
        analysis.estimatedProcessingTime += 90; // Additional 1.5 minutes
    }

    // Make routing decision
    const estimatedTimeMs = analysis.estimatedProcessingTime * 1000;
    
    if (analysis.fileSize > LARGE_FILE_SIZE_THRESHOLD) {
        analysis.recommendation = 'batch';
        analysis.factors.push('File size exceeds Lambda limit');
    } else if (estimatedTimeMs > LAMBDA_TIMEOUT_THRESHOLD) {
        analysis.recommendation = 'batch';
        analysis.factors.push(`Estimated processing time (${analysis.estimatedProcessingTime}s) exceeds Lambda timeout`);
    } else if (analysis.isMultiPage && analysis.pageCount > COMPLEX_DOCUMENT_PAGES_THRESHOLD) {
        analysis.recommendation = 'batch';
        analysis.factors.push('Complex multi-page document better suited for Batch');
    }

    return analysis;
}

console.log('🧪 AWS Batch Routing Logic Test\n');
console.log('Thresholds:');
console.log('- Large file: >50MB');
console.log('- Complex document: >10 pages');
console.log('- Lambda timeout: 4.5 minutes\n');

testFiles.forEach((file, index) => {
    console.log(`\n📄 Test ${index + 1}: ${file.filename}`);
    console.log(`   Size: ${(file.fileSize / 1024 / 1024).toFixed(1)}MB`);
    console.log(`   Pages: ${file.pageCount} ${file.isMultiPage ? '(multi-page)' : '(single-page)'}`);
    
    const analysis = analyzeProcessingRequirements(file);
    
    console.log(`   ⚡ Routing: ${analysis.recommendation.toUpperCase()}`);
    console.log(`   🎯 Processor: ${analysis.recommendation === 'batch' ? 'AWS Batch' : 'AWS Lambda'}`);
    console.log(`   ⏱️  Estimated time: ${analysis.estimatedProcessingTime}s`);
    console.log(`   🔍 Complexity: ${analysis.estimatedComplexity}`);
    
    if (analysis.factors.length > 0) {
        console.log(`   📋 Factors:`);
        analysis.factors.forEach(factor => console.log(`      - ${factor}`));
    }
});

console.log('\n🚨 ISSUE FOUND:');
console.log('Both OCR processor Lambda AND Batch job submitter Lambda are consuming from the same SQS queue!');
console.log('This creates a race condition where the OCR processor consumes messages before Batch routing.');
console.log('\nSOLUTION: The intelligent routing should happen BEFORE putting messages in SQS queues.');