const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increase limit to 500 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://sriramanathanhu.github.io', 'https://socialmedia-p3ln.onrender.com'] 
    : ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: true, // Changed to true to ensure session is created
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Enable secure cookies in production
    httpOnly: false, // Set to false for cross-origin issues
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'none' // Allow cross-site cookies
  }
}));

app.get('/', (req, res) => {
  res.json({ 
    message: 'Social Media Scheduler API',
    status: 'running',
    endpoints: ['/health', '/api/auth', '/api/accounts', '/api/posts', '/api/live', '/api/stream-apps']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/groups', require('./routes/accountGroups'));
app.use('/api/live', require('./routes/liveStreaming'));
app.use('/api/stream-apps', require('./routes/streamApps'));

// Serve static files from the React app build directory
const buildPath = path.join(__dirname, '../../client/build');
const fs = require('fs');

// Check if build directory exists
if (fs.existsSync(buildPath)) {
  app.use('/social_media', express.static(buildPath));
  
  // Handle React routing, return all requests to React app
  app.get('/social_media/*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  console.warn('Client build directory not found. Frontend will not be served.');
  app.get('/social_media/*', (req, res) => {
    res.status(503).json({ 
      error: 'Frontend not available', 
      message: 'Client build not found. Please run npm run build.' 
    });
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});