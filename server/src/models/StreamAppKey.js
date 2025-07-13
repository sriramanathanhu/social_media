const pool = require('../config/database');

class StreamAppKey {
  static async create(keyData) {
    console.log('StreamAppKey.create called with data:', JSON.stringify(keyData, null, 2));
    
    const {
      appId,
      keyName,
      streamKey,
      description,
      isActive = true
    } = keyData;

    // Validate required fields
    if (!appId) throw new Error('appId is required');
    if (!keyName) throw new Error('keyName is required');
    if (!streamKey) throw new Error('streamKey is required');

    const result = await pool.query(
      `INSERT INTO stream_app_keys 
       (app_id, key_name, stream_key, description, is_active) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, app_id, key_name, stream_key, description, is_active, 
                 usage_count, created_at, updated_at`,
      [appId, keyName, streamKey, description, isActive]
    );

    return result.rows[0];
  }

  static async findByAppId(appId) {
    console.log('StreamAppKey.findByAppId called with appId:', appId);
    
    const result = await pool.query(
      `SELECT id, app_id, key_name, stream_key, description, is_active, 
              usage_count, last_used_at, created_at, updated_at
       FROM stream_app_keys 
       WHERE app_id = $1 
       ORDER BY created_at DESC`,
      [appId]
    );

    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT id, app_id, key_name, stream_key, description, is_active, 
              usage_count, last_used_at, created_at, updated_at
       FROM stream_app_keys 
       WHERE id = $1`,
      [id]
    );

    return result.rows[0];
  }

  static async findByAppIdAndName(appId, keyName) {
    const result = await pool.query(
      `SELECT id, app_id, key_name, stream_key, description, is_active, 
              usage_count, last_used_at, created_at, updated_at
       FROM stream_app_keys 
       WHERE app_id = $1 AND key_name = $2`,
      [appId, keyName]
    );

    return result.rows[0];
  }

  static async update(id, updateData) {
    const updates = [];
    const values = [id];
    let paramIndex = 2;

    const allowedFields = [
      'key_name', 'stream_key', 'description', 'is_active'
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
      `UPDATE stream_app_keys 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, key_name, is_active, updated_at`,
      values
    );

    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM stream_app_keys WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rows[0];
  }

  static async incrementUsage(id) {
    const result = await pool.query(
      `UPDATE stream_app_keys 
       SET usage_count = usage_count + 1, 
           last_used_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, usage_count, last_used_at`,
      [id]
    );

    return result.rows[0];
  }

  static async getActiveKeys(appId) {
    const result = await pool.query(
      `SELECT id, app_id, key_name, stream_key, description, 
              usage_count, last_used_at, created_at
       FROM stream_app_keys 
       WHERE app_id = $1 AND is_active = true 
       ORDER BY usage_count ASC, created_at DESC`,
      [appId]
    );

    return result.rows;
  }

  static async validateKeyName(appId, keyName, excludeId = null) {
    let query = 'SELECT id FROM stream_app_keys WHERE app_id = $1 AND key_name = $2';
    const values = [appId, keyName];

    if (excludeId) {
      query += ' AND id != $3';
      values.push(excludeId);
    }

    const result = await pool.query(query, values);
    return result.rows.length === 0; // true if key name is available
  }

  // Helper method to create platform-specific keys
  static async createPlatformKey(appId, platform, streamKey, description = null) {
    const platformKeyNames = {
      'youtube': 'YouTube',
      'twitch': 'Twitch',
      'facebook': 'Facebook',
      'twitter': 'Twitter/X',
      'kick': 'Kick',
      'rumble': 'Rumble'
    };

    const keyName = platformKeyNames[platform.toLowerCase()] || platform;
    const keyDescription = description || `Stream key for ${keyName}`;

    return this.create({
      appId,
      keyName,
      streamKey,
      description: keyDescription
    });
  }
}

module.exports = StreamAppKey;