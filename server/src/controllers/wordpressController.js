const { validationResult } = require('express-validator');
const wordpressApiService = require('../services/wordpressApiService');
const WordPressCategory = require('../models/WordPressCategory');
const WordPressTag = require('../models/WordPressTag');
const pool = require('../config/database');
const crypto = require('crypto');

// Encrypt sensitive data
function encrypt(text) {
  const algorithm = 'aes-256-cbc';
  const secretKey = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'default-key-please-change-in-production').digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt sensitive data
function decrypt(encryptedText) {
  try {
    // Try new method first
    const algorithm = 'aes-256-cbc';
    const secretKey = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'default-key-please-change-in-production').digest();
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = textParts.join(':');
    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Try legacy method as fallback
    try {
      console.log('Trying legacy decryption method...');
      const algorithm = 'aes-256-gcm';
      const secretKey = process.env.ENCRYPTION_KEY || 'default-key-please-change-in-production';
      const textParts = encryptedText.split(':');
      const encrypted = textParts.join(':');
      const decipher = crypto.createDecipher(algorithm, secretKey);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (legacyError) {
      console.error('Both decryption methods failed:', error.message, legacyError.message);
      console.error('Encrypted text format:', encryptedText);
      throw new Error('Failed to decrypt password - please reconnect your WordPress site');
    }
  }
}

const wordpressController = {
  // Connect a new WordPress site
  async connectSite(req, res) {
    try {
      console.log('WordPress connect attempt:', { siteUrl: req.body.siteUrl, username: req.body.username });
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { siteUrl, username, appPassword } = req.body;
      const userId = req.user.id;
      
      console.log('Starting WordPress verification for:', siteUrl);

      // Verify the WordPress site and credentials
      const verification = await wordpressApiService.verifySite(siteUrl, username, appPassword);
      
      console.log('WordPress verification result:', verification);

      if (!verification.success) {
        console.error('WordPress verification failed:', verification.error);
        return res.status(400).json({
          error: 'Failed to verify WordPress site',
          details: verification.error
        });
      }

      // Check if site already exists for this user
      const existingAccount = await pool.query(
        'SELECT id FROM social_accounts WHERE user_id = $1 AND platform = $2 AND site_url = $3',
        [userId, 'wordpress', siteUrl]
      );

      if (existingAccount.rows.length > 0) {
        return res.status(400).json({
          error: 'WordPress site already connected',
          details: 'This WordPress site is already connected to your account'
        });
      }

      // Encrypt the app password
      const encryptedPassword = encrypt(appPassword);

      // Save WordPress account to database
      const result = await pool.query(
        `INSERT INTO social_accounts 
         (user_id, platform, site_url, username, display_name, access_token, app_password, site_title, api_version, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
         RETURNING id, site_url, username, display_name, site_title, created_at`,
        [
          userId,
          'wordpress',
          siteUrl,
          username,
          verification.user.displayName,
          'wordpress_app_password', // Use placeholder for access_token
          encryptedPassword,
          verification.site.title,
          'v2',
          'active'
        ]
      );

      const account = result.rows[0];

      // Fetch and sync categories and tags
      try {
        const [categories, tags] = await Promise.all([
          wordpressApiService.getCategories(siteUrl, username, appPassword),
          wordpressApiService.getTags(siteUrl, username, appPassword)
        ]);

        await Promise.all([
          WordPressCategory.syncCategories(account.id, categories),
          WordPressTag.syncTags(account.id, tags)
        ]);

        console.log(`Synced ${categories.length} categories and ${tags.length} tags for WordPress site ${account.id}`);
      } catch (syncError) {
        console.warn('Failed to sync categories and tags during connection:', syncError.message);
        // Don't fail the connection if sync fails
      }

      res.status(201).json({
        success: true,
        message: 'WordPress site connected successfully',
        account: {
          id: account.id,
          siteUrl: account.site_url,
          username: account.username,
          displayName: account.display_name,
          siteTitle: account.site_title,
          createdAt: account.created_at
        },
        site: verification.site,
        user: verification.user
      });

    } catch (error) {
      console.error('WordPress connection error:', error);
      res.status(500).json({
        error: 'Failed to connect WordPress site',
        details: error.message
      });
    }
  },

  // Get all connected WordPress sites
  async getSites(req, res) {
    try {
      const userId = req.user.id;

      const result = await pool.query(
        `SELECT id, site_url, username, display_name, site_title, status, last_used, created_at, updated_at
         FROM social_accounts 
         WHERE user_id = $1 AND platform = $2 
         ORDER BY created_at DESC`,
        [userId, 'wordpress']
      );

      res.json({
        success: true,
        sites: result.rows
      });

    } catch (error) {
      console.error('Get WordPress sites error:', error);
      res.status(500).json({
        error: 'Failed to fetch WordPress sites',
        details: error.message
      });
    }
  },

  // Get specific WordPress site
  async getSite(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.id;

      const result = await pool.query(
        `SELECT id, site_url, username, display_name, site_title, status, last_used, created_at, updated_at
         FROM social_accounts 
         WHERE id = $1 AND user_id = $2 AND platform = $3`,
        [id, userId, 'wordpress']
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'WordPress site not found'
        });
      }

      res.json({
        success: true,
        site: result.rows[0]
      });

    } catch (error) {
      console.error('Get WordPress site error:', error);
      res.status(500).json({
        error: 'Failed to fetch WordPress site',
        details: error.message
      });
    }
  },

  // Update WordPress site
  async updateSite(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { siteUrl, username, appPassword } = req.body;
      const userId = req.user.id;

      // Check if site exists and belongs to user
      const existingAccount = await pool.query(
        'SELECT * FROM social_accounts WHERE id = $1 AND user_id = $2 AND platform = $3',
        [id, userId, 'wordpress']
      );

      if (existingAccount.rows.length === 0) {
        return res.status(404).json({
          error: 'WordPress site not found'
        });
      }

      const account = existingAccount.rows[0];

      // If credentials are being updated, verify them
      let verification = null;
      if (siteUrl || username || appPassword) {
        const testSiteUrl = siteUrl || account.site_url;
        const testUsername = username || account.username;
        const testAppPassword = appPassword || decrypt(account.app_password);

        verification = await wordpressApiService.verifySite(testSiteUrl, testUsername, testAppPassword);

        if (!verification.success) {
          return res.status(400).json({
            error: 'Failed to verify updated WordPress credentials',
            details: verification.error
          });
        }
      }

      // Update the account
      const updates = [];
      const values = [id, userId, 'wordpress'];
      let paramIndex = 4;

      if (siteUrl) {
        updates.push(`site_url = $${paramIndex}`);
        values.push(siteUrl);
        paramIndex++;
      }

      if (username) {
        updates.push(`username = $${paramIndex}`);
        values.push(username);
        paramIndex++;
      }

      if (appPassword) {
        updates.push(`app_password = $${paramIndex}`);
        values.push(encrypt(appPassword));
        paramIndex++;
      }

      if (verification) {
        updates.push(`display_name = $${paramIndex}`);
        values.push(verification.user.displayName);
        paramIndex++;

        updates.push(`site_title = $${paramIndex}`);
        values.push(verification.site.title);
        paramIndex++;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');

      const result = await pool.query(
        `UPDATE social_accounts 
         SET ${updates.join(', ')} 
         WHERE id = $1 AND user_id = $2 AND platform = $3 
         RETURNING id, site_url, username, display_name, site_title, updated_at`,
        values
      );

      res.json({
        success: true,
        message: 'WordPress site updated successfully',
        site: result.rows[0]
      });

    } catch (error) {
      console.error('Update WordPress site error:', error);
      res.status(500).json({
        error: 'Failed to update WordPress site',
        details: error.message
      });
    }
  },

  // Delete WordPress site
  async deleteSite(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.id;

      const result = await pool.query(
        'DELETE FROM social_accounts WHERE id = $1 AND user_id = $2 AND platform = $3 RETURNING id',
        [id, userId, 'wordpress']
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'WordPress site not found'
        });
      }

      res.json({
        success: true,
        message: 'WordPress site disconnected successfully'
      });

    } catch (error) {
      console.error('Delete WordPress site error:', error);
      res.status(500).json({
        error: 'Failed to disconnect WordPress site',
        details: error.message
      });
    }
  },

  // Get categories for a WordPress site
  async getCategories(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.id;

      // Verify site ownership
      const account = await pool.query(
        'SELECT * FROM social_accounts WHERE id = $1 AND user_id = $2 AND platform = $3',
        [id, userId, 'wordpress']
      );

      if (account.rows.length === 0) {
        return res.status(404).json({
          error: 'WordPress site not found'
        });
      }

      const categories = await WordPressCategory.findByAccountId(id);

      res.json({
        success: true,
        categories: categories.map(cat => ({
          id: cat.wp_category_id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description
        }))
      });

    } catch (error) {
      console.error('Get WordPress categories error:', error);
      res.status(500).json({
        error: 'Failed to fetch categories',
        details: error.message
      });
    }
  },

  // Get tags for a WordPress site
  async getTags(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.id;

      // Verify site ownership
      const account = await pool.query(
        'SELECT * FROM social_accounts WHERE id = $1 AND user_id = $2 AND platform = $3',
        [id, userId, 'wordpress']
      );

      if (account.rows.length === 0) {
        return res.status(404).json({
          error: 'WordPress site not found'
        });
      }

      const tags = await WordPressTag.findByAccountId(id);

      res.json({
        success: true,
        tags: tags.map(tag => ({
          id: tag.wp_tag_id,
          name: tag.name,
          slug: tag.slug,
          description: tag.description
        }))
      });

    } catch (error) {
      console.error('Get WordPress tags error:', error);
      res.status(500).json({
        error: 'Failed to fetch tags',
        details: error.message
      });
    }
  },

  // Sync categories and tags from WordPress site
  async syncSiteData(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user.id;

      // Get account details
      const account = await pool.query(
        'SELECT * FROM social_accounts WHERE id = $1 AND user_id = $2 AND platform = $3',
        [id, userId, 'wordpress']
      );

      if (account.rows.length === 0) {
        return res.status(404).json({
          error: 'WordPress site not found'
        });
      }

      const accountData = account.rows[0];
      const appPassword = decrypt(accountData.app_password);

      // Fetch categories and tags from WordPress
      const [categories, tags] = await Promise.all([
        wordpressApiService.getCategories(accountData.site_url, accountData.username, appPassword),
        wordpressApiService.getTags(accountData.site_url, accountData.username, appPassword)
      ]);

      // Sync to database
      await Promise.all([
        WordPressCategory.syncCategories(id, categories),
        WordPressTag.syncTags(id, tags)
      ]);

      res.json({
        success: true,
        message: 'Site data synced successfully',
        synced: {
          categories: categories.length,
          tags: tags.length
        }
      });

    } catch (error) {
      console.error('Sync WordPress site data error:', error);
      res.status(500).json({
        error: 'Failed to sync site data',
        details: error.message
      });
    }
  },

  // Search tags for autocomplete
  async searchTags(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { q } = req.query;
      const userId = req.user.id;

      // Verify site ownership
      const account = await pool.query(
        'SELECT id FROM social_accounts WHERE id = $1 AND user_id = $2 AND platform = $3',
        [id, userId, 'wordpress']
      );

      if (account.rows.length === 0) {
        return res.status(404).json({
          error: 'WordPress site not found'
        });
      }

      const tags = await WordPressTag.searchByName(id, q, 10);

      res.json({
        success: true,
        tags: tags.map(tag => ({
          id: tag.wp_tag_id,
          name: tag.name,
          slug: tag.slug
        }))
      });

    } catch (error) {
      console.error('Search WordPress tags error:', error);
      res.status(500).json({
        error: 'Failed to search tags',
        details: error.message
      });
    }
  },

  // Publish post to WordPress
  async publishPost(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { siteId, title, content, status = 'publish', categories = [], tags = [], excerpt, scheduledFor } = req.body;
      const userId = req.user.id;

      // Get account details
      const account = await pool.query(
        'SELECT * FROM social_accounts WHERE id = $1 AND user_id = $2 AND platform = $3',
        [siteId, userId, 'wordpress']
      );

      if (account.rows.length === 0) {
        return res.status(404).json({
          error: 'WordPress site not found'
        });
      }

      const accountData = account.rows[0];
      const appPassword = decrypt(accountData.app_password);

      // Publish to WordPress
      const wpPost = await wordpressApiService.createPost(
        accountData.site_url,
        accountData.username,
        appPassword,
        {
          title,
          content,
          status,
          categories,
          tags,
          excerpt,
          scheduledFor
        }
      );

      // Save post to our database
      const post = await pool.query(
        `INSERT INTO posts 
         (user_id, content, status, platforms, target_accounts, published_at, scheduled_for, 
          featured_image_url, excerpt, wp_categories, wp_tags, wp_post_id, wp_post_status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
         RETURNING *`,
        [
          userId,
          content,
          wpPost.status === 'publish' ? 'published' : 'draft',
          ['wordpress'],
          JSON.stringify([siteId]),
          wpPost.status === 'publish' ? new Date() : null,
          scheduledFor || null,
          null, // featured_image_url - will be added later
          excerpt,
          JSON.stringify(categories),
          JSON.stringify(tags),
          wpPost.id,
          wpPost.status
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Post published to WordPress successfully',
        post: {
          id: post.rows[0].id,
          wpPostId: wpPost.id,
          title: title,
          status: wpPost.status,
          url: wpPost.url,
          publishedAt: wpPost.date
        }
      });

    } catch (error) {
      console.error('WordPress publish error:', error);
      res.status(500).json({
        error: 'Failed to publish to WordPress',
        details: error.message
      });
    }
  },

  // Bulk publish to multiple WordPress sites
  async publishPostBulk(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { 
        siteIds, 
        title, 
        content, 
        status = 'publish', 
        categories = [], 
        tags = [],
        excerpt = '',
        scheduledFor 
      } = req.body;
      
      const userId = req.user.id;
      const results = [];

      console.log(`Starting bulk publish to ${siteIds.length} sites:`, siteIds);

      // Process each site sequentially to avoid overwhelming the API
      for (const siteId of siteIds) {
        try {
          // Get site credentials
          const account = await pool.query(
            'SELECT * FROM social_accounts WHERE id = $1 AND user_id = $2 AND platform = $3',
            [siteId, userId, 'wordpress']
          );

          if (account.rows.length === 0) {
            results.push({
              siteId,
              success: false,
              error: 'WordPress site not found or access denied'
            });
            continue;
          }

          const accountData = account.rows[0];
          const appPassword = decrypt(accountData.app_password);

          // Publish to WordPress
          const wpPost = await wordpressApiService.createPost(
            accountData.site_url,
            accountData.username,
            appPassword,
            {
              title,
              content,
              status,
              categories,
              tags,
              excerpt,
              scheduledFor
            }
          );

          // Save post to our database
          const post = await pool.query(
            `INSERT INTO posts 
             (user_id, content, status, platforms, target_accounts, published_at, scheduled_for, 
              featured_image_url, excerpt, wp_categories, wp_tags, wp_post_id, wp_post_status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
             RETURNING *`,
            [
              userId,
              content,
              wpPost.status === 'publish' ? 'published' : 'draft',
              ['wordpress'],
              JSON.stringify([siteId]),
              wpPost.status === 'publish' ? new Date() : null,
              scheduledFor || null,
              null, // featured_image_url
              excerpt,
              JSON.stringify(categories),
              JSON.stringify(tags),
              wpPost.id,
              wpPost.status
            ]
          );

          results.push({
            siteId,
            siteName: accountData.site_title,
            success: true,
            post: {
              id: post.rows[0].id,
              wpPostId: wpPost.id,
              title: title,
              status: wpPost.status,
              url: wpPost.url,
              publishedAt: wpPost.date
            }
          });

          console.log(`Successfully published to site ${siteId} (${accountData.site_title})`);

        } catch (siteError) {
          console.error(`Failed to publish to site ${siteId}:`, siteError.message);
          results.push({
            siteId,
            success: false,
            error: siteError.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      // Always return 200 if we have results, even with partial failures
      const statusCode = results.length > 0 ? 200 : 500;
      
      res.status(statusCode).json({
        success: successCount > 0,
        message: `Published to ${successCount} of ${siteIds.length} sites${failureCount > 0 ? ` (${failureCount} failed)` : ''}`,
        results,
        summary: {
          total: siteIds.length,
          successful: successCount,
          failed: failureCount
        }
      });

    } catch (error) {
      console.error('WordPress bulk publish error:', error);
      res.status(500).json({
        error: 'Failed to publish to WordPress sites',
        details: error.message
      });
    }
  },

  // Get WordPress posts
  async getPosts(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { siteId, page = 1, perPage = 10 } = req.query;
      const userId = req.user.id;

      let query = `
        SELECT p.*, sa.site_title, sa.site_url 
        FROM posts p 
        JOIN social_accounts sa ON sa.id = ANY(
          SELECT jsonb_array_elements_text(p.target_accounts)::int
        )
        WHERE p.user_id = $1 AND sa.platform = 'wordpress'
      `;
      
      const values = [userId];
      let paramIndex = 2;

      if (siteId) {
        query += ` AND sa.id = $${paramIndex}`;
        values.push(siteId);
        paramIndex++;
      }

      query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(parseInt(perPage), (parseInt(page) - 1) * parseInt(perPage));

      const result = await pool.query(query, values);

      res.json({
        success: true,
        posts: result.rows,
        pagination: {
          page: parseInt(page),
          perPage: parseInt(perPage),
          total: result.rows.length
        }
      });

    } catch (error) {
      console.error('Get WordPress posts error:', error);
      res.status(500).json({
        error: 'Failed to fetch WordPress posts',
        details: error.message
      });
    }
  },

  // Update WordPress post
  async updatePost(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Implementation for updating WordPress posts
      res.status(501).json({
        error: 'Post update functionality coming soon'
      });

    } catch (error) {
      console.error('Update WordPress post error:', error);
      res.status(500).json({
        error: 'Failed to update WordPress post',
        details: error.message
      });
    }
  },

  // Delete WordPress post
  async deletePost(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Implementation for deleting WordPress posts
      res.status(501).json({
        error: 'Post deletion functionality coming soon'
      });

    } catch (error) {
      console.error('Delete WordPress post error:', error);
      res.status(500).json({
        error: 'Failed to delete WordPress post',
        details: error.message
      });
    }
  },

  // Upload media to WordPress
  async uploadMedia(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Implementation for media upload
      res.status(501).json({
        error: 'Media upload functionality coming soon'
      });

    } catch (error) {
      console.error('WordPress media upload error:', error);
      res.status(500).json({
        error: 'Failed to upload media to WordPress',
        details: error.message
      });
    }
  }
};

module.exports = wordpressController;