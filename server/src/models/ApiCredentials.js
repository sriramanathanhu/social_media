const pool = require('../config/database');

class ApiCredentials {
  static async create(platform, clientId, clientSecret, createdBy) {
    const result = await pool.query(
      `INSERT INTO api_credentials 
       (platform, client_id, client_secret, created_by, status) 
       VALUES ($1, $2, $3, $4, 'active') 
       RETURNING id, platform, client_id, status, created_at`,
      [platform, clientId, clientSecret, createdBy]
    );

    return result.rows[0];
  }

  static async findByPlatform(platform) {
    const result = await pool.query(
      `SELECT id, platform, client_id, client_secret, status, created_at 
       FROM api_credentials 
       WHERE platform = $1 AND status = 'active' 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [platform]
    );

    return result.rows[0];
  }

  static async findAll() {
    const result = await pool.query(
      `SELECT id, platform, client_id, status, created_by, created_at 
       FROM api_credentials 
       ORDER BY created_at DESC`
    );

    return result.rows;
  }

  static async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE api_credentials 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, status`,
      [status, id]
    );

    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM api_credentials WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rows[0];
  }

  static async testCredentials(platform, clientId, clientSecret) {
    // This would test the credentials against the platform API
    // Implementation depends on the platform
    if (platform === 'x') {
      try {
        // Basic validation - could be enhanced with actual API test
        return clientId && clientSecret && clientId.length > 10 && clientSecret.length > 10;
      } catch (error) {
        return false;
      }
    }
    return false;
  }
}

module.exports = ApiCredentials;