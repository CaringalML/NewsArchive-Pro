/**
 * Build Script
 * Creates deployment package for Lambda functions
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const distDir = path.join(__dirname, 'dist');

// Clean and create dist directory
if (fs.existsSync(distDir)) {
  console.log('🧹 Cleaning old build artifacts...');
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });
console.log('📁 Created fresh dist directory');

/**
 * Build Lambda deployment package
 */
async function build() {
  const zipPath = path.join(distDir, 'newsarchive-lambda.zip');
  
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      const size = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ newsarchive-lambda.zip created (${size} MB)`);
      resolve();
    });
    
    archive.on('error', reject);
    archive.pipe(output);
    
    // Add source files
    console.log('📦 Adding source files...');
    archive.file('index.js', { name: 'index.js' });
    archive.directory('src', 'src');
    
    // Add package files
    archive.file('package.json', { name: 'package.json' });
    archive.file('package-lock.json', { name: 'package-lock.json' });
    
    // Add node_modules (excluding dev dependencies and unnecessary files)
    const nodeModulesPath = path.join(__dirname, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      console.log('📦 Adding dependencies...');
      archive.directory(nodeModulesPath, 'node_modules', {
        ignore: [
          '**/test/**',
          '**/tests/**', 
          '**/*.test.js',
          '**/*.spec.js',
          '**/docs/**',
          '**/examples/**',
          '**/.*',
          '**/README*',
          '**/CHANGELOG*',
          '**/LICENSE*'
        ]
      });
    } else {
      console.error('❌ node_modules not found! Run npm install first.');
      process.exit(1);
    }
    
    archive.finalize();
  });
}

// Run build
console.log('🔨 Building Lambda deployment package...');
build()
  .then(() => {
    console.log('🎉 Build completed successfully!');
    console.log('📦 Output: dist/newsarchive-lambda.zip');
  })
  .catch(error => {
    console.error('❌ Build failed:', error);
    process.exit(1);
  });