const pool = require('../config/database');
const crypto = require('crypto');

class LiveStream {
  static async create(streamData) {
    console.log('LiveStream.create called with data:', JSON.stringify(streamData, null, 2));
    
    // Validate required fields
    if (!streamData) {
      throw new Error('Stream data is required');
    }
    
    const {
      userId,
      title,
      description,
      sourceApp = 'live',
      sourceStream,
      destinations = [],
      qualitySettings = {
        resolution: '1920x1080',
        bitrate: 4000,
        framerate: 30,
        audio_bitrate: 128
      },
      autoPostEnabled = false,
      autoPostAccounts = [],
      autoPostMessage,
      category,
      tags = [],
      isPublic = true
    } = streamData;

    // Validate required fields
    if (!userId) {
      throw new Error('userId is required');
    }
    if (!title) {
      throw new Error('title is required');
    }

    // Generate unique stream key
    const streamKey = streamData.stream_key || crypto.randomBytes(16).toString('hex');
    
    // Generate RTMP URL for Nimble Streamer
    const nimbleHost = process.env.NIMBLE_HOST || 'localhost';
    const nimblePort = process.env.NIMBLE_PORT || 1935;
    const rtmpUrl = streamData.rtmp_url || `rtmp://${nimbleHost}:${nimblePort}/live`;

    const result = await pool.query(
      `INSERT INTO live_streams 
       (user_id, title, description, stream_key, rtmp_url, source_app, source_stream,
        destinations, quality_settings, auto_post_enabled, auto_post_accounts, 
        auto_post_message, category, tags, is_public) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
       RETURNING id, user_id, title, description, stream_key, rtmp_url, source_app, 
                 source_stream, status, created_at`,
      [userId, title, description, streamKey, rtmpUrl, sourceApp, sourceStream,
       JSON.stringify(destinations), JSON.stringify(qualitySettings), autoPostEnabled, 
       autoPostAccounts, autoPostMessage, category, tags, isPublic]
    );

    return result.rows[0];
  }

  static async findByUserId(userId) {
    console.log('LiveStream.findByUserId called with userId:', userId);
    const result = await pool.query(
      `SELECT id, user_id, title, description, stream_key, rtmp_url, source_app, 
              source_stream, destinations, quality_settings, auto_post_enabled, 
              auto_post_accounts, auto_post_message, status, started_at, ended_at,
              thumbnail_url, category, tags, is_public, created_at, updated_at
       FROM live_streams 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    console.log('findByUserId result:', result.rows.length, 'rows');
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT id, user_id, title, description, stream_key, rtmp_url, source_app, 
              source_stream, destinations, quality_settings, auto_post_enabled, 
              auto_post_accounts, auto_post_message, status, started_at, ended_at,
              thumbnail_url, category, tags, is_public, created_at, updated_at
       FROM live_streams 
       WHERE id = $1`,
      [id]
    );

    return result.rows[0];
  }

  static async findByStreamKey(streamKey) {
    const result = await pool.query(
      `SELECT id, user_id, title, description, stream_key, rtmp_url, source_app, 
              source_stream, destinations, quality_settings, auto_post_enabled, 
              auto_post_accounts, auto_post_message, status, started_at, ended_at,
              thumbnail_url, category, tags, is_public, created_at, updated_at
       FROM live_streams 
       WHERE stream_key = $1`,
      [streamKey]
    );

    return result.rows[0];
  }

  static async updateStatus(id, status, additionalData = {}) {
    const updates = ['status = $2'];
    const values = [id, status];
    let paramIndex = 3;

    if (status === 'live' && !additionalData.started_at) {
      updates.push(`started_at = CURRENT_TIMESTAMP`);
    } else if (additionalData.started_at) {
      updates.push(`started_at = $${paramIndex}`);
      values.push(additionalData.started_at);
      paramIndex++;
    }

    if (status === 'ended' && !additionalData.ended_at) {
      updates.push(`ended_at = CURRENT_TIMESTAMP`);
    } else if (additionalData.ended_at) {
      updates.push(`ended_at = $${paramIndex}`);
      values.push(additionalData.ended_at);
      paramIndex++;
    }

    if (additionalData.thumbnail_url) {
      updates.push(`thumbnail_url = $${paramIndex}`);
      values.push(additionalData.thumbnail_url);
      paramIndex++;
    }

    const result = await pool.query(
      `UPDATE live_streams 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, status, started_at, ended_at, thumbnail_url`,
      values
    );

    return result.rows[0];
  }

  static async update(id, updateData) {
    const updates = [];
    const values = [id];
    let paramIndex = 2;

    const allowedFields = [
      'title', 'description', 'source_app', 'source_stream', 'destinations',
      'quality_settings', 'auto_post_enabled', 'auto_post_accounts', 
      'auto_post_message', 'thumbnail_url', 'category', 'tags', 'is_public'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'destinations' || field === 'quality_settings') {
          updates.push(`${field} = $${paramIndex}`);
          values.push(JSON.stringify(updateData[field]));
        } else {
          updates.push(`${field} = $${paramIndex}`);
          values.push(updateData[field]);
        }
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    const result = await pool.query(
      `UPDATE live_streams 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, title, description, status, updated_at`,
      values
    );

    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM live_streams WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rows[0];
  }

  static async getActiveStreams(userId = null) {
    let query = `
      SELECT id, user_id, title, description, stream_key, rtmp_url, source_app, 
             source_stream, status, started_at, thumbnail_url, category, tags,
             is_public, created_at
      FROM live_streams 
      WHERE status = 'live'
    `;
    const values = [];

    if (userId) {
      query += ' AND user_id = $1';
      values.push(userId);
    }

    query += ' ORDER BY started_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async getStreamStats(streamId) {
    const result = await pool.query(
      `SELECT 
         COUNT(ss.id) as session_count,
         SUM(ss.duration_seconds) as total_duration,
         MAX(ss.peak_viewers) as max_viewers,
         SUM(ss.total_viewers) as total_viewers,
         AVG(ss.connection_quality) as avg_quality
       FROM live_streams ls
       LEFT JOIN stream_sessions ss ON ls.id = ss.stream_id
       WHERE ls.id = $1
       GROUP BY ls.id`,
      [streamId]
    );

    return result.rows[0] || {
      session_count: 0,
      total_duration: 0,
      max_viewers: 0,
      total_viewers: 0,
      avg_quality: 0
    };
  }
}

module.exports = LiveStream;