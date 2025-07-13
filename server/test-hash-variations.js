const crypto = require('crypto');

// Test different hash generation methods
function testHashVariations() {
  const token = 'NmB7K9mX2vQ8pL4wR6tY1zE5nA3cS0uI9fH8jG2bV7xM4qW6eD1rT5yU3oP9kL2sA8cV0nB6mX4wQ7pR1tY5zE';
  const salt = 123456;
  
  console.log('=== Testing Hash Variations ===');
  
  // Method 1: salt + "/" + token (current method)
  const str1 = `${salt}/${token}`;
  const hash1 = Buffer.from(crypto.createHash('md5').update(str1).digest()).toString('base64');
  console.log('Method 1 (salt/token):', str1);
  console.log('Hash 1:', hash1);
  
  // Method 2: salt + token (no slash)
  const str2 = `${salt}${token}`;
  const hash2 = Buffer.from(crypto.createHash('md5').update(str2).digest()).toString('base64');
  console.log('Method 2 (salt+token):', str2);
  console.log('Hash 2:', hash2);
  
  // Method 3: token + "/" + salt (reversed)
  const str3 = `${token}/${salt}`;
  const hash3 = Buffer.from(crypto.createHash('md5').update(str3).digest()).toString('base64');
  console.log('Method 3 (token/salt):', str3);
  console.log('Hash 3:', hash3);
  
  // Method 4: Just like the PHP example but double check
  const str4 = salt + "/" + token;
  const hash4 = Buffer.from(crypto.createHash('md5').update(str4).digest()).toString('base64');
  console.log('Method 4 (concatenated):', str4);
  console.log('Hash 4:', hash4);
  
  return [
    { method: 1, hash: hash1 },
    { method: 2, hash: hash2 },
    { method: 3, hash: hash3 },
    { method: 4, hash: hash4 }
  ];
}

const results = testHashVariations();

// Test each variation with curl
console.log('\n=== Testing each variation ===');
results.forEach((result, index) => {
  const encodedHash = encodeURIComponent(result.hash);
  const testUrl = `http://37.27.201.26:8082/manage/server_status?salt=123456&hash=${encodedHash}`;
  console.log(`\nMethod ${result.method}:`);
  console.log(`curl "${testUrl}"`);
});