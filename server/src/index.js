const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Import database configuration (this will initialize tables automatically)
const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
      fontSrc: ["'self'", "https:", "data:"],
      mediaSrc: ["'self'", "https:", "data:"],
      frameSrc: ["'self'", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://socialmedia-p3ln.onrender.com', 'https://socialmedia.ecitizen.media']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(limiter);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

app.get('/', (req, res) => {
  res.json({ 
    message: 'Social Media Scheduler API',
    status: 'running',
    endpoints: ['/health', '/api/auth', '/api/accounts', '/api/posts', '/api/live', '/api/stream-apps', '/api/wordpress', '/api/reddit']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Route imports
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/live', require('./routes/live'));
app.use('/api/stream-apps', require('./routes/streamApps'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/groups', require('./routes/accountGroups'));
app.use('/api/wordpress', require('./routes/wordpress'));
app.use('/api/reddit', require('./routes/reddit'));
app.use('/api/eventbrite', require('./routes/eventbrite'));

// Serve static files
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../../client/build');
  const fs = require('fs');
  
  // Check if build directory exists
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  } else {
    console.warn('Client build directory not found. Frontend will be served separately.');
  }
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Simple server startup - database initialization happens automatically when requiring the config
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});