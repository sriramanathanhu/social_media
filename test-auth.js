require('dotenv').config();
const jwt = require('jsonwebtoken');

// Test JWT creation and verification
const testPayload = { userId: 1 };
const secret = process.env.JWT_SECRET;

console.log('JWT_SECRET:', secret ? 'present' : 'missing');
console.log('JWT_SECRET length:', secret?.length || 0);

try {
  // Create token
  const token = jwt.sign(testPayload, secret, { expiresIn: '24h' });
  console.log('Created token:', token);
  
  // Verify token
  const decoded = jwt.verify(token, secret);
  console.log('Decoded payload:', decoded);
  
  // Test the actual token from login
  const actualToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc1MjI3NTY4MSwiZXhwIjoxNzUyMzYyMDgxfQ.CR1g5ULX3vZLe9EPBp8Yf5aEEAlpoou1DGW_h1GzHA';
  console.log('\nTesting actual token...');
  const actualDecoded = jwt.verify(actualToken, secret);
  console.log('Actual token decoded:', actualDecoded);
  
} catch (error) {
  console.error('JWT Error:', error.message);
}