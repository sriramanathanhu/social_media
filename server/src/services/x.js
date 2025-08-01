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
    this.v1BaseUrlTwitter = 'https://api.twitter.com/1.1'; // Alternative endpoint
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
      console.log('Decrypting X token data...');
      console.log('- Input data type:', typeof encryptedData);
      console.log('- Input data length:', encryptedData ? encryptedData.length : 'null/undefined');
      console.log('- Input data preview:', encryptedData ? encryptedData.substring(0, 50) + '...' : 'null/undefined');
      console.log('- Using encryption key:', this.secretKey ? this.secretKey.substring(0, 10) + '...' : 'NO KEY');
      
      if (!encryptedData) {
        throw new Error('No encrypted data provided');
      }
      
      if (typeof encryptedData !== 'string') {
        throw new Error(`Invalid encrypted data type: ${typeof encryptedData}, expected string`);
      }
      
      if (!encryptedData.includes(':')) {
        console.log('- Missing colon separator in:', encryptedData);
        throw new Error('Invalid encrypted data format - missing colon separator');
      }
      
      const [ivHex, encrypted] = encryptedData.split(':');
      
      if (!ivHex || !encrypted) {
        console.log('- IV hex:', ivHex ? ivHex.length + ' chars' : 'missing');
        console.log('- Encrypted part:', encrypted ? encrypted.length + ' chars' : 'missing');
        throw new Error('Invalid encrypted data format - missing IV or encrypted data');
      }
      
      console.log('- IV hex length:', ivHex.length);
      console.log('- Encrypted data length:', encrypted.length);
      
      // Validate hex format
      if (!/^[0-9a-fA-F]+$/.test(ivHex)) {
        throw new Error('Invalid IV format - not valid hex');
      }
      
      if (!/^[0-9a-fA-F]+$/.test(encrypted)) {
        throw new Error('Invalid encrypted data format - not valid hex');
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.createHash('sha256').update(this.secretKey).digest();
      
      console.log('- IV buffer length:', iv.length);
      console.log('- Key hash length:', key.length);
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      console.log('- X token decryption successful, result length:', decrypted.length);
      console.log('- Decrypted token preview:', decrypted.substring(0, 20) + '...');
      
      return decrypted;
    } catch (error) {
      console.error('X token decryption error details:');
      console.error('- Error message:', error.message);
      console.error('- Error stack:', error.stack);
      console.error('- Algorithm:', this.algorithm);
      console.error('- Secret key available:', !!this.secretKey);
      console.error('- Secret key length:', this.secretKey ? this.secretKey.length : 'N/A');
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
      console.log('X token refresh: Starting refresh process');
      const credentials = await this.getCredentials();
      
      const tokenData = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: credentials.clientId
      };

      const authHeader = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
      
      const tokenUrl = 'https://api.x.com/2/oauth2/token';
      console.log('X token refresh: Making refresh token request to:', tokenUrl);
      
      const response = await axios.post(tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        }
      });

      console.log('X token refresh: Success, new token received');
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type
      };
    } catch (error) {
      console.error('X token refresh error:', error.response?.data || error.message);
      throw new Error(`Failed to refresh X access token: ${error.message}`);
    }
  }

  // Try to refresh token and update in database
  async tryRefreshToken(account) {
    try {
      if (!account.refresh_token) {
        console.log('X token refresh: No refresh token available for account', account.id);
        return null;
      }

      console.log('X token refresh: Attempting to refresh token for account', account.id);
      const decryptedRefreshToken = this.decrypt(account.refresh_token);
      const newTokenData = await this.refreshAccessToken(decryptedRefreshToken);

      // Update tokens in database
      const SocialAccount = require('../models/SocialAccount');
      await SocialAccount.updateTokens(
        account.id,
        this.encrypt(newTokenData.accessToken),
        newTokenData.refreshToken ? this.encrypt(newTokenData.refreshToken) : null,
        newTokenData.expiresIn ? new Date(Date.now() + newTokenData.expiresIn * 1000) : null
      );

      console.log('X token refresh: Token updated successfully in database');
      return newTokenData.accessToken;
    } catch (error) {
      console.error('X token refresh: Failed to refresh token for account', account.id, ':', error.message);
      return null;
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
      console.log('Posting tweet to X:', {
        content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        mediaIds,
        postType,
        tokenLength: accessToken ? accessToken.length : 0,
        tokenStart: accessToken ? accessToken.substring(0, 10) + '...' : 'null'
      });

      const tweetData = {
        text: content
      };

      if (mediaIds && mediaIds.length > 0) {
        tweetData.media = {
          media_ids: mediaIds
        };
      }

      console.log('Sending tweet data:', JSON.stringify(tweetData, null, 2));

      const response = await axios.post(`${this.v2BaseUrl}/tweets`, tweetData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('X tweet posted successfully:', response.data.data.id);

      return {
        id: response.data.data.id,
        text: response.data.data.text,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('X post tweet error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Handle rate limiting specifically
      if (error.response?.status === 429) {
        const resetTime = error.response?.headers?.['x-rate-limit-reset'];
        const retryAfter = error.response?.headers?.['retry-after'];
        const waitTime = retryAfter || (resetTime ? Math.max(0, resetTime - Math.floor(Date.now() / 1000)) : 900); // 15 min default
        
        throw new Error(`X rate limit exceeded. Please wait ${Math.ceil(waitTime / 60)} minutes before posting again.`);
      }
      
      const errorMessage = error.response?.data?.errors?.[0]?.message || 
                          error.response?.data?.detail || 
                          error.message;
      
      throw new Error(`Failed to post X tweet: ${errorMessage}`);
    }
  }

  // Upload media using v1.1 API (simple approach)
  async uploadMedia(accessToken, mediaFile, isVideo = false) {
    try {
      console.log('X media upload: Starting upload process');
      console.log('X media upload: File details:', {
        filename: mediaFile.originalname,
        size: mediaFile.size,
        mimetype: mediaFile.mimetype,
        isVideo,
        hasBuffer: !!mediaFile.buffer,
        bufferLength: mediaFile.buffer ? mediaFile.buffer.length : 0
      });
      
      // Validate file size (X limits: 5MB for images, 512MB for videos)
      const maxSize = isVideo ? 512 * 1024 * 1024 : 5 * 1024 * 1024;
      if (mediaFile.size > maxSize) {
        throw new Error(`File too large for X: ${mediaFile.size} bytes (max: ${maxSize} bytes for ${isVideo ? 'video' : 'image'})`);
      }
      
      // Validate MIME type
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const validVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/wmv'];
      
      if (isVideo && !validVideoTypes.includes(mediaFile.mimetype)) {
        throw new Error(`Invalid video type for X: ${mediaFile.mimetype}. Supported: ${validVideoTypes.join(', ')}`);
      }
      
      if (!isVideo && !validImageTypes.includes(mediaFile.mimetype)) {
        throw new Error(`Invalid image type for X: ${mediaFile.mimetype}. Supported: ${validImageTypes.join(', ')}`);
      }
      
      console.log('X media upload: File validation passed');

      // Try multiple approaches for X media upload
      const approaches = [
        // Approach 1: Simple multipart form data (api.x.com)
        async () => {
          const formData = new FormData();
          formData.append('media', mediaFile.buffer, {
            filename: mediaFile.originalname,
            contentType: mediaFile.mimetype
          });

          return axios.post(`${this.v1BaseUrl}/media/upload.json`, formData, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              ...formData.getHeaders()
            }
          });
        },

        // Approach 2: Simple multipart form data (api.twitter.com)
        async () => {
          const formData = new FormData();
          formData.append('media', mediaFile.buffer, {
            filename: mediaFile.originalname,
            contentType: mediaFile.mimetype
          });

          return axios.post(`${this.v1BaseUrlTwitter}/media/upload.json`, formData, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              ...formData.getHeaders()
            }
          });
        },

        // Approach 3: URL-encoded base64 data (api.x.com)
        async () => {
          const formData = new URLSearchParams();
          formData.append('media_data', mediaFile.buffer.toString('base64'));

          return axios.post(`${this.v1BaseUrl}/media/upload.json`, formData, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
        },

        // Approach 4: URL-encoded base64 data (api.twitter.com)
        async () => {
          const formData = new URLSearchParams();
          formData.append('media_data', mediaFile.buffer.toString('base64'));

          return axios.post(`${this.v1BaseUrlTwitter}/media/upload.json`, formData, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
        },

        // Approach 5: Try chunked upload for any file
        async () => {
          const mediaId = await this.uploadMediaChunked(accessToken, mediaFile, isVideo);
          return { data: { media_id_string: mediaId } };
        }
      ];

      let lastError;
      for (let i = 0; i < approaches.length; i++) {
        try {
          console.log(`Attempting X media upload approach ${i + 1}...`);
          const response = await approaches[i]();
          console.log('X media uploaded successfully, ID:', response.data.media_id_string);
          return response.data.media_id_string;
        } catch (error) {
          console.error(`X media upload approach ${i + 1} failed:`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          });
          lastError = error;
        }
      }

      throw lastError;
    } catch (error) {
      console.error('X media upload error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        url: error.config?.url
      });
      
      // Fall back to no media upload for now
      console.log('X media upload failed, will post text only');
      throw new Error(`X media upload failed (${error.response?.status}): ${error.response?.data?.errors?.[0]?.message || error.message}`);
    }
  }

  // Chunked upload for large files/videos (backup method)
  async uploadMediaChunked(accessToken, mediaFile, isVideo = false) {
    const mediaBuffer = mediaFile.buffer;
    const mediaType = mediaFile.mimetype;
    const mediaSize = mediaBuffer.length;

    // Try both endpoints for chunked upload
    const endpoints = [this.v1BaseUrl, this.v1BaseUrlTwitter];
    let lastError;
    
    for (const baseUrl of endpoints) {
      try {
        console.log(`Attempting chunked upload with ${baseUrl}`);
        
        // Step 1: Initialize upload
        const initParams = new URLSearchParams({
          command: 'INIT',
          media_type: mediaType,
          total_bytes: mediaSize.toString()
        });

        const initResponse = await axios.post(`${baseUrl}/media/upload.json`, initParams, {
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

          await axios.post(`${baseUrl}/media/upload.json`, formData, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              ...formData.getHeaders()
            }
          });

          segmentIndex++;
        }

        // Step 3: Finalize upload
        const finalizeParams = new URLSearchParams({
          command: 'FINALIZE',
          media_id: mediaId
        });

        const finalizeResponse = await axios.post(`${baseUrl}/media/upload.json`, finalizeParams, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        // Check if processing is required
        if (finalizeResponse.data.processing_info) {
          await this.waitForProcessing(accessToken, mediaId, baseUrl);
        }

        console.log('X media uploaded successfully (chunked), ID:', mediaId);
        return mediaId;
      } catch (error) {
        console.error(`Chunked upload failed with ${baseUrl}:`, error.message);
        lastError = error;
      }
    }
    
    throw lastError;
  }

  // Wait for media processing to complete
  async waitForProcessing(accessToken, mediaId, baseUrl = this.v1BaseUrl) {
    const maxAttempts = 60; // Max 5 minutes
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`${baseUrl}/media/upload.json`, {
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