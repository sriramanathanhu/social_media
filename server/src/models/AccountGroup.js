const pool = require('../config/database');

class AccountGroup {
  static async create(userId, name, description = '', color = '#1976D2') {
    const result = await pool.query(
      'INSERT INTO account_groups (user_id, name, description, color) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, name, description, color]
    );
    
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM account_groups WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM account_groups WHERE id = $1',
      [id]
    );
    
    return result.rows[0];
  }

  static async update(id, userId, updates) {
    const { name, description, color } = updates;
    const result = await pool.query(
      `UPDATE account_groups 
       SET name = $1, description = $2, color = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 AND user_id = $5 
       RETURNING *`,
      [name, description, color, id, userId]
    );
    
    return result.rows[0];
  }

  static async delete(id, userId) {
    const result = await pool.query(
      'DELETE FROM account_groups WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    return result.rows[0];
  }

  static async getGroupWithAccounts(groupId, userId) {
    const groupResult = await pool.query(
      'SELECT * FROM account_groups WHERE id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (groupResult.rows.length === 0) {
      return null;
    }

    const accountsResult = await pool.query(
      `SELECT sa.*, ag.name as group_name, ag.color as group_color
       FROM social_accounts sa
       LEFT JOIN account_groups ag ON sa.group_id = ag.id
       WHERE sa.group_id = $1 AND sa.user_id = $2
       ORDER BY sa.platform, sa.username`,
      [groupId, userId]
    );

    return {
      ...groupResult.rows[0],
      accounts: accountsResult.rows
    };
  }

  static async addAccountToGroup(accountId, groupId, userId) {
    const result = await pool.query(
      `UPDATE social_accounts 
       SET group_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND user_id = $3 
       RETURNING *`,
      [groupId, accountId, userId]
    );
    
    return result.rows[0];
  }

  static async removeAccountFromGroup(accountId, userId) {
    const result = await pool.query(
      `UPDATE social_accounts 
       SET group_id = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [accountId, userId]
    );
    
    return result.rows[0];
  }
}

module.exports = AccountGroup;