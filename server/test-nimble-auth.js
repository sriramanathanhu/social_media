require('dotenv').config();
const crypto = require('crypto');

// Test Nimble authentication method directly
function generateNimbleAuth(token) {
  const salt = Math.floor(Math.random() * 1000000);
  const str2hash = `${salt}/${token}`;
  const md5hash = crypto.createHash('md5').update(str2hash).digest();
  const base64hash = Buffer.from(md5hash).toString('base64');
  
  return {
    salt,
    hash: base64hash
  };
}

async function testNimbleAuth() {
  const token = process.env.NIMBLE_TOKEN || 'NmB7K9mX2vQ8pL4wR6tY1zE5nA3cS0uI9fH8jG2bV7xM4qW6eD1rT5yU3oP9kL2sA8cV0nB6mX4wQ7pR1tY5zE';
  const host = process.env.NIMBLE_HOST || '37.27.201.26';
  const port = process.env.NIMBLE_API_PORT || 8082;
  
  console.log('Testing Nimble authentication...');
  console.log('Token:', token.substring(0, 20) + '...');
  
  // Test with server_status endpoint (basic endpoint)
  const auth = generateNimbleAuth(token);
  const url = `http://${host}:${port}/manage/server_status?salt=${auth.salt}&hash=${encodeURIComponent(auth.hash)}`;
  
  console.log('Testing URL:', `http://${host}:${port}/manage/server_status?salt=${auth.salt}&hash=...`);
  
  try {
    const response = await fetch(url);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
    
    if (response.ok) {
      console.log('✅ Authentication successful!');
      return true;
    } else {
      console.log('❌ Authentication failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return false;
  }
}

testNimbleAuth();