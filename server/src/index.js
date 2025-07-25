const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const compression = require('compression');
const responseTime = require('response-time');
const path = require('path');
require('dotenv').config();

// Redis configuration
const { redis, sessionRedis, cache } = require('./config/redis');
const RedisStore = require('connect-redis').default;

// Monitoring utilities
const { performanceMonitor, databaseMonitor, redisMonitor } = require('./utils/monitoring');
const { dbUtils } = require('./utils/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Performance middleware
app.use(compression()); // Enable gzip compression
app.use(responseTime()); // Add response time headers
app.use(performanceMonitor.createMiddleware()); // Performance monitoring

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increase limit to 500 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  trustProxy: true // Trust proxy headers (important for Caddy)
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://live.ecitizen.media', 'https://socialmedia.ecitizen.media', 'https://socialmedia-p3ln.onrender.com'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration with Redis store
const redisStore = new RedisStore({
  client: sessionRedis,
  prefix: 'sess:',
  ttl: 24 * 60 * 60 // 24 hours in seconds
});

app.use(session({
  store: redisStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false, // Don't save empty sessions
  rolling: true, // Refresh session on activity
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Enable secure cookies in production
    httpOnly: false, // Set to false for cross-origin issues
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Cross-site cookies for production
  }
}));

app.get('/', (req, res) => {
  res.json({ 
    message: 'Social Media Scheduler API',
    status: 'running',
    endpoints: ['/health', '/api/auth', '/api/accounts', '/api/posts', '/api/live', '/api/stream-apps', '/api/wordpress']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Comprehensive monitoring endpoints
app.get('/api/monitoring/health', async (req, res) => {
  try {
    const [performanceSummary, redisSummary, dbSummary] = await Promise.all([
      performanceMonitor.getPerformanceSummary(),
      redisMonitor.getRedisSummary(),
      Promise.resolve(databaseMonitor.getQuerySummary())
    ]);

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      performance: performanceSummary,
      redis: redisSummary,
      database: dbSummary,
      system: performanceSummary.systemHealth
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Performance metrics endpoint
app.get('/api/monitoring/performance', (req, res) => {
  try {
    const summary = performanceMonitor.getPerformanceSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get performance metrics',
      message: error.message
    });
  }
});

// Database metrics endpoint
app.get('/api/monitoring/database', async (req, res) => {
  try {
    const [querySummary, healthCheck, dbStats] = await Promise.all([
      Promise.resolve(databaseMonitor.getQuerySummary()),
      dbUtils.healthCheck(),
      dbUtils.getDatabaseStats()
    ]);

    res.json({
      queries: querySummary,
      health: healthCheck,
      statistics: dbStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get database metrics',
      message: error.message
    });
  }
});

// Database optimization endpoint
app.get('/api/monitoring/database/optimize', async (req, res) => {
  try {
    const optimization = await dbUtils.optimizeConnectionPool();
    res.json(optimization);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to analyze database optimization',
      message: error.message
    });
  }
});

// Redis metrics endpoint
app.get('/api/monitoring/redis', async (req, res) => {
  try {
    const summary = await redisMonitor.getRedisSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get Redis metrics',
      message: error.message
    });
  }
});

// Cache status endpoint (legacy compatibility)
app.get('/api/cache/status', async (req, res) => {
  try {
    const stats = await cache.getStats();
    res.json({
      status: 'OK',
      redis: {
        connected: redis.status === 'ready',
        memory: stats?.memory || 'N/A',
        keyspace: stats?.keyspace || 'N/A'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Caching middleware factory
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `route:${req.originalUrl}:${req.user?.id || 'anonymous'}`;
    
    try {
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        res.set('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      // Store original res.json
      const originalJson = res.json;
      res.json = function(data) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, data, ttl).catch(console.error);
        }
        res.set('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Routes with caching
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', cacheMiddleware(600), require('./routes/accounts')); // Cache for 10 minutes
app.use('/api/posts', cacheMiddleware(300), require('./routes/posts')); // Cache for 5 minutes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/groups', cacheMiddleware(900), require('./routes/accountGroups')); // Cache for 15 minutes
app.use('/api/live', require('./routes/liveStreaming')); // No caching for live data
app.use('/api/stream-apps', cacheMiddleware(1800), require('./routes/streamApps')); // Cache for 30 minutes
app.use('/api/wordpress', cacheMiddleware(600), require('./routes/wordpress')); // Cache for 10 minutes

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

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Redis caching: ${redis.status === 'ready' ? 'enabled' : 'disabled'}`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  
  // Close HTTP server
  server.close(async () => {
    console.log('HTTP server closed');
    
    try {
      // Close database connections
      await dbUtils.shutdown();
      
      // Close Redis connections
      redis.disconnect();
      sessionRedis.disconnect();
      console.log('Redis connections closed');
      
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);