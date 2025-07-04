const axios = require('axios');
const crypto = require('crypto');

class MastodonService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.secretKey = process.env.ENCRYPTION_KEY;
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
      const response = await axios.post(`${instanceUrl}/api/v1/apps`, {
        client_name: 'Social Media Scheduler',
        redirect_uris: process.env.MASTODON_REDIRECT_URI,
        scopes: 'read write:statuses',
        website: 'http://localhost:3000'
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
      scope: 'read write:statuses',
      state: state
    });

    return `${instanceUrl}/oauth/authorize?${params.toString()}`;
  }

  async getAccessToken(instanceUrl, clientId, clientSecret, code) {
    try {
      const response = await axios.post(`${instanceUrl}/oauth/token`, {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: process.env.MASTODON_REDIRECT_URI,
        grant_type: 'authorization_code',
        code: code,
        scope: 'read write:statuses'
      });

      return response.data.access_token;
    } catch (error) {
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
      const formData = new FormData();
      formData.append('file', mediaFile);

      const response = await axios.post(`${instanceUrl}/api/v2/media`, formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data.id;
    } catch (error) {
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