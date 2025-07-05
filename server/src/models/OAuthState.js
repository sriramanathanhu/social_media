const db = require('../config/database');

class OAuthState {
  static async create(stateKey, userId, platform, instanceUrl, clientId, clientSecret, extraData = null) {
    const query = `
      INSERT INTO oauth_states (state_key, user_id, platform, instance_url, client_id, client_secret, extra_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await db.query(query, [stateKey, userId, platform, instanceUrl, clientId, clientSecret, extraData]);
    return result.rows[0];
  }

  static async findByStateKey(stateKey) {
    const query = `
      SELECT * FROM oauth_states 
      WHERE state_key = $1 AND expires_at > CURRENT_TIMESTAMP
    `;
    
    const result = await db.query(query, [stateKey]);
    return result.rows[0];
  }

  static async deleteByStateKey(stateKey) {
    const query = `DELETE FROM oauth_states WHERE state_key = $1`;
    await db.query(query, [stateKey]);
  }

  static async cleanup() {
    const query = `DELETE FROM oauth_states WHERE expires_at < CURRENT_TIMESTAMP`;
    await db.query(query);
  }
}

module.exports = OAuthState;