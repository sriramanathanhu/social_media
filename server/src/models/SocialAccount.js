const pool = require('../config/database');

class SocialAccount {
  static async create(accountData) {
    console.log('SocialAccount.create called with data:', JSON.stringify(accountData, null, 2));
    
    // Validate required fields
    if (!accountData) {
      throw new Error('Account data is required');
    }
    
    const {
      userId,
      platform,
      instanceUrl,
      username,
      displayName,
      avatarUrl,
      accessToken,
      refreshToken,
      tokenExpiresAt
    } = accountData;

    console.log('Destructured values:', {
      userId,
      platform,
      instanceUrl,
      username,
      displayName,
      avatarUrl: avatarUrl ? 'present' : 'null',
      accessToken: accessToken ? 'present' : 'null',
      refreshToken: refreshToken ? 'present' : 'null',
      tokenExpiresAt
    });

    // Validate required fields
    if (!userId) {
      throw new Error('userId is required');
    }
    if (!platform) {
      throw new Error('platform is required');
    }
    if (!username) {
      throw new Error('username is required');
    }

    const result = await pool.query(
      `INSERT INTO social_accounts 
       (user_id, platform, instance_url, username, display_name, avatar_url, 
        access_token, refresh_token, token_expires_at, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active') 
       RETURNING id, user_id, platform, instance_url, username, display_name, 
                 avatar_url, status, created_at`,
      [userId, platform, instanceUrl, username, displayName, avatarUrl, 
       accessToken, refreshToken, tokenExpiresAt]
    );

    return result.rows[0];
  }

  static async findByUserId(userId) {
    console.log('SocialAccount.findByUserId called with userId:', userId);
    const result = await pool.query(
      `SELECT id, user_id, platform, instance_url, username, display_name, 
              avatar_url, status, last_used, created_at 
       FROM social_accounts 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    console.log('findByUserId result:', result.rows.length, 'rows');
    console.log('Account platforms found:', result.rows.map(row => `${row.platform}:${row.username}`));
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT id, user_id, platform, instance_url, username, display_name, 
              avatar_url, access_token, refresh_token, token_expires_at, 
              status, last_used, created_at 
       FROM social_accounts 
       WHERE id = $1`,
      [id]
    );

    return result.rows[0];
  }

  static async findByPlatformAndUser(userId, platform, instanceUrl = null) {
    let query = `
      SELECT id, user_id, platform, instance_url, username, display_name, 
             avatar_url, status, last_used, created_at 
      FROM social_accounts 
      WHERE user_id = $1 AND platform = $2
    `;
    let params = [userId, platform];

    if (instanceUrl) {
      query += ' AND instance_url = $3';
      params.push(instanceUrl);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findByPlatformUserAndUsername(userId, platform, instanceUrl, username) {
    const query = `
      SELECT id, user_id, platform, instance_url, username, display_name, 
             avatar_url, status, last_used, created_at 
      FROM social_accounts 
      WHERE user_id = $1 AND platform = $2 AND instance_url = $3 AND username = $4
    `;
    const params = [userId, platform, instanceUrl, username];

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE social_accounts 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, status`,
      [status, id]
    );

    return result.rows[0];
  }

  static async updateLastUsed(id) {
    const result = await pool.query(
      `UPDATE social_accounts 
       SET last_used = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, last_used`,
      [id]
    );

    return result.rows[0];
  }

  static async updateTokens(id, accessToken, refreshToken = null, expiresAt = null) {
    const result = await pool.query(
      `UPDATE social_accounts 
       SET access_token = $1, refresh_token = $2, token_expires_at = $3, 
           status = 'active', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING id, status`,
      [accessToken, refreshToken, expiresAt, id]
    );

    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM social_accounts WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rows[0];
  }

  static async getActiveAccountsByIds(accountIds) {
    console.log('getActiveAccountsByIds called with:', accountIds);
    console.log('Account IDs type:', typeof accountIds);
    console.log('Is array:', Array.isArray(accountIds));
    
    // Ensure accountIds is an array and contains valid integers
    if (!Array.isArray(accountIds)) {
      console.log('Converting accountIds to array:', accountIds);
      accountIds = Array.isArray(accountIds) ? accountIds : [accountIds];
    }
    
    // Filter out any invalid IDs and convert to integers
    const validIds = accountIds.filter(id => id && !isNaN(parseInt(id))).map(id => parseInt(id));
    console.log('Valid account IDs:', validIds);
    
    if (validIds.length === 0) {
      console.log('No valid account IDs provided');
      return [];
    }
    
    // First, let's check if the accounts exist at all (without status filter)
    const existsResult = await pool.query(
      `SELECT id, user_id, platform, username, status 
       FROM social_accounts 
       WHERE id = ANY($1)`,
      [validIds]
    );
    
    console.log('Accounts that exist (any status):', existsResult.rows.length, 'rows');
    console.log('Account existence check:', existsResult.rows.map(row => ({
      id: row.id,
      platform: row.platform,
      username: row.username,
      status: row.status
    })));
    
    // Now get the active accounts
    const result = await pool.query(
      `SELECT id, user_id, platform, instance_url, username, display_name, 
              avatar_url, access_token, refresh_token, token_expires_at, status
       FROM social_accounts 
       WHERE id = ANY($1) AND (status = 'active' OR status IS NULL)`,
      [validIds]
    );

    console.log('Active accounts query result:', result.rows.length, 'rows');
    console.log('Active account details from DB:', result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      platform: row.platform,
      username: row.username,
      status: row.status
    })));

    return result.rows;
  }
}

module.exports = SocialAccount;