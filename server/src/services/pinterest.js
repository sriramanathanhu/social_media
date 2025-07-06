const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
const ApiCredentials = require('../models/ApiCredentials');

class PinterestService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
    this.redirectUri = process.env.PINTEREST_REDIRECT_URI || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://socialmedia-p3ln.onrender.com/api/auth/pinterest/callback'
        : 'http://localhost:5000/api/auth/pinterest/callback');
    
    // Pinterest API endpoints
    this.baseUrl = 'https://api.pinterest.com/v5';
    this.oauthBaseUrl = 'https://www.pinterest.com/oauth';
  }

  async getCredentials() {
    // Try database first, fallback to environment variables
    const dbCredentials = await ApiCredentials.findByPlatform('pinterest');
    console.log('DB Credentials found:', dbCredentials ? 'YES' : 'NO');
    if (dbCredentials) {
      console.log('Using DB credentials - Client ID:', dbCredentials.client_id);
      return {
        clientId: dbCredentials.client_id,
        clientSecret: dbCredentials.client_secret
      };
    }

    // Fallback to environment variables - support both OAuth and direct access token
    const envClientId = process.env.PINTEREST_CLIENT_ID || process.env.PINTEREST_APP_ID;
    const envClientSecret = process.env.PINTEREST_CLIENT_SECRET;
    const envAccessToken = process.env.PINTEREST_ACCESS_TOKEN;
    
    console.log('ENV OAuth Credentials found:', envClientId && envClientSecret ? 'YES' : 'NO');
    console.log('ENV Access Token found:', envAccessToken ? 'YES' : 'NO');
    
    if (envAccessToken) {
      console.log('Using direct access token - App ID:', envClientId);
      return {
        clientId: envClientId,
        accessToken: envAccessToken,
        direct: true
      };
    }
    
    if (envClientId && envClientSecret) {
      console.log('Using ENV OAuth credentials - Client ID:', envClientId);
      return {
        clientId: envClientId,
        clientSecret: envClientSecret
      };
    }

    throw new Error('Pinterest API credentials not configured. Please add them in the admin settings or environment variables.');
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
      console.log('Decrypting data:', encryptedData ? encryptedData.substring(0, 50) + '...' : 'null/undefined');
      
      if (!encryptedData) {
        throw new Error('No encrypted data provided');
      }
      
      if (!encryptedData.includes(':')) {
        throw new Error('Invalid encrypted data format - missing colon separator');
      }
      
      const [ivHex, encrypted] = encryptedData.split(':');
      
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted data format - missing IV or encrypted data');
      }
      
      console.log('IV hex length:', ivHex.length);
      console.log('Encrypted data length:', encrypted.length);
      
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.createHash('sha256').update(this.secretKey).digest();
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      console.log('Decryption successful');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error.message);
      throw new Error('Failed to decrypt token: ' + error.message);
    }
  }

  // Generate OAuth URL for Pinterest authorization
  async generateAuthUrl(state) {
    try {
      const credentials = await this.getCredentials();
      
      // If using direct access token, skip OAuth flow
      if (credentials.direct && credentials.accessToken) {
        console.log('Using direct access token, skipping OAuth URL generation');
        return null; // Signal that we should use direct access
      }
      
      const scopes = [
        'boards:read',
        'boards:write', 
        'pins:read',
        'pins:write',
        'user_accounts:read'
      ].join(',');

      const params = new URLSearchParams({
        client_id: credentials.clientId,
        redirect_uri: this.redirectUri,
        scope: scopes,
        response_type: 'code',
        state: state
      });

      const authUrl = `${this.oauthBaseUrl}?${params.toString()}`;
      console.log('Generated Pinterest OAuth URL:', authUrl);
      
      return authUrl;
    } catch (error) {
      console.error('Error generating Pinterest auth URL:', error);
      throw error;
    }
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code) {
    try {
      const { clientId, clientSecret } = await this.getCredentials();
      
      const tokenData = {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: this.redirectUri
      };

      console.log('Exchanging code for Pinterest token...');
      const response = await axios.post(`${this.oauthBaseUrl}/token`, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data && response.data.access_token) {
        console.log('Pinterest token exchange successful');
        return {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresIn: response.data.expires_in,
          scope: response.data.scope
        };
      } else {
        throw new Error('Invalid response from Pinterest token endpoint');
      }
    } catch (error) {
      console.error('Pinterest token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token: ' + 
        (error.response?.data?.error_description || error.message));
    }
  }

  // Get user profile information
  async getUserProfile(accessToken) {
    try {
      console.log('Getting Pinterest user profile...');
      const response = await axios.get(`${this.baseUrl}/user_account`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        console.log('Pinterest user profile retrieved successfully');
        return {
          id: response.data.id,
          username: response.data.username,
          profile_image: response.data.profile_image,
          website_url: response.data.website_url,
          account_type: response.data.account_type
        };
      } else {
        throw new Error('Invalid response from Pinterest user endpoint');
      }
    } catch (error) {
      console.error('Pinterest user profile error:', error.response?.data || error.message);
      throw new Error('Failed to get user profile: ' + 
        (error.response?.data?.message || error.message));
    }
  }

  // Alias for getUserProfile for consistency
  async getUserInfo(accessToken) {
    return this.getUserProfile(accessToken);
  }

  // Get user's boards
  async getUserBoards(accessToken) {
    try {
      console.log('Getting Pinterest user boards...');
      const response = await axios.get(`${this.baseUrl}/boards`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.items) {
        console.log('Pinterest boards retrieved successfully');
        return response.data.items.map(board => ({
          id: board.id,
          name: board.name,
          description: board.description,
          privacy: board.privacy
        }));
      } else {
        return [];
      }
    } catch (error) {
      console.error('Pinterest boards error:', error.response?.data || error.message);
      return []; // Return empty array on error, boards are optional
    }
  }

  // Create a pin
  async createPin(accessToken, pinData) {
    try {
      const { boardId, title, description, mediaUrl, link } = pinData;
      
      console.log('Creating Pinterest pin...');
      
      const payload = {
        board_id: boardId,
        title: title,
        description: description,
        link: link,
        media_source: {
          source_type: 'image_url',
          url: mediaUrl
        }
      };

      const response = await axios.post(`${this.baseUrl}/pins`, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        console.log('Pinterest pin created successfully:', response.data.id);
        return {
          id: response.data.id,
          url: response.data.url,
          title: response.data.title,
          description: response.data.description
        };
      } else {
        throw new Error('Invalid response from Pinterest pins endpoint');
      }
    } catch (error) {
      console.error('Pinterest pin creation error:', error.response?.data || error.message);
      throw new Error('Failed to create pin: ' + 
        (error.response?.data?.message || error.message));
    }
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      const { clientId, clientSecret } = await this.getCredentials();
      
      const tokenData = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      };

      console.log('Refreshing Pinterest token...');
      const response = await axios.post(`${this.oauthBaseUrl}/token`, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data && response.data.access_token) {
        console.log('Pinterest token refresh successful');
        return {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token || refreshToken, // Some might not return new refresh token
          expiresIn: response.data.expires_in
        };
      } else {
        throw new Error('Invalid response from Pinterest token refresh endpoint');
      }
    } catch (error) {
      console.error('Pinterest token refresh error:', error.response?.data || error.message);
      throw new Error('Failed to refresh token: ' + 
        (error.response?.data?.error_description || error.message));
    }
  }

  // Validate access token
  async validateToken(accessToken) {
    try {
      const profile = await this.getUserProfile(accessToken);
      return !!profile.id;
    } catch (error) {
      console.error('Pinterest token validation failed:', error.message);
      return false;
    }
  }
}

module.exports = new PinterestService();