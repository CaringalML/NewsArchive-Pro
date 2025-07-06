const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const functions = [
  'get-upload-url',
  'process-document', 
  'ocr-processor',
  'get-processing-status'
];

const distDir = path.join(__dirname, 'dist');

// Clean and create dist directory
if (fs.existsSync(distDir)) {
  console.log('🧹 Cleaning old build artifacts...');
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });
console.log('📁 Created fresh dist directory');

// Build each function
async function buildFunction(functionName) {
  const functionDir = path.join(__dirname, 'functions', functionName);
  const zipPath = path.join(distDir, `${functionName}.zip`);
  
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log(`✅ ${functionName}.zip created (${archive.pointer()} bytes)`);
      resolve();
    });
    
    archive.on('error', reject);
    archive.pipe(output);
    
    // Add function files
    archive.file(path.join(functionDir, 'index.js'), { name: 'index.js' });
    
    // Add package.json and node_modules
    archive.file(path.join(__dirname, 'package.json'), { name: 'package.json' });
    
    // Add node_modules if it exists
    const nodeModulesPath = path.join(__dirname, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      archive.directory(nodeModulesPath, 'node_modules');
    }
    
    archive.finalize();
  });
}

async function buildAll() {
  console.log('🔨 Building Lambda functions...');
  
  try {
    for (const functionName of functions) {
      await buildFunction(functionName);
    }
    console.log('🎉 All functions built successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildAll();