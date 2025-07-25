const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize database tables if they don't exist
const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        instance_url VARCHAR(255),
        username VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        avatar_url TEXT,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        last_used TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS oauth_states (
        id SERIAL PRIMARY KEY,
        state_key VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        instance_url VARCHAR(255),
        client_id VARCHAR(255),
        client_secret VARCHAR(255),
        extra_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour')
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        media_urls JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'draft',
        target_accounts JSONB,
        published_at TIMESTAMP,
        scheduled_for TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns to existing tables
    try {
      await pool.query(`
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'
      `);
    } catch (error) {
      // Column might already exist, ignore error
      console.log('Column media_urls already exists or error adding:', error.message);
    }

    try {
      await pool.query(`
        ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS extra_data TEXT
      `);
    } catch (error) {
      // Column might already exist, ignore error
      console.log('Column extra_data already exists or error adding:', error.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_credentials (
        id SERIAL PRIMARY KEY,
        platform VARCHAR(50) NOT NULL,
        client_id VARCHAR(255) NOT NULL,
        client_secret VARCHAR(255) NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns to existing tables
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user'))
      `);
      console.log('Added role column to users table');
    } catch (error) {
      console.log('Column role already exists or error adding:', error.message);
    }

    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'))
      `);
      console.log('Added status column to users table');
    } catch (error) {
      console.log('Column status already exists or error adding:', error.message);
    }

    // Update existing users who don't have role/status set
    try {
      await pool.query(`
        UPDATE users 
        SET role = 'user', status = 'approved', updated_at = CURRENT_TIMESTAMP 
        WHERE role IS NULL OR status IS NULL
      `);
      console.log('Updated existing users with default role and status');
    } catch (error) {
      console.log('Error updating existing users:', error.message);
    }

    // Ensure at least one admin user exists
    const adminCount = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['admin']);
    console.log(`Admin users found: ${adminCount.rows[0].count}`);
    
    if (parseInt(adminCount.rows[0].count) === 0) {
      console.log('No admin users found. Creating/promoting admin user...');
      
      // Check if any users exist
      const userCount = await pool.query('SELECT COUNT(*) FROM users');
      console.log(`Total users found: ${userCount.rows[0].count}`);
      
      if (parseInt(userCount.rows[0].count) === 0) {
        // Create first admin user
        const bcrypt = require('bcryptjs');
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        
        await pool.query(`
          INSERT INTO users (email, password_hash, role, status) 
          VALUES ($1, $2, 'admin', 'approved')
        `, [adminEmail, hashedPassword]);
        
        console.log(`First admin user created: ${adminEmail}`);
      } else {
        // Promote first existing user to admin
        const firstUser = await pool.query(`
          SELECT id, email, role, status FROM users 
          WHERE role IS NOT NULL AND status IS NOT NULL
          ORDER BY created_at ASC 
          LIMIT 1
        `);
        
        if (firstUser.rows.length > 0) {
          const updateResult = await pool.query(`
            UPDATE users 
            SET role = 'admin', status = 'approved', updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1
            RETURNING id, email, role, status
          `, [firstUser.rows[0].id]);
          
          console.log(`Promoted existing user to admin:`, updateResult.rows[0]);
        } else {
          console.log('No valid users found to promote to admin');
        }
      }
    } else {
      console.log('Admin user(s) already exist');
    }

    // Create account groups table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_groups (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#1976D2',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add group_id to social_accounts table
    try {
      await pool.query(`
        ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES account_groups(id) ON DELETE SET NULL
      `);
      console.log('Added group_id column to social_accounts table');
    } catch (error) {
      console.log('Column group_id already exists or error adding:', error.message);
    }

    // Add scheduling and media type columns to posts table
    try {
      await pool.query(`
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(20) DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'video', 'reel'))
      `);
      console.log('Added post_type column to posts table');
    } catch (error) {
      console.log('Column post_type already exists or error adding:', error.message);
    }

    try {
      await pool.query(`
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE
      `);
      console.log('Added is_scheduled column to posts table');
    } catch (error) {
      console.log('Column is_scheduled already exists or error adding:', error.message);
    }

    // Create Reddit subreddits table for storing user's accessible subreddits
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reddit_subreddits (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES social_accounts(id) ON DELETE CASCADE,
        subreddit_name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        title VARCHAR(255),
        description TEXT,
        subscribers INTEGER DEFAULT 0,
        submission_type VARCHAR(50) DEFAULT 'any',
        can_submit BOOLEAN DEFAULT true,
        is_moderator BOOLEAN DEFAULT false,
        over_18 BOOLEAN DEFAULT false,
        flair_enabled BOOLEAN DEFAULT false,
        flair_list JSONB DEFAULT '[]',
        rules JSONB DEFAULT '[]',
        created_utc INTEGER,
        last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(account_id, subreddit_name)
      );
    `);

    // Add Reddit-specific columns to social_accounts table
    try {
      await pool.query(`
        ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS reddit_karma INTEGER DEFAULT 0
      `);
      console.log('Added reddit_karma column to social_accounts table');
    } catch (error) {
      console.log('Column reddit_karma already exists or error adding:', error.message);
    }

    try {
      await pool.query(`
        ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS reddit_created_utc INTEGER
      `);
      console.log('Added reddit_created_utc column to social_accounts table');
    } catch (error) {
      console.log('Column reddit_created_utc already exists or error adding:', error.message);
    }

    try {
      await pool.query(`
        ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS reddit_is_gold BOOLEAN DEFAULT false
      `);
      console.log('Added reddit_is_gold column to social_accounts table');
    } catch (error) {
      console.log('Column reddit_is_gold already exists or error adding:', error.message);
    }

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

// Initialize database on startup
initializeDatabase();

module.exports = pool;