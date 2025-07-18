const pool = require('../config/database');

class WordPressTag {
  static async create(tagData) {
    const {
      accountId,
      wpTagId,
      name,
      slug,
      description = ''
    } = tagData;

    const result = await pool.query(
      `INSERT INTO wordpress_tags 
       (account_id, wp_tag_id, name, slug, description) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (account_id, wp_tag_id) 
       DO UPDATE SET 
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         description = EXCLUDED.description,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [accountId, wpTagId, name, slug, description]
    );

    return result.rows[0];
  }

  static async findByAccountId(accountId) {
    const result = await pool.query(
      'SELECT * FROM wordpress_tags WHERE account_id = $1 ORDER BY name ASC',
      [accountId]
    );

    return result.rows;
  }

  static async findByAccountIdAndWpId(accountId, wpTagId) {
    const result = await pool.query(
      'SELECT * FROM wordpress_tags WHERE account_id = $1 AND wp_tag_id = $2',
      [accountId, wpTagId]
    );

    return result.rows[0];
  }

  static async bulkCreate(accountId, tags) {
    if (!tags || tags.length === 0) {
      return [];
    }

    const values = tags.map((tag, index) => {
      const base = index * 5;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    }).join(', ');

    const params = tags.flatMap(tag => [
      accountId,
      tag.id,
      tag.name,
      tag.slug,
      tag.description || ''
    ]);

    const result = await pool.query(
      `INSERT INTO wordpress_tags 
       (account_id, wp_tag_id, name, slug, description) 
       VALUES ${values}
       ON CONFLICT (account_id, wp_tag_id) 
       DO UPDATE SET 
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         description = EXCLUDED.description,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      params
    );

    return result.rows;
  }

  static async deleteByAccountId(accountId) {
    const result = await pool.query(
      'DELETE FROM wordpress_tags WHERE account_id = $1 RETURNING *',
      [accountId]
    );

    return result.rows;
  }

  static async syncTags(accountId, tags) {
    try {
      // Start transaction
      await pool.query('BEGIN');

      // Delete existing tags for this account
      await pool.query(
        'DELETE FROM wordpress_tags WHERE account_id = $1',
        [accountId]
      );

      // Insert new tags
      let result = [];
      if (tags && tags.length > 0) {
        result = await this.bulkCreate(accountId, tags);
      }

      // Commit transaction
      await pool.query('COMMIT');

      return result;
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      throw error;
    }
  }

  static async searchByName(accountId, searchTerm, limit = 10) {
    const result = await pool.query(
      `SELECT * FROM wordpress_tags 
       WHERE account_id = $1 AND name ILIKE $2 
       ORDER BY name ASC 
       LIMIT $3`,
      [accountId, `%${searchTerm}%`, limit]
    );

    return result.rows;
  }
}

module.exports = WordPressTag;