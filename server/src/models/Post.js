const pool = require('../config/database');

class Post {
  static async create(postData) {
    const {
      userId,
      content,
      mediaUrls = [],
      targetAccounts,
      scheduledFor = null
    } = postData;

    // Ensure targetAccounts is properly JSON stringified
    const targetAccountsJson = JSON.stringify(targetAccounts);
    
    
    const result = await pool.query(
      `INSERT INTO posts 
       (user_id, content, media_urls, target_accounts, scheduled_for, status) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, user_id, content, media_urls, target_accounts, 
                 status, scheduled_for, created_at`,
      [userId, content, JSON.stringify(mediaUrls), targetAccountsJson, scheduledFor, 
       scheduledFor ? 'scheduled' : 'draft']
    );

    return result.rows[0];
  }

  static async findByUserId(userId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT id, user_id, content, media_urls, target_accounts, 
              status, published_at, scheduled_for, error_message, created_at 
       FROM posts 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT id, user_id, content, media_urls, target_accounts, 
              status, published_at, scheduled_for, error_message, created_at 
       FROM posts 
       WHERE id = $1`,
      [id]
    );

    return result.rows[0];
  }

  static async updateStatus(id, status, publishedAt = null, errorMessage = null) {
    let query = `
      UPDATE posts 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    let params = [status];
    let paramCount = 1;

    if (publishedAt) {
      paramCount++;
      query += `, published_at = $${paramCount}`;
      params.push(publishedAt);
    }

    if (errorMessage) {
      paramCount++;
      query += `, error_message = $${paramCount}`;
      params.push(errorMessage);
    }

    paramCount++;
    query += ` WHERE id = $${paramCount} RETURNING id, status, published_at, error_message`;
    params.push(id);

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  static async getScheduledPosts() {
    const result = await pool.query(
      `SELECT id, user_id, content, media_urls, target_accounts, 
              scheduled_for, created_at 
       FROM posts 
       WHERE status = 'scheduled' AND scheduled_for <= CURRENT_TIMESTAMP 
       ORDER BY scheduled_for ASC`
    );

    return result.rows;
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rows[0];
  }

  static async getPostStats(userId) {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_posts,
         COUNT(CASE WHEN status = 'published' THEN 1 END) as published_posts,
         COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_posts,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_posts,
         COUNT(CASE WHEN status = 'published' AND DATE(published_at) = CURRENT_DATE THEN 1 END) as today_posts
       FROM posts 
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0];
  }
}

module.exports = Post;