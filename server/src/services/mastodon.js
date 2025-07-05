const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');

class MastodonService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
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
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.createHash('sha256').update(this.secretKey).digest();
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async createApp(instanceUrl) {
    try {
      const redirectUri = process.env.MASTODON_REDIRECT_URI || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://socialmedia-p3ln.onrender.com/api/auth/mastodon/callback'
          : 'http://localhost:5000/api/auth/mastodon/callback');
      
      const response = await axios.post(`${instanceUrl}/api/v1/apps`, {
        client_name: 'Social Media Scheduler',
        redirect_uris: redirectUri,
        scopes: 'read write:statuses write:media',
        website: process.env.NODE_ENV === 'production' 
          ? 'https://sriramanathanhu.github.io/social_media'
          : 'http://localhost:3000'
      });

      return {
        client_id: response.data.client_id,
        client_secret: response.data.client_secret
      };
    } catch (error) {
      throw new Error(`Failed to create Mastodon app: ${error.message}`);
    }
  }

  getAuthUrl(instanceUrl, clientId, state) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: process.env.MASTODON_REDIRECT_URI,
      response_type: 'code',
      scope: 'read write:statuses write:media',
      state: state
    });

    return `${instanceUrl}/oauth/authorize?${params.toString()}`;
  }

  async getAccessToken(instanceUrl, clientId, clientSecret, code) {
    try {
      const redirectUri = process.env.MASTODON_REDIRECT_URI || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://socialmedia-p3ln.onrender.com/api/auth/mastodon/callback'
          : 'http://localhost:5000/api/auth/mastodon/callback');
      
      console.log('Getting access token with redirect URI:', redirectUri);
      
      const tokenData = {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code: code,
        scope: 'read write:statuses'
      };
      
      console.log('Token request data:', tokenData);
      
      const response = await axios.post(`${instanceUrl}/oauth/token`, tokenData);

      return response.data.access_token;
    } catch (error) {
      console.error('Access token error response:', error.response?.data);
      throw new Error(`Failed to get access token: ${error.message}`);
    }
  }

  async verifyCredentials(instanceUrl, accessToken) {
    try {
      const response = await axios.get(`${instanceUrl}/api/v1/accounts/verify_credentials`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return {
        id: response.data.id,
        username: response.data.username,
        display_name: response.data.display_name,
        avatar: response.data.avatar,
        url: response.data.url
      };
    } catch (error) {
      throw new Error(`Failed to verify credentials: ${error.message}`);
    }
  }

  async publishStatus(instanceUrl, accessToken, content, mediaIds = []) {
    try {
      const response = await axios.post(`${instanceUrl}/api/v1/statuses`, {
        status: content,
        media_ids: mediaIds,
        visibility: 'public'
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return {
        id: response.data.id,
        url: response.data.url,
        created_at: response.data.created_at
      };
    } catch (error) {
      throw new Error(`Failed to publish status: ${error.message}`);
    }
  }

  async uploadMedia(instanceUrl, accessToken, mediaFile) {
    try {
      console.log('Uploading media to Mastodon:', {
        instanceUrl,
        filename: mediaFile.originalname,
        size: mediaFile.size,
        mimetype: mediaFile.mimetype
      });

      const formData = new FormData();
      formData.append('file', mediaFile.buffer, {
        filename: mediaFile.originalname,
        contentType: mediaFile.mimetype
      });

      const response = await axios.post(`${instanceUrl}/api/v2/media`, formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...formData.getHeaders()
        }
      });

      console.log('Media uploaded successfully, ID:', response.data.id);
      return response.data.id;
    } catch (error) {
      console.error('Media upload error:', error.response?.data || error.message);
      throw new Error(`Failed to upload media: ${error.message}`);
    }
  }

  async getInstance(instanceUrl) {
    try {
      const response = await axios.get(`${instanceUrl}/api/v1/instance`);
      return {
        uri: response.data.uri,
        title: response.data.title,
        description: response.data.description,
        version: response.data.version,
        registrations: response.data.registrations
      };
    } catch (error) {
      throw new Error(`Failed to get instance info: ${error.message}`);
    }
  }
}

module.exports = new MastodonService();