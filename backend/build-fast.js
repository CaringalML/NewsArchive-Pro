/**
 * Fast build - only essential files for quick deployment
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const distDir = path.join(__dirname, 'dist');

// Clean and create dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

async function buildFast() {
  const zipPath = path.join(distDir, 'newsarchive-lambda.zip');
  
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 1 } }); // Faster compression
    
    output.on('close', () => {
      const size = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ Fast build complete: ${size} MB`);
      resolve();
    });
    
    archive.on('error', reject);
    archive.pipe(output);
    
    // Add essential files only
    console.log('📦 Adding essential files...');
    archive.file('index.js', { name: 'index.js' });
    archive.directory('src', 'src');
    archive.file('package.json', { name: 'package.json' });
    
    // Add only required AWS SDK packages
    const requiredPackages = [
      '@aws-sdk/client-s3',
      '@aws-sdk/client-textract', 
      '@aws-sdk/client-comprehend',
      '@aws-sdk/client-sqs',
      '@aws-sdk/s3-request-presigner',
      '@supabase/supabase-js',
      'uuid'
    ];
    
    console.log('📦 Adding required packages...');
    for (const pkg of requiredPackages) {
      const pkgPath = path.join(__dirname, 'node_modules', pkg);
      if (fs.existsSync(pkgPath)) {
        archive.directory(pkgPath, `node_modules/${pkg}`);
      }
    }
    
    // Add AWS SDK dependencies
    const awsSdkDeps = fs.readdirSync(path.join(__dirname, 'node_modules'))
      .filter(dir => dir.startsWith('@aws-sdk/') || dir.startsWith('@smithy/'))
      .slice(0, 50); // Limit to prevent timeout
      
    for (const dep of awsSdkDeps) {
      const depPath = path.join(__dirname, 'node_modules', dep);
      if (fs.existsSync(depPath)) {
        archive.directory(depPath, `node_modules/${dep}`);
      }
    }
    
    archive.finalize();
  });
}

console.log('🚀 Fast build starting...');
buildFast()
  .then(() => console.log('✅ Ready to deploy!'))
  .catch(error => {
    console.error('❌ Build failed:', error);
    process.exit(1);
  });