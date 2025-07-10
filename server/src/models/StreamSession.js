const pool = require('../config/database');
const crypto = require('crypto');

class StreamSession {
  static async create(sessionData) {
    console.log('StreamSession.create called with data:', JSON.stringify(sessionData, null, 2));
    
    // Validate required fields
    if (!sessionData) {
      throw new Error('Session data is required');
    }
    
    const {
      streamId,
      userId,
      sessionKey = crypto.randomBytes(16).toString('hex'),
      metadata = {}
    } = sessionData;

    // Validate required fields
    if (!streamId) {
      throw new Error('streamId is required');
    }
    if (!userId) {
      throw new Error('userId is required');
    }

    const result = await pool.query(
      `INSERT INTO stream_sessions 
       (stream_id, user_id, session_key, metadata) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, stream_id, user_id, session_key, started_at, status, created_at`,
      [streamId, userId, sessionKey, JSON.stringify(metadata)]
    );

    return result.rows[0];
  }

  static async findByStreamId(streamId) {
    console.log('StreamSession.findByStreamId called with streamId:', streamId);
    const result = await pool.query(
      `SELECT id, stream_id, user_id, session_key, started_at, ended_at, 
              duration_seconds, peak_viewers, total_viewers, bytes_sent, 
              bytes_received, avg_bitrate, dropped_frames, connection_quality,
              published_to_social, social_post_ids, status, error_message, 
              metadata, created_at, updated_at
       FROM stream_sessions 
       WHERE stream_id = $1 
       ORDER BY started_at DESC`,
      [streamId]
    );

    console.log('findByStreamId result:', result.rows.length, 'rows');
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT id, stream_id, user_id, session_key, started_at, ended_at, 
              duration_seconds, peak_viewers, total_viewers, bytes_sent, 
              bytes_received, avg_bitrate, dropped_frames, connection_quality,
              published_to_social, social_post_ids, status, error_message, 
              metadata, created_at, updated_at
       FROM stream_sessions 
       WHERE id = $1`,
      [id]
    );

    return result.rows[0];
  }

  static async findBySessionKey(sessionKey) {
    const result = await pool.query(
      `SELECT id, stream_id, user_id, session_key, started_at, ended_at, 
              duration_seconds, peak_viewers, total_viewers, bytes_sent, 
              bytes_received, avg_bitrate, dropped_frames, connection_quality,
              published_to_social, social_post_ids, status, error_message, 
              metadata, created_at, updated_at
       FROM stream_sessions 
       WHERE session_key = $1`,
      [sessionKey]
    );

    return result.rows[0];
  }

  static async updateStats(id, stats) {
    const updates = [];
    const values = [id];
    let paramIndex = 2;

    const allowedStats = [
      'peak_viewers', 'total_viewers', 'bytes_sent', 'bytes_received',
      'avg_bitrate', 'dropped_frames', 'connection_quality', 'metadata'
    ];

    allowedStats.forEach(stat => {
      if (stats[stat] !== undefined) {
        if (stat === 'metadata') {
          updates.push(`${stat} = $${paramIndex}`);
          values.push(JSON.stringify(stats[stat]));
        } else {
          updates.push(`${stat} = $${paramIndex}`);
          values.push(stats[stat]);
        }
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid stats to update');
    }

    const result = await pool.query(
      `UPDATE stream_sessions 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, peak_viewers, total_viewers, connection_quality, updated_at`,
      values
    );

    return result.rows[0];
  }

  static async endSession(id, endData = {}) {
    const {
      endedAt = new Date(),
      durationSeconds,
      finalStats = {},
      errorMessage = null
    } = endData;

    // Calculate duration if not provided
    let calculatedDuration = durationSeconds;
    if (!calculatedDuration) {
      const session = await this.findById(id);
      if (session && session.started_at) {
        calculatedDuration = Math.floor((endedAt - new Date(session.started_at)) / 1000);
      }
    }

    const updates = ['ended_at = $2', 'status = $3'];
    const values = [id, endedAt, errorMessage ? 'error' : 'ended'];
    let paramIndex = 4;

    if (calculatedDuration !== undefined) {
      updates.push(`duration_seconds = $${paramIndex}`);
      values.push(calculatedDuration);
      paramIndex++;
    }

    if (errorMessage) {
      updates.push(`error_message = $${paramIndex}`);
      values.push(errorMessage);
      paramIndex++;
    }

    // Add any final stats
    const allowedStats = [
      'peak_viewers', 'total_viewers', 'bytes_sent', 'bytes_received',
      'avg_bitrate', 'dropped_frames', 'connection_quality'
    ];

    allowedStats.forEach(stat => {
      if (finalStats[stat] !== undefined) {
        updates.push(`${stat} = $${paramIndex}`);
        values.push(finalStats[stat]);
        paramIndex++;
      }
    });

    const result = await pool.query(
      `UPDATE stream_sessions 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, ended_at, duration_seconds, status, updated_at`,
      values
    );

    return result.rows[0];
  }

  static async markSocialPosted(id, socialPostIds) {
    const result = await pool.query(
      `UPDATE stream_sessions 
       SET published_to_social = true, social_post_ids = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, published_to_social, social_post_ids, updated_at`,
      [id, JSON.stringify(socialPostIds)]
    );

    return result.rows[0];
  }

  static async getActiveSessions(userId = null) {
    let query = `
      SELECT ss.id, ss.stream_id, ss.user_id, ss.session_key, ss.started_at,
             ss.peak_viewers, ss.total_viewers, ss.connection_quality, ss.status,
             ls.title, ls.stream_key as stream_stream_key
      FROM stream_sessions ss
      JOIN live_streams ls ON ss.stream_id = ls.id
      WHERE ss.status = 'active'
    `;
    const values = [];

    if (userId) {
      query += ' AND ss.user_id = $1';
      values.push(userId);
    }

    query += ' ORDER BY ss.started_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async getSessionsByUser(userId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT ss.id, ss.stream_id, ss.session_key, ss.started_at, ss.ended_at,
              ss.duration_seconds, ss.peak_viewers, ss.total_viewers, 
              ss.connection_quality, ss.status, ls.title, ls.stream_key as stream_stream_key
       FROM stream_sessions ss
       JOIN live_streams ls ON ss.stream_id = ls.id
       WHERE ss.user_id = $1
       ORDER BY ss.started_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM stream_sessions WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rows[0];
  }
}

module.exports = StreamSession;