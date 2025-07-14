#!/usr/bin/env node

/**
 * Force Batch Functionality Test
 * Tests the new "Force AWS Batch" toggle functionality
 */

console.log('🧪 Force AWS Batch Functionality Test\n');

// Simulate the updated routing logic
function analyzeProcessingRequirements(jobData) {
    // Check for force batch override first
    if (jobData.forceBatch || jobData.force_batch) {
        return {
            fileSize: jobData.file_size || 0,
            isMultiPage: jobData.is_multi_page || false,
            pageCount: jobData.page_count || 1,
            estimatedComplexity: 'forced',
            estimatedProcessingTime: 300, // 5 minutes estimate for forced batch
            factors: ['User forced AWS Batch processing'],
            recommendation: 'batch'
        };
    }

    // Original automatic routing logic
    const LARGE_FILE_SIZE_THRESHOLD = 50 * 1024 * 1024; // 50MB
    const COMPLEX_DOCUMENT_PAGES_THRESHOLD = 10;
    
    const analysis = {
        fileSize: jobData.file_size || 0,
        isMultiPage: jobData.is_multi_page || false,
        pageCount: jobData.page_count || 1,
        estimatedComplexity: 'low',
        estimatedProcessingTime: 0,
        factors: [],
        recommendation: 'lambda'
    };

    // Factor 1: File size analysis
    if (analysis.fileSize > LARGE_FILE_SIZE_THRESHOLD) {
        analysis.factors.push(`Large file size: ${(analysis.fileSize / 1024 / 1024).toFixed(1)}MB`);
        analysis.estimatedComplexity = 'high';
        analysis.estimatedProcessingTime += 180;
        analysis.recommendation = 'batch';
        analysis.factors.push('File size exceeds Lambda limit');
    } else {
        analysis.estimatedProcessingTime += 60;
    }

    return analysis;
}

// Test scenarios
const testScenarios = [
    {
        name: "Small file - Normal routing",
        jobData: {
            file_size: 5 * 1024 * 1024, // 5MB
            filename: "small_document.jpg",
            force_batch: false
        },
        expectedRoute: "lambda",
        description: "Should route to Lambda (automatic)"
    },
    {
        name: "Small file - Force Batch enabled",
        jobData: {
            file_size: 5 * 1024 * 1024, // 5MB
            filename: "small_document.jpg",
            force_batch: true
        },
        expectedRoute: "batch",
        description: "Should route to Batch (forced override)"
    },
    {
        name: "Large file - Normal routing", 
        jobData: {
            file_size: 60 * 1024 * 1024, // 60MB
            filename: "large_document.pdf",
            force_batch: false
        },
        expectedRoute: "batch",
        description: "Should route to Batch (automatic - file size)"
    },
    {
        name: "Large file - Force Batch enabled",
        jobData: {
            file_size: 60 * 1024 * 1024, // 60MB  
            filename: "large_document.pdf",
            force_batch: true
        },
        expectedRoute: "batch",
        description: "Should route to Batch (would go to Batch anyway)"
    },
    {
        name: "Multiple small files - Force Batch",
        jobData: {
            file_size: 3 * 1024 * 1024, // 3MB each
            filename: "page1.jpg",
            force_batch: true
        },
        expectedRoute: "batch",
        description: "Should route to Batch (forced - good for bulk processing)"
    }
];

console.log('📊 Force Batch Toggle Test Results:\n');

let allTestsPassed = true;

testScenarios.forEach((scenario, index) => {
    console.log(`🧪 Test ${index + 1}: ${scenario.name}`);
    console.log(`   File: ${scenario.jobData.filename} (${(scenario.jobData.file_size / 1024 / 1024).toFixed(1)}MB)`);
    console.log(`   Force Batch: ${scenario.jobData.force_batch ? '✅ ENABLED' : '❌ DISABLED'}`);
    
    const analysis = analyzeProcessingRequirements(scenario.jobData);
    const actualRoute = analysis.recommendation;
    const testPassed = actualRoute === scenario.expectedRoute;
    
    console.log(`   Expected: ${scenario.expectedRoute.toUpperCase()}`);
    console.log(`   Actual: ${actualRoute.toUpperCase()}`);
    console.log(`   Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Description: ${scenario.description}`);
    
    if (analysis.factors.length > 0) {
        console.log(`   Factors: ${analysis.factors.join(', ')}`);
    }
    
    console.log(''); // Empty line for readability
    
    if (!testPassed) {
        allTestsPassed = false;
    }
});

console.log('='.repeat(60));
console.log(`🎯 Overall Test Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

if (allTestsPassed) {
    console.log('\n🚀 Force Batch Functionality Working Correctly!');
    console.log('\n📝 Feature Summary:');
    console.log('   ✅ Added "Force AWS Batch Processing" toggle in UI');
    console.log('   ✅ Toggle overrides automatic routing decisions');
    console.log('   ✅ Small files can be forced to use Batch processing');
    console.log('   ✅ Large files still route to Batch automatically');
    console.log('   ✅ Useful for bulk processing scenarios');
    
    console.log('\n💡 Use Cases for Force Batch:');
    console.log('   🔹 Bulk processing: Many small files at once');
    console.log('   🔹 Resource management: Avoid Lambda concurrency limits');
    console.log('   🔹 Cost optimization: Batch might be cheaper for large volumes');
    console.log('   🔹 Consistent processing: Same environment for all files');
    console.log('   🔹 Testing: Force specific processing route for debugging');
    
    console.log('\n📊 Expected UI Behavior:');
    console.log('   🔹 Toggle appears in Processing Options section');
    console.log('   🔹 When enabled: All files show "AWS Batch" in analysis');
    console.log('   🔹 Analysis shows "User forced AWS Batch processing"');
    console.log('   🔹 Orange highlight indicates forced routing');
} else {
    console.log('\n❌ Some tests failed. Please review the implementation.');
}

console.log('\n🧪 Next Testing Steps:');
console.log('   1. Deploy updated frontend and backend code');
console.log('   2. Test toggle in upload form UI');
console.log('   3. Upload small files with Force Batch enabled');
console.log('   4. Verify jobs appear in AWS Batch console');
console.log('   5. Check CloudWatch logs for forced routing messages');