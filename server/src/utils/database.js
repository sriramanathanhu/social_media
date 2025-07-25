// Database scaling and optimization utilities
const { Pool } = require('pg');
const { databaseMonitor } = require('./monitoring');
const { cache } = require('../config/redis');

class DatabaseScalingUtils {
  constructor() {
    // Connection pool configuration for optimal performance
    this.connectionPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DB_POOL_MAX) || 20, // Maximum connections
      min: parseInt(process.env.DB_POOL_MIN) || 5,  // Minimum connections
      idle: parseInt(process.env.DB_IDLE_TIMEOUT) || 10000, // 10 seconds
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000, // 30 seconds
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 60000, // 60 seconds
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Connection pool event handlers
    this.connectionPool.on('connect', (client) => {
      console.log('📊 Database client connected');
    });

    this.connectionPool.on('error', (err, client) => {
      console.error('❌ Database client error:', err);
    });

    this.connectionPool.on('remove', (client) => {
      console.log('📊 Database client removed');
    });

    // Query analysis and optimization
    this.queryCache = new Map();
    this.performanceThresholds = {
      slowQuery: 1000, // 1 second
      verySlowQuery: 5000, // 5 seconds
      maxCachedQueries: 1000
    };
  }

  // Enhanced query execution with monitoring and caching
  async executeQuery(text, params = [], options = {}) {
    const startTime = Date.now();
    const queryKey = this.generateQueryKey(text, params);
    
    try {
      // Check cache for read-only queries
      if (options.cache && this.isReadOnlyQuery(text)) {
        const cached = await this.getCachedQuery(queryKey);
        if (cached) {
          databaseMonitor.recordQuery(text, Date.now() - startTime, params);
          return cached;
        }
      }

      // Execute query with connection pool
      const client = await this.connectionPool.connect();
      let result;
      
      try {
        result = await client.query(text, params);
        
        // Cache successful read-only queries
        if (options.cache && this.isReadOnlyQuery(text) && result.rows) {
          await this.setCachedQuery(queryKey, result, options.cacheTtl || 300);
        }
        
      } finally {
        client.release();
      }

      const duration = Date.now() - startTime;
      
      // Record query performance
      databaseMonitor.recordQuery(text, duration, params);
      
      // Log slow queries with analysis
      if (duration > this.performanceThresholds.slowQuery) {
        console.warn(`🐌 Slow query detected (${duration}ms):`, {
          query: text.substring(0, 100),
          params: params ? params.length : 0,
          duration
        });
        
        if (duration > this.performanceThresholds.verySlowQuery) {
          console.error(`🚨 Very slow query (${duration}ms):`, {
            query: text,
            params,
            duration,
            suggestions: this.analyzeSqlPerformance(text)
          });
        }
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      databaseMonitor.recordQuery(text, duration, params);
      
      console.error('❌ Database query error:', {
        query: text.substring(0, 100),
        params,
        error: error.message,
        duration
      });
      
      throw error;
    }
  }

  // Generate consistent cache key for queries
  generateQueryKey(text, params) {
    const normalizedQuery = text.replace(/\s+/g, ' ').trim().toLowerCase();
    const paramString = params ? JSON.stringify(params) : '';
    return `query:${Buffer.from(normalizedQuery + paramString).toString('base64').substring(0, 64)}`;
  }

  // Check if query is read-only (safe to cache)
  isReadOnlyQuery(sql) {
    const readOnlyPatterns = /^\s*(select|with|show|describe|explain)/i;
    const writePatterns = /\b(insert|update|delete|create|drop|alter|truncate)\b/i;
    return readOnlyPatterns.test(sql) && !writePatterns.test(sql);
  }

  // Cache query results
  async setCachedQuery(key, result, ttl = 300) {
    try {
      const cacheData = {
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
        cached: true,
        cachedAt: new Date().toISOString()
      };
      await cache.set(key, cacheData, ttl);
    } catch (error) {
      console.error('Failed to cache query result:', error);
    }
  }

  // Retrieve cached query results
  async getCachedQuery(key) {
    try {
      return await cache.get(key);
    } catch (error) {
      console.error('Failed to retrieve cached query:', error);
      return null;
    }
  }

  // Analyze SQL for performance suggestions
  analyzeSqlPerformance(sql) {
    const suggestions = [];
    const sqlLower = sql.toLowerCase();

    // Check for missing WHERE clauses
    if (sqlLower.includes('select') && !sqlLower.includes('where') && !sqlLower.includes('limit')) {
      suggestions.push('Consider adding WHERE clause to limit result set');
    }

    // Check for SELECT *
    if (sqlLower.includes('select *')) {
      suggestions.push('Avoid SELECT *, specify needed columns');
    }

    // Check for missing LIMIT on large tables
    if (sqlLower.includes('select') && !sqlLower.includes('limit') && 
        (sqlLower.includes('posts') || sqlLower.includes('users') || sqlLower.includes('social_accounts'))) {
      suggestions.push('Consider adding LIMIT for large tables');
    }

    // Check for N+1 queries pattern
    if (sqlLower.includes('where') && sqlLower.includes('in (')) {
      suggestions.push('Check for N+1 query pattern, consider JOIN or batch processing');
    }

    // Check for missing indexes (basic heuristics)
    if (sqlLower.includes('where') && !sqlLower.includes('id =')) {
      suggestions.push('Ensure proper indexes exist for WHERE conditions');
    }

    return suggestions;
  }

  // Database health check
  async healthCheck() {
    try {
      const client = await this.connectionPool.connect();
      const start = Date.now();
      
      try {
        await client.query('SELECT 1');
        const responseTime = Date.now() - start;
        
        const poolInfo = {
          totalCount: this.connectionPool.totalCount,
          idleCount: this.connectionPool.idleCount,
          waitingCount: this.connectionPool.waitingCount
        };

        return {
          status: 'healthy',
          responseTime,
          pool: poolInfo,
          timestamp: new Date().toISOString()
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get database statistics
  async getDatabaseStats() {
    try {
      const queries = [
        // Database size
        `SELECT pg_size_pretty(pg_database_size(current_database())) as database_size`,
        
        // Table sizes
        `SELECT 
          schemaname, 
          tablename, 
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
         FROM pg_tables 
         WHERE schemaname = 'public' 
         ORDER BY size_bytes DESC 
         LIMIT 10`,
         
        // Connection stats
        `SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
         FROM pg_stat_activity 
         WHERE datname = current_database()`,
         
        // Index usage
        `SELECT 
          schemaname, 
          tablename, 
          indexname, 
          idx_tup_read, 
          idx_tup_fetch 
         FROM pg_stat_user_indexes 
         ORDER BY idx_tup_read DESC 
         LIMIT 10`
      ];

      const [sizeResult, tablesResult, connectionsResult, indexResult] = await Promise.all(
        queries.map(query => this.executeQuery(query))
      );

      return {
        database: {
          size: sizeResult.rows[0]?.database_size,
          tables: tablesResult.rows,
          connections: connectionsResult.rows[0],
          topIndexes: indexResult.rows
        },
        pool: {
          totalCount: this.connectionPool.totalCount,
          idleCount: this.connectionPool.idleCount,
          waitingCount: this.connectionPool.waitingCount
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Connection pool optimization
  async optimizeConnectionPool() {
    const stats = await this.getDatabaseStats();
    const recommendations = [];

    // Analyze connection pool usage
    const poolUtilization = (this.connectionPool.totalCount - this.connectionPool.idleCount) / this.connectionPool.totalCount;
    
    if (poolUtilization > 0.8) {
      recommendations.push({
        type: 'connection_pool',
        severity: 'warning',
        message: 'High pool utilization detected',
        suggestion: 'Consider increasing max pool size',
        currentMax: this.connectionPool.options.max
      });
    }

    if (this.connectionPool.waitingCount > 0) {
      recommendations.push({
        type: 'connection_pool',
        severity: 'critical',
        message: 'Connections waiting for pool',
        suggestion: 'Immediate pool size increase recommended',
        waitingCount: this.connectionPool.waitingCount
      });
    }

    return {
      stats,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  // Batch operations for better performance
  async batchInsert(table, columns, data, options = {}) {
    if (!data.length) return { rowCount: 0 };

    const batchSize = options.batchSize || 1000;
    const results = [];

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];
      
      batch.forEach((row, index) => {
        const rowPlaceholders = columns.map((_, colIndex) => 
          `$${values.length + colIndex + 1}`
        ).join(', ');
        placeholders.push(`(${rowPlaceholders})`);
        values.push(...columns.map(col => row[col]));
      });

      const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')} ${options.onConflict || ''}`;
      
      try {
        const result = await this.executeQuery(query, values);
        results.push(result);
      } catch (error) {
        console.error(`Batch insert failed for batch ${i / batchSize + 1}:`, error);
        throw error;
      }
    }

    return {
      totalBatches: results.length,
      totalRows: results.reduce((sum, r) => sum + r.rowCount, 0)
    };
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down database connection pool...');
    try {
      await this.connectionPool.end();
      console.log('✅ Database connection pool closed successfully');
    } catch (error) {
      console.error('❌ Error closing database pool:', error);
    }
  }
}

// Create singleton instance
const dbUtils = new DatabaseScalingUtils();

// Helper functions for common database operations
const helpers = {
  // Paginated query helper
  async paginatedQuery(baseQuery, params = [], page = 1, limit = 20, options = {}) {
    const offset = (page - 1) * limit;
    const paginatedQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const paginatedParams = [...params, limit, offset];
    
    const [dataResult, countResult] = await Promise.all([
      dbUtils.executeQuery(paginatedQuery, paginatedParams, options),
      dbUtils.executeQuery(`SELECT COUNT(*) FROM (${baseQuery}) as count_query`, params)
    ]);

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages
      }
    };
  },

  // Cached query helper
  async cachedQuery(query, params = [], ttl = 300) {
    return dbUtils.executeQuery(query, params, { cache: true, cacheTtl: ttl });
  },

  // Transaction helper
  async transaction(callback) {
    const client = await dbUtils.connectionPool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

module.exports = {
  dbUtils,
  helpers,
  DatabaseScalingUtils
};