const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
const ApiCredentials = require('../models/ApiCredentials');

class RedditService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
    this.redirectUri = process.env.REDDIT_REDIRECT_URI || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://socialmedia-p3ln.onrender.com/api/auth/reddit/callback'
        : 'http://localhost:5000/api/auth/reddit/callback');
    
    // Reddit API endpoints
    this.baseUrl = 'https://www.reddit.com/api/v1';
    this.oauthBaseUrl = 'https://www.reddit.com/api/v1/authorize';
    this.apiBaseUrl = 'https://oauth.reddit.com';
    
    // User agent is required by Reddit API
    this.userAgent = 'SocialMediaScheduler/1.0 (by /u/your-reddit-username)';
  }

  async getCredentials() {
    // Try database first, fallback to environment variables
    const dbCredentials = await ApiCredentials.findByPlatform('reddit');
    console.log('Reddit DB Credentials found:', dbCredentials ? 'YES' : 'NO');
    if (dbCredentials) {
      console.log('Using DB credentials - Client ID:', dbCredentials.client_id);
      return {
        clientId: dbCredentials.client_id,
        clientSecret: dbCredentials.client_secret
      };
    }

    // Fallback to environment variables
    const envClientId = process.env.REDDIT_CLIENT_ID;
    const envClientSecret = process.env.REDDIT_CLIENT_SECRET;
    console.log('Reddit ENV Credentials found:', envClientId ? 'YES' : 'NO');
    if (envClientId && envClientSecret) {
      console.log('Using ENV credentials - Client ID:', envClientId);
      return {
        clientId: envClientId,
        clientSecret: envClientSecret
      };
    }

    throw new Error('Reddit API credentials not configured. Please add them in the admin settings or environment variables.');
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
      console.log('Decrypting Reddit token data...');
      console.log('- Input data type:', typeof encryptedData);
      console.log('- Input data length:', encryptedData ? encryptedData.length : 'null/undefined');
      
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
      
      console.log('- Reddit token decryption successful, result length:', decrypted.length);
      
      return decrypted;
    } catch (error) {
      console.error('Reddit token decryption error details:');
      console.error('- Error message:', error.message);
      console.error('- Algorithm:', this.algorithm);
      console.error('- Secret key available:', !!this.secretKey);
      throw error;
    }
  }

  // Generate random state for OAuth security
  generateState() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate authorization URL
  async getAuthUrl(state) {
    const credentials = await this.getCredentials();
    
    const params = new URLSearchParams({
      client_id: credentials.clientId,
      response_type: 'code',
      state: state,
      redirect_uri: this.redirectUri,
      duration: 'permanent', // Request refresh token
      scope: 'identity submit read mysubreddits'
    });

    const authUrl = `${this.oauthBaseUrl}?${params.toString()}`;
    console.log('Generated Reddit OAuth URL:', authUrl);
    console.log('Redirect URI:', this.redirectUri);
    console.log('Client ID:', credentials.clientId);
    
    return authUrl;
  }

  // Exchange authorization code for access token
  async getAccessToken(code) {
    try {
      console.log('Getting Reddit access token with code:', code);
      const credentials = await this.getCredentials();
      
      const tokenData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri
      });

      // Reddit requires Basic auth with client credentials
      const authHeader = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
      
      const tokenUrl = 'https://www.reddit.com/api/v1/access_token';
      console.log('Making token request to:', tokenUrl);
      
      const response = await axios.post(tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`,
          'User-Agent': this.userAgent
        }
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
        scope: response.data.scope
      };
    } catch (error) {
      console.error('Reddit access token error:', error.response?.data || error.message);
      throw new Error(`Failed to get Reddit access token: ${error.message}`);
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      console.log('Reddit token refresh: Starting refresh process');
      const credentials = await this.getCredentials();
      
      const tokenData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      const authHeader = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
      
      const tokenUrl = 'https://www.reddit.com/api/v1/access_token';
      console.log('Reddit token refresh: Making refresh token request to:', tokenUrl);
      
      const response = await axios.post(tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`,
          'User-Agent': this.userAgent
        }
      });

      console.log('Reddit token refresh: Success, new token received');
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshToken, // Reddit may not return new refresh token
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type
      };
    } catch (error) {
      console.error('Reddit token refresh error:', error.response?.data || error.message);
      throw new Error(`Failed to refresh Reddit access token: ${error.message}`);
    }
  }

  // Try to refresh token and update in database
  async tryRefreshToken(account) {
    try {
      if (!account.refresh_token) {
        console.log('Reddit token refresh: No refresh token available for account', account.id);
        return null;
      }

      console.log('Reddit token refresh: Attempting to refresh token for account', account.id);
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

      console.log('Reddit token refresh: Token updated successfully in database');
      return newTokenData.accessToken;
    } catch (error) {
      console.error('Reddit token refresh: Failed to refresh token for account', account.id, ':', error.message);
      return null;
    }
  }

  // Verify user credentials and get user info
  async verifyCredentials(accessToken) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/api/v1/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': this.userAgent
        }
      });

      const user = response.data;
      return {
        id: user.id,
        name: user.name,
        karma: user.total_karma || 0,
        created_utc: user.created_utc,
        is_gold: user.is_gold || false,
        is_mod: user.is_mod || false,
        has_verified_email: user.has_verified_email || false
      };
    } catch (error) {
      console.error('Reddit verify credentials error:', error.response?.data || error.message);
      throw new Error(`Failed to verify Reddit credentials: ${error.message}`);
    }
  }

  // Get user's subreddits
  async getUserSubreddits(accessToken, limit = 100) {
    try {
      console.log('Fetching Reddit user subreddits');
      
      const response = await axios.get(`${this.apiBaseUrl}/subreddits/mine/subscriber`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': this.userAgent
        },
        params: {
          limit: limit
        }
      });

      const subreddits = response.data.data.children.map(child => {
        const data = child.data;
        return {
          name: data.display_name,
          display_name: data.display_name_prefixed,
          title: data.title,
          description: data.public_description,
          subscribers: data.subscribers,
          submission_type: data.submission_type,
          can_submit: !data.user_is_banned && data.user_can_post_in_sr,
          is_moderator: data.user_is_moderator || false,
          over_18: data.over18 || false,
          created_utc: data.created_utc
        };
      });

      console.log(`Found ${subreddits.length} subreddits for user`);
      return subreddits;
    } catch (error) {
      console.error('Reddit get subreddits error:', error.response?.data || error.message);
      throw new Error(`Failed to get Reddit subreddits: ${error.message}`);
    }
  }

  // Submit a post to Reddit
  async submitPost(accessToken, subreddit, postData) {
    try {
      console.log('Submitting post to Reddit:', {
        subreddit,
        type: postData.kind,
        title: postData.title.substring(0, 50) + (postData.title.length > 50 ? '...' : '')
      });

      const submitData = new URLSearchParams({
        sr: subreddit,
        kind: postData.kind, // 'self' for text, 'link' for URL
        title: postData.title,
        nsfw: postData.nsfw || false,
        spoiler: postData.spoiler || false,
        api_type: 'json'
      });

      // Add content based on post type
      if (postData.kind === 'self') {
        submitData.append('text', postData.text || '');
      } else if (postData.kind === 'link') {
        submitData.append('url', postData.url);
      }

      // Add flair if provided
      if (postData.flair_id) {
        submitData.append('flair_id', postData.flair_id);
      }

      const response = await axios.post(`${this.apiBaseUrl}/api/submit`, submitData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': this.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data.json && response.data.json.errors && response.data.json.errors.length > 0) {
        const errors = response.data.json.errors;
        throw new Error(`Reddit API error: ${errors.map(err => err.join(': ')).join(', ')}`);
      }

      const postInfo = response.data.json.data;
      console.log('Reddit post submitted successfully:', postInfo.url);

      return {
        id: postInfo.id,
        name: postInfo.name,
        url: postInfo.url,
        permalink: `https://reddit.com${postInfo.permalink}`,
        created_utc: Math.floor(Date.now() / 1000)
      };
    } catch (error) {
      console.error('Reddit post submission error:', error.response?.data || error.message);
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        throw new Error('Reddit rate limit exceeded. Please wait before posting again.');
      }
      
      const errorMessage = error.response?.data?.json?.errors?.[0]?.join(': ') || 
                          error.response?.data?.message || 
                          error.message;
      
      throw new Error(`Failed to submit Reddit post: ${errorMessage}`);
    }
  }

  // Get subreddit information
  async getSubredditInfo(accessToken, subredditName) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/r/${subredditName}/about`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': this.userAgent
        }
      });

      const data = response.data.data;
      return {
        name: data.display_name,
        title: data.title,
        description: data.public_description,
        subscribers: data.subscribers,
        submission_type: data.submission_type,
        over_18: data.over18,
        created_utc: data.created_utc,
        rules: [] // Rules require separate API call
      };
    } catch (error) {
      console.error('Reddit subreddit info error:', error.response?.data || error.message);
      throw new Error(`Failed to get subreddit info: ${error.message}`);
    }
  }
}

module.exports = new RedditService();