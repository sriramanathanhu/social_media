const pool = require('../config/database');

class WordPressCategory {
  static async create(categoryData) {
    const {
      accountId,
      wpCategoryId,
      name,
      slug,
      description = ''
    } = categoryData;

    const result = await pool.query(
      `INSERT INTO wordpress_categories 
       (account_id, wp_category_id, name, slug, description) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (account_id, wp_category_id) 
       DO UPDATE SET 
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         description = EXCLUDED.description,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [accountId, wpCategoryId, name, slug, description]
    );

    return result.rows[0];
  }

  static async findByAccountId(accountId) {
    const result = await pool.query(
      'SELECT * FROM wordpress_categories WHERE account_id = $1 ORDER BY name ASC',
      [accountId]
    );

    return result.rows;
  }

  static async findByAccountIdAndWpId(accountId, wpCategoryId) {
    const result = await pool.query(
      'SELECT * FROM wordpress_categories WHERE account_id = $1 AND wp_category_id = $2',
      [accountId, wpCategoryId]
    );

    return result.rows[0];
  }

  static async bulkCreate(accountId, categories) {
    if (!categories || categories.length === 0) {
      return [];
    }

    const values = categories.map((cat, index) => {
      const base = index * 5;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    }).join(', ');

    const params = categories.flatMap(cat => [
      accountId,
      cat.id,
      cat.name,
      cat.slug,
      cat.description || ''
    ]);

    const result = await pool.query(
      `INSERT INTO wordpress_categories 
       (account_id, wp_category_id, name, slug, description) 
       VALUES ${values}
       ON CONFLICT (account_id, wp_category_id) 
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
      'DELETE FROM wordpress_categories WHERE account_id = $1 RETURNING *',
      [accountId]
    );

    return result.rows;
  }

  static async syncCategories(accountId, categories) {
    try {
      // Start transaction
      await pool.query('BEGIN');

      // Delete existing categories for this account
      await pool.query(
        'DELETE FROM wordpress_categories WHERE account_id = $1',
        [accountId]
      );

      // Insert new categories
      let result = [];
      if (categories && categories.length > 0) {
        result = await this.bulkCreate(accountId, categories);
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
}

module.exports = WordPressCategory;