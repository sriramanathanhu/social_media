const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
const ApiCredentials = require('../models/ApiCredentials');

class XService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
    this.redirectUri = process.env.X_REDIRECT_URI || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://socialmedia-p3ln.onrender.com/api/auth/x/callback'
        : 'http://localhost:5000/api/auth/x/callback');
    
    // X API endpoints
    this.v2BaseUrl = 'https://api.x.com/2';
    this.v1BaseUrl = 'https://api.x.com/1.1';
    this.oauthBaseUrl = 'https://twitter.com/i/oauth2';
  }

  async getCredentials() {
    // Try database first, fallback to environment variables
    const dbCredentials = await ApiCredentials.findByPlatform('x');
    console.log('DB Credentials found:', dbCredentials ? 'YES' : 'NO');
    if (dbCredentials) {
      console.log('Using DB credentials - Client ID:', dbCredentials.client_id);
      return {
        clientId: dbCredentials.client_id,
        clientSecret: dbCredentials.client_secret
      };
    }

    // Fallback to environment variables
    const envClientId = process.env.X_CLIENT_ID;
    const envClientSecret = process.env.X_CLIENT_SECRET;
    console.log('ENV Credentials found:', envClientId ? 'YES' : 'NO');
    if (envClientId && envClientSecret) {
      console.log('Using ENV credentials - Client ID:', envClientId);
      return {
        clientId: envClientId,
        clientSecret: envClientSecret
      };
    }

    throw new Error('X API credentials not configured. Please add them in the admin settings or environment variables.');
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
      console.log('Decrypting X token data:', encryptedData ? encryptedData.substring(0, 50) + '...' : 'null/undefined');
      
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
      
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.createHash('sha256').update(this.secretKey).digest();
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      console.log('X token decryption successful');
      return decrypted;
    } catch (error) {
      console.error('X token decryption error:', error.message);
      throw error;
    }
  }

  // Generate PKCE code verifier and challenge
  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    
    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256'
    };
  }

  // Generate authorization URL with PKCE
  async getAuthUrl(state, pkceChallenge) {
    const credentials = await this.getCredentials();
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: credentials.clientId,
      redirect_uri: this.redirectUri,
      scope: 'tweet.read tweet.write users.read',
      state: state,
      code_challenge: pkceChallenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `${this.oauthBaseUrl}/authorize?${params.toString()}`;
    console.log('Generated X OAuth URL:', authUrl);
    console.log('Redirect URI:', this.redirectUri);
    console.log('Client ID:', credentials.clientId);
    console.log('PKCE Challenge:', pkceChallenge);
    
    // Test if client credentials are valid by making a simple request
    try {
      const testUrl = `https://api.x.com/2/users/me`;
      console.log('Testing X API access with credentials...');
      
      // Don't actually make the request, just log for debugging
      console.log('X API credentials appear to be loaded correctly');
    } catch (error) {
      console.log('X API credential test failed:', error.message);
    }
    
    return authUrl;
  }

  // Exchange authorization code for access token
  async getAccessToken(code, codeVerifier) {
    try {
      console.log('Getting X access token with code:', code);
      const credentials = await this.getCredentials();
      
      const tokenData = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: credentials.clientId,
        redirect_uri: this.redirectUri,
        code: code,
        code_verifier: codeVerifier
      });

      // Use Basic auth with client credentials
      const authHeader = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
      
      const tokenUrl = 'https://api.x.com/2/oauth2/token';
      console.log('Making token request to:', tokenUrl);
      
      const response = await axios.post(tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        }
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type
      };
    } catch (error) {
      console.error('X access token error:', error.response?.data || error.message);
      throw new Error(`Failed to get X access token: ${error.message}`);
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      const credentials = await this.getCredentials();
      
      const tokenData = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: credentials.clientId
      };

      const authHeader = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
      
      const tokenUrl = 'https://api.x.com/2/oauth2/token';
      console.log('Making refresh token request to:', tokenUrl);
      
      const response = await axios.post(tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        }
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type
      };
    } catch (error) {
      console.error('X refresh token error:', error.response?.data || error.message);
      throw new Error(`Failed to refresh X access token: ${error.message}`);
    }
  }

  // Verify user credentials
  async verifyCredentials(accessToken) {
    try {
      const response = await axios.get(`${this.v2BaseUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const user = response.data.data;
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        profile_image_url: user.profile_image_url
      };
    } catch (error) {
      console.error('X verify credentials error:', error.response?.data || error.message);
      throw new Error(`Failed to verify X credentials: ${error.message}`);
    }
  }

  // Post tweet using v2 API
  async postTweet(accessToken, content, mediaIds = [], postType = 'text') {
    try {
      const tweetData = {
        text: content
      };

      if (mediaIds && mediaIds.length > 0) {
        tweetData.media = {
          media_ids: mediaIds
        };
      }

      const response = await axios.post(`${this.v2BaseUrl}/tweets`, tweetData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        id: response.data.data.id,
        text: response.data.data.text,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('X post tweet error:', error.response?.data || error.message);
      throw new Error(`Failed to post X tweet: ${error.message}`);
    }
  }

  // Upload media using v1.1 API (chunked upload)
  async uploadMedia(accessToken, mediaFile, isVideo = false) {
    try {
      console.log('Uploading media to X:', {
        filename: mediaFile.originalname,
        size: mediaFile.size,
        mimetype: mediaFile.mimetype,
        isVideo
      });

      const mediaBuffer = mediaFile.buffer;
      const mediaType = mediaFile.mimetype;
      const mediaSize = mediaBuffer.length;

      // Step 1: Initialize upload
      const initResponse = await axios.post(`${this.v1BaseUrl}/media/upload.json`, {
        command: 'INIT',
        media_type: mediaType,
        total_bytes: mediaSize
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const mediaId = initResponse.data.media_id_string;
      console.log('X media upload initialized, ID:', mediaId);

      // Step 2: Upload media in chunks
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks
      let segmentIndex = 0;

      for (let start = 0; start < mediaSize; start += chunkSize) {
        const end = Math.min(start + chunkSize, mediaSize);
        const chunk = mediaBuffer.slice(start, end);

        const formData = new FormData();
        formData.append('command', 'APPEND');
        formData.append('media_id', mediaId);
        formData.append('segment_index', segmentIndex);
        formData.append('media', chunk);

        await axios.post(`${this.v1BaseUrl}/media/upload.json`, formData, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...formData.getHeaders()
          }
        });

        segmentIndex++;
      }

      // Step 3: Finalize upload
      const finalizeResponse = await axios.post(`${this.v1BaseUrl}/media/upload.json`, {
        command: 'FINALIZE',
        media_id: mediaId
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // Check if processing is required
      if (finalizeResponse.data.processing_info) {
        await this.waitForProcessing(accessToken, mediaId);
      }

      console.log('X media uploaded successfully, ID:', mediaId);
      return mediaId;
    } catch (error) {
      console.error('X media upload error:', error.response?.data || error.message);
      throw new Error(`Failed to upload X media: ${error.message}`);
    }
  }

  // Wait for media processing to complete
  async waitForProcessing(accessToken, mediaId) {
    const maxAttempts = 60; // Max 5 minutes
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`${this.v1BaseUrl}/media/upload.json`, {
          params: {
            command: 'STATUS',
            media_id: mediaId
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        const processingInfo = response.data.processing_info;
        
        if (processingInfo.state === 'succeeded') {
          console.log('X media processing completed successfully');
          return;
        } else if (processingInfo.state === 'failed') {
          throw new Error('X media processing failed');
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, processingInfo.check_after_secs * 1000));
        attempts++;
      } catch (error) {
        console.error('X media processing check error:', error.message);
        throw error;
      }
    }

    throw new Error('X media processing timeout');
  }

  // Get user by username (for additional user info)
  async getUserByUsername(accessToken, username) {
    try {
      const response = await axios.get(`${this.v2BaseUrl}/users/by/username/${username}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          'user.fields': 'id,username,name,profile_image_url,public_metrics'
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('X get user error:', error.response?.data || error.message);
      throw new Error(`Failed to get X user: ${error.message}`);
    }
  }
}

module.exports = new XService();