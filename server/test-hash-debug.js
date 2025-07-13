const crypto = require('crypto');

// Debug hash generation step by step
function debugNimbleAuth() {
  const token = 'NmB7K9mX2vQ8pL4wR6tY1zE5nA3cS0uI9fH8jG2bV7xM4qW6eD1rT5yU3oP9kL2sA8cV0nB6mX4wQ7pR1tY5zE';
  const salt = 123456; // Fixed salt for debugging
  
  console.log('=== Debug Hash Generation ===');
  console.log('Token:', token);
  console.log('Salt:', salt);
  
  // Step 1: Create string to hash
  const str2hash = `${salt}/${token}`;
  console.log('String to hash:', str2hash);
  
  // Step 2: Generate MD5 hash (raw binary)
  const md5hash = crypto.createHash('md5').update(str2hash).digest();
  console.log('MD5 hash (hex):', md5hash.toString('hex'));
  console.log('MD5 hash (binary length):', md5hash.length);
  
  // Step 3: Base64 encode
  const base64hash = Buffer.from(md5hash).toString('base64');
  console.log('Base64 hash:', base64hash);
  
  // Step 4: URL encode
  const urlEncoded = encodeURIComponent(base64hash);
  console.log('URL encoded:', urlEncoded);
  
  // Test URL
  const testUrl = `http://37.27.201.26:8082/manage/server_status?salt=${salt}&hash=${urlEncoded}`;
  console.log('\nTest URL:', testUrl);
  
  return { salt, hash: base64hash };
}

debugNimbleAuth();