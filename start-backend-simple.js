#!/usr/bin/env node

/**
 * Simple backend server without Nimble integration for testing login
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hinduismnow@localhost:5432/social_media_scheduler'
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://sriramanathanhu.github.io'],
  credentials: true
}));
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.email.split('@')[0]
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mock live streaming endpoints
app.get('/api/live', (req, res) => {
  console.log('Fetching streams for user');
  
  // Mock empty streams response
  res.json({
    success: true,
    streams: []
  });
});

app.get('/api/live/sessions/active', (req, res) => {
  console.log('Fetching active sessions');
  
  // Mock empty sessions response
  res.json({
    success: true,
    sessions: []
  });
});

app.post('/api/live', (req, res) => {
  console.log('Creating stream:', req.body);
  
  // Mock stream creation
  const mockStream = {
    id: 'mock-stream-' + Date.now(),
    title: req.body.title || 'Mock Stream',
    description: req.body.description || '',
    stream_key: Math.random().toString(36).substr(2, 16),
    rtmp_url: 'rtmp://localhost:1935/live',
    status: 'inactive',
    created_at: new Date().toISOString(),
    auto_post_enabled: req.body.autoPostEnabled || false,
    auto_post_accounts: req.body.autoPostAccounts || [],
    stats: {
      session_count: 0,
      total_duration: 0,
      max_viewers: 0,
      total_viewers: 0
    },
    republishing_count: 0,
    active_republishing: 0
  };
  
  res.status(201).json({
    success: true,
    stream: mockStream
  });
});

app.get('/api/live/:id/rtmp-info', (req, res) => {
  const { id } = req.params;
  console.log('Getting RTMP info for stream:', id);
  
  // Mock RTMP info
  res.json({
    success: true,
    rtmp_info: {
      server: 'rtmp://localhost:1935/live',
      stream_key: 'mock-key-' + Math.random().toString(36).substr(2, 16),
      full_url: 'rtmp://localhost:1935/live/mock-key-' + Math.random().toString(36).substr(2, 16),
      obs_settings: {
        server: 'rtmp://localhost:1935/live',
        stream_key: 'mock-key-' + Math.random().toString(36).substr(2, 16)
      }
    }
  });
});

app.get('/api/live/nimble/status', (req, res) => {
  console.log('Getting Nimble status');
  
  // Mock Nimble status
  res.json({
    success: true,
    status: {
      isMonitoring: false,
      nimbleStatsURL: 'http://localhost:8082',
      intervalMs: null
    }
  });
});

app.get('/api/live/nimble/config', (req, res) => {
  console.log('Getting Nimble config');
  
  // Mock Nimble config
  res.json({
    success: true,
    config: null
  });
});

app.post('/api/live/nimble/config/update', (req, res) => {
  console.log('Updating Nimble config');
  
  // Mock config update
  res.json({
    success: true,
    message: 'Configuration updated successfully (mock)'
  });
});

// Register route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }
    
    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.rows[0].id, email: newUser.rows[0].email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      token,
      user: newUser.rows[0]
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple backend running on http://localhost:${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   GET  /api/test`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/register`);
  console.log(`\n✅ Ready for login testing!`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down server...');
  pool.end(() => {
    console.log('✅ Database connections closed');
    process.exit(0);
  });
});