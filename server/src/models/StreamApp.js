const pool = require('../config/database');

class StreamApp {
  static async create(appData) {
    console.log('StreamApp.create called with data:', JSON.stringify(appData, null, 2));
    
    const {
      userId,
      appName,
      description,
      rtmpAppPath,
      defaultStreamKey,
      settings = {}
    } = appData;

    // Validate required fields
    if (!userId) throw new Error('userId is required');
    if (!appName) throw new Error('appName is required');
    if (!rtmpAppPath) throw new Error('rtmpAppPath is required');

    const result = await pool.query(
      `INSERT INTO stream_apps 
       (user_id, app_name, description, rtmp_app_path, default_stream_key, settings) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, user_id, app_name, description, rtmp_app_path, 
                 default_stream_key, status, settings, created_at, updated_at`,
      [userId, appName, description, rtmpAppPath, defaultStreamKey, JSON.stringify(settings)]
    );

    return result.rows[0];
  }

  static async findByUserId(userId) {
    console.log('StreamApp.findByUserId called with userId:', userId);
    
    const result = await pool.query(
      `SELECT sa.id, sa.user_id, sa.app_name, sa.description, sa.rtmp_app_path,
              sa.default_stream_key, sa.status, sa.settings, sa.created_at, sa.updated_at,
              COUNT(sak.id) as key_count,
              COUNT(sak.id) FILTER (WHERE sak.is_active = true) as active_key_count
       FROM stream_apps sa
       LEFT JOIN stream_app_keys sak ON sa.id = sak.app_id
       WHERE sa.user_id = $1 AND sa.status != 'deleted'
       GROUP BY sa.id, sa.user_id, sa.app_name, sa.description, sa.rtmp_app_path,
                sa.default_stream_key, sa.status, sa.settings, sa.created_at, sa.updated_at
       ORDER BY sa.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT id, user_id, app_name, description, rtmp_app_path,
              default_stream_key, status, settings, created_at, updated_at
       FROM stream_apps 
       WHERE id = $1 AND status != 'deleted'`,
      [id]
    );

    return result.rows[0];
  }

  static async findByUserIdAndName(userId, appName) {
    const result = await pool.query(
      `SELECT id, user_id, app_name, description, rtmp_app_path,
              default_stream_key, status, settings, created_at, updated_at
       FROM stream_apps 
       WHERE user_id = $1 AND app_name = $2 AND status != 'deleted'`,
      [userId, appName]
    );

    return result.rows[0];
  }

  static async update(id, updateData) {
    const updates = [];
    const values = [id];
    let paramIndex = 2;

    const allowedFields = [
      'app_name', 'description', 'rtmp_app_path', 
      'default_stream_key', 'status', 'settings'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'settings') {
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
      `UPDATE stream_apps 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, app_name, status, updated_at`,
      values
    );

    return result.rows[0];
  }

  static async delete(id) {
    // Soft delete by setting status to 'deleted'
    const result = await pool.query(
      `UPDATE stream_apps 
       SET status = 'deleted', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id`,
      [id]
    );

    return result.rows[0];
  }

  static async getAppWithKeys(appId) {
    const appResult = await pool.query(
      `SELECT id, user_id, app_name, description, rtmp_app_path,
              default_stream_key, status, settings, created_at, updated_at
       FROM stream_apps 
       WHERE id = $1 AND status != 'deleted'`,
      [appId]
    );

    if (appResult.rows.length === 0) {
      return null;
    }

    const keysResult = await pool.query(
      `SELECT id, key_name, stream_key, description, is_active, 
              usage_count, last_used_at, created_at, updated_at
       FROM stream_app_keys 
       WHERE app_id = $1 
       ORDER BY created_at DESC`,
      [appId]
    );

    const app = appResult.rows[0];
    app.keys = keysResult.rows;
    
    return app;
  }

  static async validateAppPath(rtmpAppPath, excludeId = null) {
    let query = 'SELECT id FROM stream_apps WHERE rtmp_app_path = $1 AND status != $2';
    const values = [rtmpAppPath, 'deleted'];

    if (excludeId) {
      query += ' AND id != $3';
      values.push(excludeId);
    }

    const result = await pool.query(query, values);
    return result.rows.length === 0; // true if path is available
  }
}

module.exports = StreamApp;