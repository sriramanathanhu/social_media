// Comprehensive monitoring utilities
const { cache } = require('../config/redis');

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
    this.thresholds = {
      responseTime: 1000, // 1 second
      errorRate: 0.05, // 5%
      memoryUsage: 0.8, // 80%
      cacheHitRate: 0.7 // 70%
    };
  }

  // Record API response metrics
  recordApiMetric(endpoint, method, duration, status, cacheHit = false) {
    const key = `${method}:${endpoint}`;
    const now = Date.now();
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        totalRequests: 0,
        totalDuration: 0,
        errors: 0,
        cacheHits: 0,
        lastRequest: now,
        samples: []
      });
    }

    const metric = this.metrics.get(key);
    metric.totalRequests++;
    metric.totalDuration += duration;
    metric.lastRequest = now;
    
    if (cacheHit) {
      metric.cacheHits++;
    }
    
    if (status >= 400) {
      metric.errors++;
    }

    // Keep last 100 samples for detailed analysis
    metric.samples.push({
      timestamp: now,
      duration,
      status,
      cacheHit
    });
    
    if (metric.samples.length > 100) {
      metric.samples.shift();
    }

    // Check for performance alerts
    this.checkPerformanceThresholds(key, metric, duration, status);
  }

  // Check if metrics exceed thresholds
  checkPerformanceThresholds(endpoint, metric, duration, status) {
    const avgResponseTime = metric.totalDuration / metric.totalRequests;
    const errorRate = metric.errors / metric.totalRequests;
    const cacheHitRate = metric.cacheHits / metric.totalRequests;

    if (avgResponseTime > this.thresholds.responseTime) {
      this.addAlert('high_response_time', {
        endpoint,
        value: avgResponseTime,
        threshold: this.thresholds.responseTime
      });
    }

    if (errorRate > this.thresholds.errorRate) {
      this.addAlert('high_error_rate', {
        endpoint,
        value: errorRate,
        threshold: this.thresholds.errorRate
      });
    }

    if (cacheHitRate < this.thresholds.cacheHitRate && metric.totalRequests > 10) {
      this.addAlert('low_cache_hit_rate', {
        endpoint,
        value: cacheHitRate,
        threshold: this.thresholds.cacheHitRate
      });
    }
  }

  // Add performance alert
  addAlert(type, data) {
    const alert = {
      id: Date.now(),
      type,
      timestamp: new Date().toISOString(),
      data,
      resolved: false
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    console.warn(`⚠️  Performance Alert [${type}]:`, data);
  }

  // Get performance summary
  getPerformanceSummary() {
    const summary = {
      endpoints: {},
      systemHealth: this.getSystemHealth(),
      activeAlerts: this.alerts.filter(a => !a.resolved),
      lastUpdated: new Date().toISOString()
    };

    for (const [endpoint, metric] of this.metrics.entries()) {
      summary.endpoints[endpoint] = {
        totalRequests: metric.totalRequests,
        averageResponseTime: Math.round(metric.totalDuration / metric.totalRequests),
        errorRate: (metric.errors / metric.totalRequests * 100).toFixed(2) + '%',
        cacheHitRate: (metric.cacheHits / metric.totalRequests * 100).toFixed(2) + '%',
        lastRequest: new Date(metric.lastRequest).toISOString()
      };
    }

    return summary;
  }

  // Get system health metrics
  getSystemHealth() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
        usage: (memUsage.heapUsed / memUsage.heapTotal * 100).toFixed(2) + '%'
      },
      uptime: {
        seconds: Math.round(uptime),
        formatted: this.formatUptime(uptime)
      },
      pid: process.pid,
      nodeVersion: process.version
    };
  }

  // Format uptime in human readable format
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }

  // Clear old metrics (run periodically)
  cleanupMetrics() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [endpoint, metric] of this.metrics.entries()) {
      if (metric.lastRequest < oneHourAgo) {
        this.metrics.delete(endpoint);
      }
    }

    // Resolve old alerts
    this.alerts.forEach(alert => {
      const alertAge = Date.now() - new Date(alert.timestamp).getTime();
      if (alertAge > 30 * 60 * 1000) { // 30 minutes
        alert.resolved = true;
      }
    });
  }

  // Performance middleware
  createMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const originalSend = res.send;
      const originalJson = res.json;
      
      // Track cache hits from headers
      let cacheHit = false;
      const originalSetHeader = res.set;
      res.set = function(field, val) {
        if (field === 'X-Cache' && val === 'HIT') {
          cacheHit = true;
        }
        return originalSetHeader.call(this, field, val);
      };

      // Override response methods to capture metrics
      const captureMetrics = () => {
        const duration = Date.now() - startTime;
        const endpoint = req.route ? req.route.path : req.path;
        this.recordApiMetric(endpoint, req.method, duration, res.statusCode, cacheHit);
      };

      res.send = function(data) {
        captureMetrics();
        return originalSend.call(this, data);
      };

      res.json = function(data) {
        captureMetrics();
        return originalJson.call(this, data);
      };

      next();
    };
  }
}

// Database monitoring utilities
class DatabaseMonitor {
  constructor() {
    this.queries = [];
    this.slowQueryThreshold = 1000; // 1 second
  }

  // Record database query performance
  recordQuery(query, duration, params = null) {
    const queryMetric = {
      timestamp: Date.now(),
      query: this.sanitizeQuery(query),
      duration,
      params: params ? JSON.stringify(params) : null,
      slow: duration > this.slowQueryThreshold
    };

    this.queries.push(queryMetric);
    
    // Keep only last 1000 queries
    if (this.queries.length > 1000) {
      this.queries.shift();
    }

    if (queryMetric.slow) {
      console.warn(`🐌 Slow Query (${duration}ms):`, query);
    }
  }

  // Sanitize query for logging (remove sensitive data)
  sanitizeQuery(query) {
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='***'");
  }

  // Get query performance summary
  getQuerySummary() {
    const recentQueries = this.queries.filter(q => 
      Date.now() - q.timestamp < 60 * 60 * 1000 // Last hour
    );

    const slowQueries = recentQueries.filter(q => q.slow);
    const totalDuration = recentQueries.reduce((sum, q) => sum + q.duration, 0);
    const avgDuration = recentQueries.length > 0 ? totalDuration / recentQueries.length : 0;

    return {
      totalQueries: recentQueries.length,
      slowQueries: slowQueries.length,
      averageQueryTime: Math.round(avgDuration) + 'ms',
      slowQueryThreshold: this.slowQueryThreshold + 'ms',
      recentSlowQueries: slowQueries.slice(-10).map(q => ({
        query: q.query.substring(0, 100) + (q.query.length > 100 ? '...' : ''),
        duration: q.duration + 'ms',
        timestamp: new Date(q.timestamp).toISOString()
      }))
    };
  }
}

// Redis monitoring utilities
class RedisMonitor {
  constructor() {
    this.operations = [];
  }

  // Record Redis operation
  recordOperation(operation, key, duration, hit = null) {
    const opMetric = {
      timestamp: Date.now(),
      operation,
      key: key ? key.substring(0, 50) : null, // Truncate long keys
      duration,
      hit
    };

    this.operations.push(opMetric);
    
    // Keep only last 1000 operations
    if (this.operations.length > 1000) {
      this.operations.shift();
    }
  }

  // Get Redis performance summary
  async getRedisSummary() {
    const recentOps = this.operations.filter(op => 
      Date.now() - op.timestamp < 60 * 60 * 1000 // Last hour
    );

    const getOps = recentOps.filter(op => op.operation === 'get');
    const setOps = recentOps.filter(op => op.operation === 'set');
    const hits = getOps.filter(op => op.hit === true);
    const misses = getOps.filter(op => op.hit === false);

    // Get Redis info if available
    let redisInfo = null;
    try {
      const stats = await cache.getStats();
      redisInfo = stats;
    } catch (error) {
      console.error('Failed to get Redis stats:', error);
    }

    return {
      operations: {
        total: recentOps.length,
        gets: getOps.length,
        sets: setOps.length,
        hitRate: getOps.length > 0 ? ((hits.length / getOps.length) * 100).toFixed(2) + '%' : 'N/A'
      },
      performance: {
        avgGetTime: getOps.length > 0 ? Math.round(getOps.reduce((sum, op) => sum + op.duration, 0) / getOps.length) + 'ms' : 'N/A',
        avgSetTime: setOps.length > 0 ? Math.round(setOps.reduce((sum, op) => sum + op.duration, 0) / setOps.length) + 'ms' : 'N/A'
      },
      redisInfo
    };
  }
}

// Create global monitor instances
const performanceMonitor = new PerformanceMonitor();
const databaseMonitor = new DatabaseMonitor();
const redisMonitor = new RedisMonitor();

// Cleanup old metrics every hour
setInterval(() => {
  performanceMonitor.cleanupMetrics();
}, 60 * 60 * 1000);

module.exports = {
  performanceMonitor,
  databaseMonitor,
  redisMonitor,
  PerformanceMonitor,
  DatabaseMonitor,
  RedisMonitor
};