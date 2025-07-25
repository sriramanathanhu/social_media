const Redis = require('ioredis');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  family: 4, // IPv4
};

// Create Redis client
const redis = new Redis(redisConfig);

// Redis client for caching
const cacheRedis = new Redis({
  ...redisConfig,
  db: (process.env.REDIS_DB || 0) + 1, // Use different DB for cache
  keyPrefix: 'cache:',
});

// Redis client for sessions
const sessionRedis = new Redis({
  ...redisConfig,
  db: (process.env.REDIS_DB || 0) + 2, // Use different DB for sessions
  keyPrefix: 'sess:',
});

// Redis connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('ready', () => {
  console.log('✅ Redis ready for operations');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redis.on('close', () => {
  console.log('⚠️  Redis connection closed');
});

cacheRedis.on('error', (err) => {
  console.error('❌ Cache Redis error:', err);
});

sessionRedis.on('error', (err) => {
  console.error('❌ Session Redis error:', err);
});

// Cache utility functions
const cache = {
  // Get value from cache
  async get(key) {
    try {
      const value = await cacheRedis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  // Set value in cache with TTL
  async set(key, value, ttl = process.env.CACHE_TTL || 3600) {
    try {
      await cacheRedis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  // Delete value from cache
  async del(key) {
    try {
      await cacheRedis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },

  // Delete values by pattern
  async delPattern(pattern) {
    try {
      const keys = await cacheRedis.keys(pattern);
      if (keys.length > 0) {
        await cacheRedis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  },

  // Check if key exists
  async exists(key) {
    try {
      return await cacheRedis.exists(key);
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  },

  // Get cache statistics
  async getStats() {
    try {
      const info = await cacheRedis.info('memory');
      const keyspace = await cacheRedis.info('keyspace');
      return {
        memory: info,
        keyspace: keyspace,
        connectedClients: await cacheRedis.info('clients'),
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  },
};

// Performance monitoring
const performanceCache = {
  // Cache social media API responses
  async cacheApiResponse(platform, endpoint, params, response, ttl = 300) {
    const key = `api:${platform}:${endpoint}:${JSON.stringify(params)}`;
    return await cache.set(key, response, ttl);
  },

  async getApiResponse(platform, endpoint, params) {
    const key = `api:${platform}:${endpoint}:${JSON.stringify(params)}`;
    return await cache.get(key);
  },

  // Cache user data
  async cacheUser(userId, userData, ttl = 1800) {
    return await cache.set(`user:${userId}`, userData, ttl);
  },

  async getUser(userId) {
    return await cache.get(`user:${userId}`);
  },

  // Cache social accounts
  async cacheSocialAccounts(userId, accounts, ttl = 900) {
    return await cache.set(`accounts:${userId}`, accounts, ttl);
  },

  async getSocialAccounts(userId) {
    return await cache.get(`accounts:${userId}`);
  },

  // Cache posts
  async cachePosts(userId, posts, ttl = 600) {
    return await cache.set(`posts:${userId}`, posts, ttl);
  },

  async getPosts(userId) {
    return await cache.get(`posts:${userId}`);
  },

  // Invalidate user-related cache
  async invalidateUserCache(userId) {
    await cache.delPattern(`user:${userId}*`);
    await cache.delPattern(`accounts:${userId}*`);
    await cache.delPattern(`posts:${userId}*`);
  },
};

module.exports = {
  redis,
  cacheRedis,
  sessionRedis,
  cache,
  performanceCache,
};