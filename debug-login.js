#!/usr/bin/env node

/**
 * Debug Login Issue
 * Quick script to test the login endpoint directly
 */

const express = require('express');
const cors = require('cors');
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3001
  });
});

// Mock login route for testing
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  
  // Mock successful login
  res.json({
    success: true,
    message: 'Mock login successful',
    token: 'mock-jwt-token-12345',
    user: {
      id: 'test-user-123',
      email: req.body.email || 'test@example.com',
      username: 'testuser'
    }
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Debug server running on http://localhost:${PORT}`);
  console.log(`📋 Test endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/test`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
  console.log(`\n🎯 Try logging in with any email/password to test`);
});