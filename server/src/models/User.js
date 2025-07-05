const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(email, password, role = 'user', status = 'pending') {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role, status) VALUES ($1, $2, $3, $4) RETURNING id, email, role, status, created_at',
      [email, hashedPassword, role, status]
    );
    
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT id, email, password_hash, role, status, created_at FROM users WHERE email = $1',
      [email]
    );
    
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT id, email, role, status, created_at FROM users WHERE id = $1',
      [id]
    );
    
    return result.rows[0];
  }

  static async getAllUsers() {
    const result = await pool.query(
      'SELECT id, email, role, status, created_at FROM users ORDER BY created_at DESC'
    );
    
    return result.rows;
  }

  static async updateUserStatus(userId, status) {
    const result = await pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, role, status',
      [status, userId]
    );
    
    return result.rows[0];
  }

  static async makeAdmin(userId) {
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, role, status',
      ['admin', userId]
    );
    
    return result.rows[0];
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email',
      [hashedPassword, id]
    );
    
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    
    return result.rows[0];
  }
}

module.exports = User;