const axios = require('axios');
const crypto = require('crypto');

class WordPressApiService {
  constructor() {
    this.defaultTimeout = 30000; // 30 seconds
  }

  /**
   * Create axios instance for WordPress site
   */
  createClient(siteUrl, username, appPassword) {
    const baseURL = siteUrl.endsWith('/') ? `${siteUrl}wp-json/wp/v2` : `${siteUrl}/wp-json/wp/v2`;
    
    return axios.create({
      baseURL,
      timeout: this.defaultTimeout,
      auth: {
        username: username,
        password: appPassword
      },
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SocialMediaScheduler/1.0'
      }
    });
  }

  /**
   * Verify WordPress site connectivity and credentials
   */
  async verifySite(siteUrl, username, appPassword) {
    try {
      const client = this.createClient(siteUrl, username, appPassword);
      
      // Test connection by fetching site info
      const [usersResponse, settingsResponse] = await Promise.all([
        client.get('/users/me'),
        client.get('/settings', { timeout: 10000 })
      ]);

      const user = usersResponse.data;
      const settings = settingsResponse.data;

      // Check if user has required capabilities
      const requiredCapabilities = ['publish_posts', 'upload_files'];
      const userCapabilities = user.capabilities || {};
      
      const missingCapabilities = requiredCapabilities.filter(cap => !userCapabilities[cap]);
      if (missingCapabilities.length > 0) {
        throw new Error(`Missing required capabilities: ${missingCapabilities.join(', ')}`);
      }

      return {
        success: true,
        site: {
          title: settings.title || 'WordPress Site',
          description: settings.description || '',
          url: settings.url || siteUrl,
          language: settings.language || 'en_US',
          timezone: settings.timezone_string || 'UTC'
        },
        user: {
          id: user.id,
          username: user.username,
          displayName: user.name,
          email: user.email,
          roles: user.roles || [],
          capabilities: Object.keys(userCapabilities).filter(cap => userCapabilities[cap])
        }
      };
    } catch (error) {
      console.error('WordPress site verification failed:', error.message);
      
      if (error.response) {
        const status = error.response.status;
        if (status === 401) {
          throw new Error('Invalid username or application password');
        } else if (status === 403) {
          throw new Error('Insufficient permissions to access WordPress site');
        } else if (status === 404) {
          throw new Error('WordPress REST API not found. Ensure the site has WordPress 5.6+ with REST API enabled');
        }
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to WordPress site. Please check the URL');
      }
      
      throw new Error(`Failed to verify WordPress site: ${error.message}`);
    }
  }

  /**
   * Fetch categories from WordPress site
   */
  async getCategories(siteUrl, username, appPassword) {
    try {
      const client = this.createClient(siteUrl, username, appPassword);
      const response = await client.get('/categories', {
        params: {
          per_page: 100, // Get up to 100 categories
          orderby: 'name',
          order: 'asc'
        }
      });

      return response.data.map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        count: category.count || 0,
        parent: category.parent || 0
      }));
    } catch (error) {
      console.error('Failed to fetch WordPress categories:', error.message);
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }
  }

  /**
   * Fetch tags from WordPress site
   */
  async getTags(siteUrl, username, appPassword) {
    try {
      const client = this.createClient(siteUrl, username, appPassword);
      const response = await client.get('/tags', {
        params: {
          per_page: 100, // Get up to 100 tags
          orderby: 'name',
          order: 'asc'
        }
      });

      return response.data.map(tag => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        description: tag.description || '',
        count: tag.count || 0
      }));
    } catch (error) {
      console.error('Failed to fetch WordPress tags:', error.message);
      throw new Error(`Failed to fetch tags: ${error.message}`);
    }
  }

  /**
   * Upload media to WordPress
   */
  async uploadMedia(siteUrl, username, appPassword, fileBuffer, filename, mimeType) {
    try {
      const client = this.createClient(siteUrl, username, appPassword);
      
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: filename,
        contentType: mimeType
      });

      const response = await client.post('/media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return {
        id: response.data.id,
        url: response.data.source_url,
        title: response.data.title?.rendered || filename,
        alt: response.data.alt_text || '',
        caption: response.data.caption?.rendered || ''
      };
    } catch (error) {
      console.error('Failed to upload media to WordPress:', error.message);
      throw new Error(`Failed to upload media: ${error.message}`);
    }
  }

  /**
   * Create a new WordPress post
   */
  async createPost(siteUrl, username, appPassword, postData) {
    try {
      const client = this.createClient(siteUrl, username, appPassword);
      
      const wpPostData = {
        title: postData.title,
        content: postData.content,
        status: postData.status || 'publish', // draft, publish, private, future
        excerpt: postData.excerpt || '',
        categories: postData.categories || [],
        tags: postData.tags || [],
        featured_media: postData.featuredImageId || null,
        date: postData.scheduledFor || null,
        comment_status: 'open',
        ping_status: 'open'
      };

      // If it's a scheduled post, set status to 'future'
      if (postData.scheduledFor && new Date(postData.scheduledFor) > new Date()) {
        wpPostData.status = 'future';
      }

      const response = await client.post('/posts', wpPostData);

      return {
        id: response.data.id,
        title: response.data.title?.rendered || '',
        content: response.data.content?.rendered || '',
        excerpt: response.data.excerpt?.rendered || '',
        status: response.data.status,
        url: response.data.link,
        date: response.data.date,
        modified: response.data.modified,
        categories: response.data.categories || [],
        tags: response.data.tags || [],
        featuredImageId: response.data.featured_media || null
      };
    } catch (error) {
      console.error('Failed to create WordPress post:', error.message);
      
      if (error.response) {
        const data = error.response.data;
        if (data.code === 'rest_cannot_create') {
          throw new Error('Insufficient permissions to create posts');
        } else if (data.code === 'rest_post_invalid_id') {
          throw new Error('Invalid category or tag ID provided');
        }
      }
      
      throw new Error(`Failed to create post: ${error.message}`);
    }
  }

  /**
   * Update an existing WordPress post
   */
  async updatePost(siteUrl, username, appPassword, postId, postData) {
    try {
      const client = this.createClient(siteUrl, username, appPassword);
      
      const wpPostData = {
        title: postData.title,
        content: postData.content,
        status: postData.status || 'publish',
        excerpt: postData.excerpt || '',
        categories: postData.categories || [],
        tags: postData.tags || [],
        featured_media: postData.featuredImageId || null
      };

      const response = await client.put(`/posts/${postId}`, wpPostData);

      return {
        id: response.data.id,
        title: response.data.title?.rendered || '',
        content: response.data.content?.rendered || '',
        excerpt: response.data.excerpt?.rendered || '',
        status: response.data.status,
        url: response.data.link,
        date: response.data.date,
        modified: response.data.modified,
        categories: response.data.categories || [],
        tags: response.data.tags || [],
        featuredImageId: response.data.featured_media || null
      };
    } catch (error) {
      console.error('Failed to update WordPress post:', error.message);
      throw new Error(`Failed to update post: ${error.message}`);
    }
  }

  /**
   * Delete a WordPress post
   */
  async deletePost(siteUrl, username, appPassword, postId) {
    try {
      const client = this.createClient(siteUrl, username, appPassword);
      const response = await client.delete(`/posts/${postId}`, {
        params: { force: true } // Permanently delete instead of moving to trash
      });

      return {
        id: response.data.id,
        deleted: true
      };
    } catch (error) {
      console.error('Failed to delete WordPress post:', error.message);
      throw new Error(`Failed to delete post: ${error.message}`);
    }
  }

  /**
   * Get posts from WordPress site
   */
  async getPosts(siteUrl, username, appPassword, options = {}) {
    try {
      const client = this.createClient(siteUrl, username, appPassword);
      
      const params = {
        per_page: options.perPage || 10,
        page: options.page || 1,
        orderby: options.orderBy || 'date',
        order: options.order || 'desc',
        status: options.status || 'publish'
      };

      const response = await client.get('/posts', { params });

      return {
        posts: response.data.map(post => ({
          id: post.id,
          title: post.title?.rendered || '',
          content: post.content?.rendered || '',
          excerpt: post.excerpt?.rendered || '',
          status: post.status,
          url: post.link,
          date: post.date,
          modified: post.modified,
          categories: post.categories || [],
          tags: post.tags || [],
          featuredImageId: post.featured_media || null
        })),
        totalPages: parseInt(response.headers['x-wp-totalpages'] || '1'),
        total: parseInt(response.headers['x-wp-total'] || '0')
      };
    } catch (error) {
      console.error('Failed to fetch WordPress posts:', error.message);
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }
  }

  /**
   * Create category if it doesn't exist
   */
  async createCategory(siteUrl, username, appPassword, categoryName, description = '') {
    try {
      const client = this.createClient(siteUrl, username, appPassword);
      
      const response = await client.post('/categories', {
        name: categoryName,
        description: description,
        slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      });

      return {
        id: response.data.id,
        name: response.data.name,
        slug: response.data.slug,
        description: response.data.description || ''
      };
    } catch (error) {
      // If category already exists, try to find it
      if (error.response && error.response.status === 400) {
        try {
          const existingCategories = await this.getCategories(siteUrl, username, appPassword);
          const existingCategory = existingCategories.find(cat => 
            cat.name.toLowerCase() === categoryName.toLowerCase()
          );
          
          if (existingCategory) {
            return existingCategory;
          }
        } catch (fetchError) {
          console.error('Failed to fetch existing categories:', fetchError.message);
        }
      }
      
      console.error('Failed to create WordPress category:', error.message);
      throw new Error(`Failed to create category: ${error.message}`);
    }
  }

  /**
   * Create tag if it doesn't exist
   */
  async createTag(siteUrl, username, appPassword, tagName, description = '') {
    try {
      const client = this.createClient(siteUrl, username, appPassword);
      
      const response = await client.post('/tags', {
        name: tagName,
        description: description,
        slug: tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      });

      return {
        id: response.data.id,
        name: response.data.name,
        slug: response.data.slug,
        description: response.data.description || ''
      };
    } catch (error) {
      // If tag already exists, try to find it
      if (error.response && error.response.status === 400) {
        try {
          const existingTags = await this.getTags(siteUrl, username, appPassword);
          const existingTag = existingTags.find(tag => 
            tag.name.toLowerCase() === tagName.toLowerCase()
          );
          
          if (existingTag) {
            return existingTag;
          }
        } catch (fetchError) {
          console.error('Failed to fetch existing tags:', fetchError.message);
        }
      }
      
      console.error('Failed to create WordPress tag:', error.message);
      throw new Error(`Failed to create tag: ${error.message}`);
    }
  }
}

module.exports = new WordPressApiService();