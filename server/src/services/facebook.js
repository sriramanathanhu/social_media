const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
const ApiCredentials = require('../models/ApiCredentials');

class FacebookService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
    this.redirectUri = process.env.FACEBOOK_REDIRECT_URI || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://socialmedia-p3ln.onrender.com/api/auth/facebook/callback'
        : 'http://localhost:5000/api/auth/facebook/callback');
    
    // Facebook API endpoints
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.oauthBaseUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
    this.tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
    
    // Required permissions for Facebook Pages and Instagram
    this.scopes = [
      'pages_manage_posts',
      'pages_read_engagement', 
      'pages_show_list',
      'instagram_basic',
      'instagram_content_publish',
      'business_management'
    ].join(',');
  }

  async getCredentials() {
    // Try database first, fallback to environment variables
    const dbCredentials = await ApiCredentials.findByPlatform('facebook');
    console.log('Facebook DB Credentials found:', dbCredentials ? 'YES' : 'NO');
    if (dbCredentials) {
      console.log('Using Facebook DB credentials - Client ID:', dbCredentials.client_id);
      return {
        clientId: dbCredentials.client_id,
        clientSecret: dbCredentials.client_secret
      };
    }

    // Fallback to environment variables
    const envClientId = process.env.FACEBOOK_CLIENT_ID;
    const envClientSecret = process.env.FACEBOOK_CLIENT_SECRET;
    console.log('Facebook ENV Credentials found:', envClientId ? 'YES' : 'NO');
    if (envClientId && envClientSecret) {
      console.log('Using Facebook ENV credentials - Client ID:', envClientId);
      return {
        clientId: envClientId,
        clientSecret: envClientSecret
      };
    }

    throw new Error('Facebook API credentials not configured. Please add them in the admin settings or environment variables.');
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(this.secretKey).digest();
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedData) {
    try {
      console.log('Decrypting Facebook token data...');
      
      if (!encryptedData) {
        throw new Error('No encrypted data provided');
      }
      
      if (typeof encryptedData !== 'string') {
        throw new Error(`Invalid encrypted data type: ${typeof encryptedData}, expected string`);
      }
      
      if (!encryptedData.includes(':')) {
        throw new Error('Invalid encrypted data format - missing colon separator');
      }
      
      const [ivHex, encrypted] = encryptedData.split(':');
      
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted data format - missing IV or encrypted data');
      }
      
      // Validate hex format
      if (!/^[0-9a-fA-F]+$/.test(ivHex)) {
        throw new Error('Invalid IV format - not valid hex');
      }
      
      if (!/^[0-9a-fA-F]+$/.test(encrypted)) {
        throw new Error('Invalid encrypted data format - not valid hex');
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.createHash('sha256').update(this.secretKey).digest();
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      console.log('Facebook token decrypted successfully');
      return decrypted;
    } catch (error) {
      console.error('Facebook token decryption failed:', error.message);
      throw new Error(`Failed to decrypt Facebook token: ${error.message}`);
    }
  }

  async getAuthUrl(state) {
    const credentials = await this.getCredentials();
    
    const params = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      state: state,
      response_type: 'code'
    });

    const authUrl = `${this.oauthBaseUrl}?${params.toString()}`;
    console.log('Generated Facebook auth URL:', authUrl);
    return authUrl;
  }

  async getAccessToken(code, state) {
    try {
      console.log('Exchanging Facebook code for access token...');
      const credentials = await this.getCredentials();
      
      const params = {
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        redirect_uri: this.redirectUri,
        code: code
      };

      const response = await axios.get(this.tokenUrl, { params });
      console.log('Facebook token exchange successful');
      
      return response.data;
    } catch (error) {
      console.error('Facebook token exchange failed:', error.response?.data || error.message);
      throw new Error('Failed to exchange code for access token');
    }
  }

  async verifyCredentials(accessToken) {
    try {
      console.log('Verifying Facebook credentials...');
      
      // Get user profile
      const userResponse = await axios.get(`${this.baseUrl}/me`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,email'
        }
      });

      // Get user's managed pages
      const pagesResponse = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,access_token,category,followers_count,verification_status'
        }
      });

      const userData = userResponse.data;
      const pagesData = pagesResponse.data.data || [];

      console.log('Facebook verification successful:', userData.name);
      console.log('Found Facebook Pages:', pagesData.length);

      return {
        user: userData,
        pages: pagesData
      };
    } catch (error) {
      console.error('Facebook credential verification failed:', error.response?.data || error.message);
      throw new Error('Failed to verify Facebook credentials');
    }
  }

  async publishPost(accountData, content, mediaFiles = [], postType = 'text', platformSpecificData = {}) {
    try {
      console.log('Publishing Facebook post...');
      console.log('Account:', accountData.id, accountData.username);
      console.log('Content length:', content.length);
      console.log('Media files:', mediaFiles.length);
      console.log('Post type:', postType);

      const accessToken = this.decrypt(accountData.access_token);
      
      // Parse platform-specific data for Facebook
      const facebookData = platformSpecificData.facebook || {};
      const pageId = facebookData.pageId || accountData.platform_user_id;
      
      if (!pageId) {
        throw new Error('Facebook Page ID is required for posting');
      }

      let postData = {
        message: content,
        access_token: accessToken
      };

      // Handle media uploads
      if (mediaFiles && mediaFiles.length > 0) {
        if (postType === 'image' || (postType === 'text' && mediaFiles.some(f => f.mimetype?.startsWith('image/')))) {
          // Handle image posts
          const imageFiles = mediaFiles.filter(f => f.mimetype?.startsWith('image/'));
          
          if (imageFiles.length === 1) {
            // Single image post
            const mediaId = await this.uploadPhoto(pageId, accessToken, imageFiles[0]);
            postData.object_attachment = mediaId;
          } else if (imageFiles.length > 1) {
            // Multiple images - create album
            const mediaIds = await Promise.all(
              imageFiles.map(file => this.uploadPhoto(pageId, accessToken, file))
            );
            postData.attached_media = mediaIds.map(id => ({ media_fbid: id }));
          }
        } else if (postType === 'video' || postType === 'reel') {
          // Handle video posts
          const videoFile = mediaFiles.find(f => f.mimetype?.startsWith('video/'));
          if (videoFile) {
            const videoId = await this.uploadVideo(pageId, accessToken, videoFile, content);
            // Video upload includes the message, so we return the video ID
            return { 
              success: true, 
              platformPostId: videoId, 
              platform: 'facebook',
              type: postType 
            };
          }
        }
      }

      // Post to Facebook Page
      const response = await axios.post(`${this.baseUrl}/${pageId}/feed`, postData);
      
      console.log('Facebook post published successfully:', response.data.id);
      
      return {
        success: true,
        platformPostId: response.data.id,
        platform: 'facebook',
        type: postType
      };

    } catch (error) {
      console.error('Facebook post publishing failed:', error.response?.data || error.message);
      throw new Error(`Failed to publish Facebook post: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async uploadPhoto(pageId, accessToken, photoFile) {
    try {
      console.log('Uploading photo to Facebook...');
      
      const formData = new FormData();
      formData.append('source', photoFile.buffer, {
        filename: photoFile.originalname,
        contentType: photoFile.mimetype
      });
      formData.append('published', 'false'); // Upload without publishing
      formData.append('access_token', accessToken);

      const response = await axios.post(`${this.baseUrl}/${pageId}/photos`, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      console.log('Facebook photo uploaded:', response.data.id);
      return response.data.id;
    } catch (error) {
      console.error('Facebook photo upload failed:', error.response?.data || error.message);
      throw new Error('Failed to upload photo to Facebook');
    }
  }

  async uploadVideo(pageId, accessToken, videoFile, description) {
    try {
      console.log('Uploading video to Facebook...');
      
      const formData = new FormData();
      formData.append('source', videoFile.buffer, {
        filename: videoFile.originalname,
        contentType: videoFile.mimetype
      });
      formData.append('description', description);
      formData.append('access_token', accessToken);

      const response = await axios.post(`${this.baseUrl}/${pageId}/videos`, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      console.log('Facebook video uploaded:', response.data.id);
      return response.data.id;
    } catch (error) {
      console.error('Facebook video upload failed:', error.response?.data || error.message);
      throw new Error('Failed to upload video to Facebook');
    }
  }

  async refreshToken(refreshToken) {
    try {
      console.log('Refreshing Facebook access token...');
      const credentials = await this.getCredentials();
      
      const params = {
        grant_type: 'fb_exchange_token',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        fb_exchange_token: refreshToken
      };

      const response = await axios.get(this.tokenUrl, { params });
      
      console.log('Facebook token refreshed successfully');
      return response.data;
    } catch (error) {
      console.error('Facebook token refresh failed:', error.response?.data || error.message);
      throw new Error('Failed to refresh Facebook token');
    }
  }

  async getUserPages(accessToken) {
    try {
      console.log('Fetching user Facebook Pages...');
      
      const response = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,access_token,category,followers_count,verification_status,picture'
        }
      });

      const pages = response.data.data || [];
      console.log('Found Facebook Pages:', pages.length);

      return pages;
    } catch (error) {
      console.error('Failed to fetch Facebook Pages:', error.response?.data || error.message);
      throw new Error('Failed to fetch Facebook Pages');
    }
  }

  async getPageAccessToken(userAccessToken, pageId) {
    try {
      console.log('Getting Facebook Page access token...');
      
      const response = await axios.get(`${this.baseUrl}/${pageId}`, {
        params: {
          access_token: userAccessToken,
          fields: 'access_token'
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get Facebook Page access token:', error.response?.data || error.message);
      throw new Error('Failed to get Facebook Page access token');
    }
  }
}

module.exports = new FacebookService();