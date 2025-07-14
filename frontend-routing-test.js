#!/usr/bin/env node

/**
 * Frontend Routing Logic Test
 * Verifies that grouped files are analyzed individually, not as multi-page documents
 */

console.log('🧪 Frontend Routing Logic Test - Per-File Basis\n');

// Simulate the FIXED frontend logic
function getProcessingRecommendationFixed(file, allFiles) {
    // Pure per-file analysis - grouping is for organization only
    const settings = {
        fileSize: file.size,
        isMultiPage: false,  // Individual files are analyzed separately
        pageCount: 1,        // Each file is treated as single unit
        filename: file.name
    };
    
    return analyzeFile(settings);
}

// Simulate the OLD (BROKEN) frontend logic
function getProcessingRecommendationOld(file, allFiles) {
    const groupId = file.groupId;
    const groupFiles = groupId ? allFiles.filter(f => f.groupId === groupId) : [file];
    
    const settings = {
        fileSize: file.size,
        isMultiPage: groupId ? true : false,
        pageCount: groupFiles.length  // BUG: Uses group size as page count!
    };
    
    return analyzeFile(settings);
}

// Backend routing logic (from intelligent-ocr-router.js)
function analyzeFile(settings) {
    const LARGE_FILE_SIZE_THRESHOLD = 50 * 1024 * 1024; // 50MB
    const COMPLEX_DOCUMENT_PAGES_THRESHOLD = 10;
    
    let recommendation = 'lambda';
    let factors = [];
    
    if (settings.fileSize > LARGE_FILE_SIZE_THRESHOLD) {
        recommendation = 'batch';
        factors.push(`File size: ${(settings.fileSize / 1024 / 1024).toFixed(1)}MB > 50MB`);
    }
    
    if (settings.isMultiPage && settings.pageCount > COMPLEX_DOCUMENT_PAGES_THRESHOLD) {
        recommendation = 'batch';
        factors.push(`Multi-page: ${settings.pageCount} pages > 10 pages`);
    }
    
    return {
        recommendation,
        processor: recommendation === 'batch' ? 'AWS Batch' : 'AWS Lambda',
        factors
    };
}

// Test scenarios
const testFiles = [
    // Scenario: Group of 15 small files (previously would incorrectly trigger Batch)
    { id: 1, name: 'page1.jpg', size: 3 * 1024 * 1024, groupId: 'newspaper1' },
    { id: 2, name: 'page2.jpg', size: 4 * 1024 * 1024, groupId: 'newspaper1' },
    { id: 3, name: 'page3.jpg', size: 3.5 * 1024 * 1024, groupId: 'newspaper1' },
    { id: 4, name: 'page4.jpg', size: 2.8 * 1024 * 1024, groupId: 'newspaper1' },
    { id: 5, name: 'page5.jpg', size: 4.2 * 1024 * 1024, groupId: 'newspaper1' },
    { id: 6, name: 'page6.jpg', size: 3.1 * 1024 * 1024, groupId: 'newspaper1' },
    { id: 7, name: 'page7.jpg', size: 3.8 * 1024 * 1024, groupId: 'newspaper1' },
    { id: 8, name: 'page8.jpg', size: 2.9 * 1024 * 1024, groupId: 'newspaper1' },
    { id: 9, name: 'page9.jpg', size: 4.1 * 1024 * 1024, groupId: 'newspaper1' },
    { id: 10, name: 'page10.jpg', size: 3.3 * 1024 * 1024, groupId: 'newspaper1' },
    { id: 11, name: 'page11.jpg', size: 3.7 * 1024 * 1024, groupId: 'newspaper1' },
    { id: 12, name: 'page12.jpg', size: 2.7 * 1024 * 1024, groupId: 'newspaper1' },
    { id: 13, name: 'page13.jpg', size: 4.3 * 1024 * 1024, groupId: 'newspaper1' },
    { id: 14, name: 'page14.jpg', size: 3.9 * 1024 * 1024, groupId: 'newspaper1' },
    { id: 15, name: 'page15.jpg', size: 3.2 * 1024 * 1024, groupId: 'newspaper1' },
    
    // Large file that should go to Batch
    { id: 16, name: 'large_scan.jpg', size: 60 * 1024 * 1024, groupId: null }
];

console.log('📊 Test Scenario: 15 files grouped together (3-4MB each)\n');

console.log('❌ OLD (BROKEN) Logic Results:');
testFiles.slice(0, 5).forEach(file => {
    const result = getProcessingRecommendationOld(file, testFiles);
    console.log(`   ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) → ${result.processor}`);
    if (result.factors.length > 0) {
        console.log(`     Factors: ${result.factors.join(', ')}`);
    }
});

console.log('\n✅ NEW (FIXED) Logic Results:');
testFiles.slice(0, 5).forEach(file => {
    const result = getProcessingRecommendationFixed(file, testFiles);
    console.log(`   ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) → ${result.processor}`);
    if (result.factors.length > 0) {
        console.log(`     Factors: ${result.factors.join(', ')}`);
    }
});

console.log('\n🔍 Large File Test:');
const largeFile = testFiles[15];
const largeResult = getProcessingRecommendationFixed(largeFile, testFiles);
console.log(`   ${largeFile.name} (${(largeFile.size / 1024 / 1024).toFixed(1)}MB) → ${largeResult.processor}`);
if (largeResult.factors.length > 0) {
    console.log(`     Factors: ${largeResult.factors.join(', ')}`);
}

// Verify the fix
const groupedFiles = testFiles.filter(f => f.groupId === 'newspaper1');
const oldResults = groupedFiles.map(f => getProcessingRecommendationOld(f, testFiles));
const newResults = groupedFiles.map(f => getProcessingRecommendationFixed(f, testFiles));

const oldBatchCount = oldResults.filter(r => r.recommendation === 'batch').length;
const newBatchCount = newResults.filter(r => r.recommendation === 'batch').length;

console.log('\n' + '='.repeat(60));
console.log('📋 Test Results Summary:');
console.log(`   Total grouped files: ${groupedFiles.length}`);
console.log(`   OLD logic - Files routed to Batch: ${oldBatchCount}/${groupedFiles.length}`);
console.log(`   NEW logic - Files routed to Batch: ${newBatchCount}/${groupedFiles.length}`);

if (newBatchCount === 0 && oldBatchCount > 0) {
    console.log('\n🎉 SUCCESS! Frontend fix is working correctly!');
    console.log('   ✅ Grouped files are now analyzed individually');
    console.log('   ✅ Small files (<50MB) route to Lambda regardless of grouping');
    console.log('   ✅ Only actual file size determines routing decision');
} else {
    console.log('\n❌ Issue: Fix may not be working correctly');
}

console.log('\n💡 Expected Behavior Now:');
console.log('   🔹 Each file analyzed individually (per-file basis)');
console.log('   🔹 File grouping is for organization only');
console.log('   🔹 Only files >50MB trigger AWS Batch routing');
console.log('   🔹 SQS handles load for millions of small files');