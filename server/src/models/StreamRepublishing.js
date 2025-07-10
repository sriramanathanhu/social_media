const pool = require('../config/database');

class StreamRepublishing {
  static async create(republishingData) {
    console.log('StreamRepublishing.create called with data:', JSON.stringify(republishingData, null, 2));
    
    // Validate required fields
    if (!republishingData) {
      throw new Error('Republishing data is required');
    }
    
    const {
      streamId,
      userId,
      sourceApp,
      sourceStream,
      destinationName,
      destinationUrl,
      destinationPort = 1935,
      destinationApp,
      destinationStream,
      destinationKey,
      enabled = true,
      priority = 1,
      retryAttempts = 3
    } = republishingData;

    // Validate required fields
    if (!streamId) {
      throw new Error('streamId is required');
    }
    if (!userId) {
      throw new Error('userId is required');
    }
    if (!sourceApp) {
      throw new Error('sourceApp is required');
    }
    if (!sourceStream) {
      throw new Error('sourceStream is required');
    }
    if (!destinationName) {
      throw new Error('destinationName is required');
    }
    if (!destinationUrl) {
      throw new Error('destinationUrl is required');
    }
    if (!destinationApp) {
      throw new Error('destinationApp is required');
    }
    if (!destinationStream) {
      throw new Error('destinationStream is required');
    }

    const result = await pool.query(
      `INSERT INTO stream_republishing 
       (stream_id, user_id, source_app, source_stream, destination_name, 
        destination_url, destination_port, destination_app, destination_stream, 
        destination_key, enabled, priority, retry_attempts) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
       RETURNING id, stream_id, user_id, source_app, source_stream, destination_name,
                 destination_url, destination_port, destination_app, destination_stream,
                 enabled, priority, status, created_at`,
      [streamId, userId, sourceApp, sourceStream, destinationName, destinationUrl,
       destinationPort, destinationApp, destinationStream, destinationKey, 
       enabled, priority, retryAttempts]
    );

    return result.rows[0];
  }

  static async findByStreamId(streamId) {
    console.log('StreamRepublishing.findByStreamId called with streamId:', streamId);
    const result = await pool.query(
      `SELECT id, stream_id, user_id, source_app, source_stream, destination_name,
              destination_url, destination_port, destination_app, destination_stream,
              destination_key, enabled, priority, retry_attempts, status, 
              last_connected_at, last_error, connection_count, created_at, updated_at
       FROM stream_republishing 
       WHERE stream_id = $1 
       ORDER BY priority ASC, created_at ASC`,
      [streamId]
    );

    console.log('findByStreamId result:', result.rows.length, 'rows');
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT id, stream_id, user_id, source_app, source_stream, destination_name,
              destination_url, destination_port, destination_app, destination_stream,
              destination_key, enabled, priority, retry_attempts, status, 
              last_connected_at, last_error, connection_count, created_at, updated_at
       FROM stream_republishing 
       WHERE id = $1`,
      [id]
    );

    return result.rows[0];
  }

  static async findByUserId(userId) {
    console.log('StreamRepublishing.findByUserId called with userId:', userId);
    const result = await pool.query(
      `SELECT sr.id, sr.stream_id, sr.user_id, sr.source_app, sr.source_stream, 
              sr.destination_name, sr.destination_url, sr.destination_port, 
              sr.destination_app, sr.destination_stream, sr.enabled, sr.priority, 
              sr.status, sr.last_connected_at, sr.connection_count, sr.created_at,
              ls.title as stream_title, ls.status as stream_status
       FROM stream_republishing sr
       JOIN live_streams ls ON sr.stream_id = ls.id
       WHERE sr.user_id = $1 
       ORDER BY ls.created_at DESC, sr.priority ASC`,
      [userId]
    );

    console.log('findByUserId result:', result.rows.length, 'rows');
    return result.rows;
  }

  static async updateStatus(id, status, additionalData = {}) {
    const updates = ['status = $2'];
    const values = [id, status];
    let paramIndex = 3;

    if (status === 'active') {
      updates.push(`last_connected_at = CURRENT_TIMESTAMP`);
      updates.push(`connection_count = connection_count + 1`);
    }

    if (status === 'error' && additionalData.error) {
      updates.push(`last_error = $${paramIndex}`);
      values.push(additionalData.error);
      paramIndex++;
    }

    const result = await pool.query(
      `UPDATE stream_republishing 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, status, last_connected_at, connection_count, updated_at`,
      values
    );

    return result.rows[0];
  }

  static async update(id, updateData) {
    const updates = [];
    const values = [id];
    let paramIndex = 2;

    const allowedFields = [
      'source_app', 'source_stream', 'destination_name', 'destination_url',
      'destination_port', 'destination_app', 'destination_stream', 
      'destination_key', 'enabled', 'priority', 'retry_attempts'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(updateData[field]);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    const result = await pool.query(
      `UPDATE stream_republishing 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, destination_name, enabled, priority, updated_at`,
      values
    );

    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM stream_republishing WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rows[0];
  }

  static async getActiveRepublishing(streamId = null) {
    let query = `
      SELECT sr.id, sr.stream_id, sr.source_app, sr.source_stream,
             sr.destination_name, sr.destination_url, sr.destination_port,
             sr.destination_app, sr.destination_stream, sr.destination_key,
             sr.priority, sr.connection_count, ls.title as stream_title
      FROM stream_republishing sr
      JOIN live_streams ls ON sr.stream_id = ls.id
      WHERE sr.enabled = true AND sr.status = 'active'
    `;
    const values = [];

    if (streamId) {
      query += ' AND sr.stream_id = $1';
      values.push(streamId);
    }

    query += ' ORDER BY sr.priority ASC, sr.created_at ASC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async bulkUpdateStatus(streamId, status) {
    const result = await pool.query(
      `UPDATE stream_republishing 
       SET status = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE stream_id = $1 
       RETURNING id, destination_name, status`,
      [streamId, status]
    );

    return result.rows;
  }

  static async getRepublishingStats(streamId) {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_destinations,
         COUNT(*) FILTER (WHERE enabled = true) as enabled_destinations,
         COUNT(*) FILTER (WHERE status = 'active') as active_destinations,
         COUNT(*) FILTER (WHERE status = 'error') as error_destinations,
         SUM(connection_count) as total_connections
       FROM stream_republishing 
       WHERE stream_id = $1`,
      [streamId]
    );

    return result.rows[0] || {
      total_destinations: 0,
      enabled_destinations: 0,
      active_destinations: 0,
      error_destinations: 0,
      total_connections: 0
    };
  }

  // Platform-specific helper methods
  static async createYouTubeRepublishing(streamId, userId, sourceApp, sourceStream, streamKey) {
    return this.create({
      streamId,
      userId,
      sourceApp,
      sourceStream,
      destinationName: 'YouTube Live',
      destinationUrl: 'rtmp://a.rtmp.youtube.com/live2',
      destinationPort: 1935,
      destinationApp: 'live2',
      destinationStream: streamKey,
      destinationKey: streamKey,
      priority: 1
    });
  }

  static async createTwitterRepublishing(streamId, userId, sourceApp, sourceStream, streamKey) {
    return this.create({
      streamId,
      userId,
      sourceApp,
      sourceStream,
      destinationName: 'Twitter/X Live',
      destinationUrl: 'rtmp://ingest.pscp.tv:80/x',
      destinationPort: 80,
      destinationApp: 'x',
      destinationStream: streamKey,
      destinationKey: streamKey,
      priority: 2
    });
  }

  static async createFacebookRepublishing(streamId, userId, sourceApp, sourceStream, streamKey) {
    return this.create({
      streamId,
      userId,
      sourceApp,
      sourceStream,
      destinationName: 'Facebook Live',
      destinationUrl: 'rtmps://live-api-s.facebook.com:443/rtmp',
      destinationPort: 443,
      destinationApp: 'rtmp',
      destinationStream: streamKey,
      destinationKey: streamKey,
      priority: 3
    });
  }
}

module.exports = StreamRepublishing;