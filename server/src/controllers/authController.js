const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const User = require('../models/User');
const SocialAccount = require('../models/SocialAccount');
const OAuthState = require('../models/OAuthState');
const mastodonService = require('../services/mastodon');
const xService = require('../services/x');
const pinterestService = require('../services/pinterest');
const blueskyService = require('../services/bluesky');
const facebookService = require('../services/facebook');
const instagramService = require('../services/instagram');
const redditService = require('../services/reddit');
const crypto = require('crypto');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await User.create(email, password);
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Account created successfully. Please wait for admin approval.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    console.log('Login request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('Login attempt for email:', email);
    
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check if user is approved
    if (user.status !== 'approved') {
      console.log('User not approved:', email, 'Status:', user.status);
      if (user.status === 'pending') {
        return res.status(403).json({ error: 'Account pending approval. Please contact an administrator.' });
      } else if (user.status === 'rejected') {
        return res.status(403).json({ error: 'Account access denied. Please contact an administrator.' });
      }
    }

    console.log('User found, verifying password...');
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    console.log('Password valid, generating token...');
    const token = generateToken(user.id);

    console.log('Login successful for user:', email);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const connectMastodon = async (req, res) => {
  try {
    const { instanceUrl } = req.body;
    
    if (!instanceUrl) {
      return res.status(400).json({ error: 'Instance URL is required' });
    }

    const normalizedUrl = instanceUrl.startsWith('http') 
      ? instanceUrl 
      : `https://${instanceUrl}`;

    const instanceInfo = await mastodonService.getInstance(normalizedUrl);
    const appCredentials = await mastodonService.createApp(normalizedUrl);
    
    // Create a state that includes both random data and user info
    const stateData = {
      random: crypto.randomBytes(16).toString('hex'),
      userId: req.user.id,
      timestamp: Date.now()
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    const authUrl = mastodonService.getAuthUrl(
      normalizedUrl, 
      appCredentials.client_id, 
      state
    );

    // Store OAuth data in database instead of session
    const stateKey = `mastodon_${stateData.random}`;
    await OAuthState.create(
      stateKey,
      req.user.id,
      'mastodon',
      normalizedUrl,
      appCredentials.client_id,
      appCredentials.client_secret
    );

    console.log('Storing OAuth state in database with key:', stateKey);
    console.log('User ID:', req.user.id);

    res.json({
      authUrl,
      instance: instanceInfo
    });
  } catch (error) {
    console.error('Mastodon connect error:', error);
    res.status(500).json({ error: 'Failed to connect to Mastodon instance' });
  }
};

const mastodonCallback = async (req, res) => {
  try {
    console.log('Mastodon callback received');
    console.log('Query params:', req.query);
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', req.session);
    
    const { code, state } = req.query;
    
    if (!code || !state) {
      console.log('Missing code or state in callback');
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=missing_parameters`);
    }

    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      console.log('Parsed state data:', stateData);
    } catch (error) {
      console.log('Invalid state format:', error);
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=invalid_state`);
    }

    // Check if state is too old (1 hour)
    if (Date.now() - stateData.timestamp > 60 * 60 * 1000) {
      console.log('State expired');
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=state_expired`);
    }

    const stateKey = `mastodon_${stateData.random}`;
    console.log('Looking for OAuth state with key:', stateKey);
    const oauthState = await OAuthState.findByStateKey(stateKey);
    
    if (!oauthState) {
      console.log('OAuth state not found in database');
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=session_expired`);
    }

    console.log('OAuth state found:', oauthState);

    // Get user from state data
    const userId = stateData.userId;
    if (!userId) {
      console.log('User ID missing from state');
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=user_missing`);
    }

    const accessToken = await mastodonService.getAccessToken(
      oauthState.instance_url,
      oauthState.client_id,
      oauthState.client_secret,
      code
    );

    const userInfo = await mastodonService.verifyCredentials(
      oauthState.instance_url,
      accessToken
    );

    console.log('Searching for existing account with:', {
      userId: oauthState.user_id,
      platform: 'mastodon',
      instanceUrl: oauthState.instance_url,
      username: userInfo.username
    });

    const existingAccount = await SocialAccount.findByPlatformUserAndUsername(
      oauthState.user_id,
      'mastodon',
      oauthState.instance_url,
      userInfo.username
    );

    console.log('Existing account check result:', existingAccount);
    console.log('User info from Mastodon:', userInfo);

    if (existingAccount.length > 0) {
      console.log('Updating existing account with ID:', existingAccount[0].id);
      await SocialAccount.updateTokens(existingAccount[0].id, accessToken);
    } else {
      console.log('Creating new account for user:', oauthState.user_id);
      const newAccount = await SocialAccount.create({
        userId: oauthState.user_id,
        platform: 'mastodon',
        instanceUrl: oauthState.instance_url,
        username: userInfo.username,
        displayName: userInfo.display_name,
        avatarUrl: userInfo.avatar,
        accessToken: mastodonService.encrypt(accessToken),
        refreshToken: null,
        tokenExpiresAt: null
      });
      console.log('New account created:', newAccount);
    }

    // Clean up OAuth state data
    await OAuthState.deleteByStateKey(stateKey);

    // Redirect to frontend with success message
    res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?connected=mastodon`);
  } catch (error) {
    console.error('Mastodon callback error:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Clean up OAuth state on error
    try {
      const { state } = req.query;
      if (state) {
        const parsedState = JSON.parse(Buffer.from(state, 'base64').toString());
        if (parsedState?.random) {
          await OAuthState.deleteByStateKey(`mastodon_${parsedState.random}`);
        }
      }
    } catch (cleanupError) {
      console.error('Error cleaning up OAuth state:', cleanupError);
    }
    
    // Redirect to frontend with error
    res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=connection_failed`);
  }
};

const connectX = async (req, res) => {
  try {
    console.log('Connecting X account for user:', req.user.id);
    
    // Generate PKCE parameters
    const pkce = xService.generatePKCE();
    
    // Create state data
    const stateData = {
      random: crypto.randomBytes(16).toString('hex'),
      userId: req.user.id,
      timestamp: Date.now()
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    // Generate authorization URL
    const authUrl = await xService.getAuthUrl(state, pkce.codeChallenge);
    
    // Store OAuth data in database
    const stateKey = `x_${stateData.random}`;
    await OAuthState.create(
      stateKey,
      req.user.id,
      'x',
      null, // X doesn't have instance URLs
      null, // client_id stored in env
      null, // client_secret stored in env
      pkce.codeVerifier // Store code verifier for PKCE
    );
    
    console.log('X OAuth state stored with key:', stateKey);
    
    res.json({
      authUrl
    });
  } catch (error) {
    console.error('X connect error:', error);
    res.status(500).json({ error: 'Failed to connect to X' });
  }
};

const xCallback = async (req, res) => {
  try {
    console.log('X callback received');
    console.log('Query params:', req.query);
    
    const { code, state } = req.query;
    
    if (!code || !state) {
      console.log('Missing code or state in X callback');
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=missing_parameters`);
    }
    
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      console.log('Parsed X state data:', stateData);
    } catch (error) {
      console.log('Invalid X state format:', error);
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=invalid_state`);
    }
    
    // Check if state is too old (1 hour)
    if (Date.now() - stateData.timestamp > 60 * 60 * 1000) {
      console.log('X state expired');
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=state_expired`);
    }
    
    const stateKey = `x_${stateData.random}`;
    console.log('Looking for X OAuth state with key:', stateKey);
    const oauthState = await OAuthState.findByStateKey(stateKey);
    
    if (!oauthState) {
      console.log('X OAuth state not found in database');
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=session_expired`);
    }
    
    console.log('X OAuth state found:', oauthState);
    
    // Get user from state data
    const userId = stateData.userId;
    if (!userId) {
      console.log('User ID missing from X state');
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=user_missing`);
    }
    
    // Exchange code for access token using PKCE
    console.log('Exchanging X authorization code for access token...');
    const tokenData = await xService.getAccessToken(code, oauthState.extra_data);
    console.log('X token data received:', {
      hasAccessToken: !!tokenData.accessToken,
      accessTokenLength: tokenData.accessToken ? tokenData.accessToken.length : 0,
      hasRefreshToken: !!tokenData.refreshToken,
      expiresIn: tokenData.expiresIn,
      tokenType: tokenData.tokenType
    });
    
    // Verify credentials
    console.log('Verifying X credentials with access token...');
    const userInfo = await xService.verifyCredentials(tokenData.accessToken);
    
    console.log('X user info:', userInfo);
    
    // Check for existing account
    const existingAccount = await SocialAccount.findByPlatformUserAndUsername(
      oauthState.user_id,
      'x',
      null, // X doesn't have instance URLs
      userInfo.username
    );
    
    console.log('Existing X account check result:', existingAccount);
    
    if (existingAccount.length > 0) {
      console.log('Updating existing X account with ID:', existingAccount[0].id);
      
      // Encrypt tokens with detailed logging
      console.log('Encrypting X access token for storage...');
      const encryptedAccessToken = xService.encrypt(tokenData.accessToken);
      console.log('Encrypted access token length:', encryptedAccessToken.length);
      console.log('Encrypted access token format check (has colon):', encryptedAccessToken.includes(':'));
      
      let encryptedRefreshToken = null;
      if (tokenData.refreshToken) {
        console.log('Encrypting X refresh token for storage...');
        encryptedRefreshToken = xService.encrypt(tokenData.refreshToken);
        console.log('Encrypted refresh token length:', encryptedRefreshToken.length);
      }
      
      console.log('Updating X account tokens in database...');
      await SocialAccount.updateTokens(
        existingAccount[0].id,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenData.expiresIn ? new Date(Date.now() + tokenData.expiresIn * 1000) : null
      );
      console.log('X account tokens updated successfully');
    } else {
      console.log('Creating new X account for user:', oauthState.user_id);
      
      // Encrypt tokens with detailed logging
      console.log('Encrypting X access token for new account...');
      const encryptedAccessToken = xService.encrypt(tokenData.accessToken);
      console.log('Encrypted access token length:', encryptedAccessToken.length);
      console.log('Encrypted access token format check (has colon):', encryptedAccessToken.includes(':'));
      
      let encryptedRefreshToken = null;
      if (tokenData.refreshToken) {
        console.log('Encrypting X refresh token for new account...');
        encryptedRefreshToken = xService.encrypt(tokenData.refreshToken);
        console.log('Encrypted refresh token length:', encryptedRefreshToken.length);
      }
      
      const accountData = {
        userId: oauthState.user_id,
        platform: 'x',
        instanceUrl: null,
        username: userInfo.username,
        displayName: userInfo.name,
        avatarUrl: userInfo.profile_image_url,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokenData.expiresIn ? new Date(Date.now() + tokenData.expiresIn * 1000) : null
      };
      
      console.log('Creating X account with data:', {
        ...accountData,
        accessToken: 'ENCRYPTED_' + accountData.accessToken.length + '_CHARS',
        refreshToken: accountData.refreshToken ? 'ENCRYPTED_' + accountData.refreshToken.length + '_CHARS' : null
      });
      
      const newAccount = await SocialAccount.create(accountData);
      console.log('New X account created successfully:', {
        id: newAccount.id,
        username: newAccount.username,
        platform: newAccount.platform
      });
    }
    
    // Clean up OAuth state data
    await OAuthState.deleteByStateKey(stateKey);
    
    // Redirect to frontend with success message
    res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?connected=x`);
  } catch (error) {
    console.error('X callback error:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Clean up OAuth state on error
    try {
      const { state } = req.query;
      if (state) {
        const parsedState = JSON.parse(Buffer.from(state, 'base64').toString());
        if (parsedState?.random) {
          await OAuthState.deleteByStateKey(`x_${parsedState.random}`);
        }
      }
    } catch (cleanupError) {
      console.error('Error cleaning up X OAuth state:', cleanupError);
    }
    
    // Redirect to frontend with error
    res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=connection_failed`);
  }
};

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

// Emergency admin promotion (one-time use with specific email)
const emergencyAdminPromote = async (req, res) => {
  try {
    const { email, secret } = req.body;
    
    // Only allow promotion for your specific email
    if (email !== 'sri.ramanatha@uskfoundation.or.ke') {
      return res.status(403).json({ error: 'Unauthorized email' });
    }
    
    // Simple secret check (you can use any value you want)
    if (secret !== 'promote-admin-2025') {
      return res.status(403).json({ error: 'Invalid secret' });
    }
    
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await User.makeAdmin(user.id);
    await User.updateUserStatus(user.id, 'approved');
    
    console.log(`🚀 Emergency admin promotion for ${email} completed`);
    res.json({ message: 'Admin promotion successful', user: { email, role: 'admin' } });
  } catch (error) {
    console.error('Emergency admin promotion error:', error);
    res.status(500).json({ error: 'Admin promotion failed' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

const connectPinterest = async (req, res) => {
  try {
    console.log('Connecting Pinterest account for user:', req.user.id);
    
    // Check if using direct access token
    console.log('Getting Pinterest credentials...');
    const credentials = await pinterestService.getCredentials();
    console.log('Pinterest credentials retrieved:', credentials.direct ? 'DIRECT ACCESS TOKEN' : 'OAUTH CREDENTIALS');
    if (credentials.direct && credentials.accessToken) {
      console.log('Using direct access token, creating account directly');
      
      // Use the access token directly to get user info
      console.log('Getting Pinterest user info with access token...');
      const userInfo = await pinterestService.getUserInfo(credentials.accessToken);
      console.log('Pinterest user info retrieved:', JSON.stringify(userInfo, null, 2));
      
      // Validate required fields
      if (!userInfo || !userInfo.username) {
        throw new Error('Pinterest user info missing required username field');
      }
      
      // Create or update Pinterest account
      const accountData = {
        userId: req.user.id,
        platform: 'pinterest',
        instanceUrl: null, // No instance URL for Pinterest
        username: userInfo.username,
        displayName: userInfo.username || userInfo.id || 'Pinterest User',
        avatarUrl: userInfo.profile_image || null,
        accessToken: pinterestService.encrypt(credentials.accessToken),
        refreshToken: null,
        tokenExpiresAt: null
      };
      
      console.log('Creating Pinterest account with data:', JSON.stringify(accountData, null, 2));
      const pinterestAccount = await SocialAccount.create(accountData);
      
      console.log('Pinterest account created/updated:', pinterestAccount.id);
      
      return res.json({
        success: true,
        message: 'Pinterest account connected successfully',
        account: {
          id: pinterestAccount.id,
          platform: 'pinterest',
          username: pinterestAccount.username,
          status: 'active'
        }
      });
    }
    
    // Standard OAuth flow
    // Create state data
    const stateData = {
      random: crypto.randomBytes(16).toString('hex'),
      userId: req.user.id,
      timestamp: Date.now()
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    // Generate authorization URL
    const authUrl = await pinterestService.generateAuthUrl(state);
    
    // Store OAuth data in database
    const stateKey = `pinterest_${stateData.random}`;
    await OAuthState.create(
      stateKey,
      req.user.id,
      'pinterest',
      null, // Pinterest doesn't have instance URLs
      null, // client_id stored in env or db
      null, // client_secret stored in env or db
      null // Pinterest doesn't use PKCE
    );
    
    console.log('Pinterest OAuth state stored with key:', stateKey);
    
    res.json({
      authUrl
    });
  } catch (error) {
    console.error('Pinterest connect error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({ error: 'Failed to connect to Pinterest: ' + error.message });
  }
};

const pinterestCallback = async (req, res) => {
  try {
    console.log('Pinterest callback received');
    console.log('Query params:', req.query);
    
    const { code, state } = req.query;
    
    if (!code || !state) {
      console.log('Missing code or state in Pinterest callback');
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=missing_parameters`);
    }
    
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      console.log('Parsed Pinterest state data:', stateData);
    } catch (error) {
      console.log('Invalid Pinterest state format:', error);
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=invalid_state`);
    }
    
    // Check if state is too old (1 hour)
    if (Date.now() - stateData.timestamp > 60 * 60 * 1000) {
      console.log('Pinterest state expired');
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=state_expired`);
    }
    
    const stateKey = `pinterest_${stateData.random}`;
    console.log('Looking for Pinterest OAuth state with key:', stateKey);
    const oauthState = await OAuthState.findByStateKey(stateKey);
    
    if (!oauthState) {
      console.log('Pinterest OAuth state not found in database');
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=session_expired`);
    }
    
    console.log('Pinterest OAuth state found:', oauthState);
    
    // Get user from state data
    const userId = stateData.userId;
    if (!userId) {
      console.log('User ID missing from Pinterest state');
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=user_missing`);
    }
    
    // Exchange code for access token
    const tokenData = await pinterestService.exchangeCodeForToken(code);
    
    // Get user profile
    const userInfo = await pinterestService.getUserProfile(tokenData.accessToken);
    
    console.log('Pinterest user info:', userInfo);
    
    // Check for existing account
    const existingAccount = await SocialAccount.findByPlatformUserAndUsername(
      oauthState.user_id,
      'pinterest',
      null, // Pinterest doesn't have instance URLs
      userInfo.username
    );
    
    if (existingAccount) {
      console.log('Updating existing Pinterest account:', existingAccount.id);
      
      // Update existing account
      await SocialAccount.updateTokens(
        existingAccount.id,
        pinterestService.encrypt(tokenData.accessToken),
        tokenData.refreshToken ? pinterestService.encrypt(tokenData.refreshToken) : null
      );
      
      // Update status and profile info
      await SocialAccount.updateStatus(existingAccount.id, 'active');
      
      console.log('Existing Pinterest account updated');
    } else {
      console.log('Creating new Pinterest account');
      
      // Create new account record
      const newAccount = await SocialAccount.create({
        user_id: oauthState.user_id,
        platform: 'pinterest',
        username: userInfo.username,
        access_token: pinterestService.encrypt(tokenData.accessToken),
        refresh_token: tokenData.refreshToken ? pinterestService.encrypt(tokenData.refreshToken) : null,
        profile_data: JSON.stringify({
          id: userInfo.id,
          username: userInfo.username,
          profile_image: userInfo.profile_image,
          website_url: userInfo.website_url,
          account_type: userInfo.account_type
        }),
        instance_url: null, // Pinterest doesn't have instance URLs
        status: 'active'
      });
      
      console.log('New Pinterest account created:', newAccount);
    }

    // Clean up OAuth state data
    await OAuthState.deleteByStateKey(stateKey);

    // Redirect to frontend with success message
    res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?connected=pinterest`);
  } catch (error) {
    console.error('Pinterest callback error:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Clean up OAuth state on error
    try {
      const { state } = req.query;
      if (state) {
        const parsedState = JSON.parse(Buffer.from(state, 'base64').toString());
        if (parsedState?.random) {
          await OAuthState.deleteByStateKey(`pinterest_${parsedState.random}`);
        }
      }
    } catch (cleanupError) {
      console.error('Error cleaning up OAuth state:', cleanupError);
    }
    
    // Redirect to frontend with error
    res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://sriramanathanhu.github.io/social_media' : 'http://localhost:3000'}/#/accounts?error=connection_failed`);
  }
};

const connectBluesky = async (req, res) => {
  try {
    console.log('Connecting Bluesky account for user:', req.user.id);
    
    const { handle, appPassword } = req.body;
    
    if (!handle || !appPassword) {
      return res.status(400).json({ error: 'Handle and app password are required' });
    }
    
    console.log('Attempting to create Bluesky session for:', handle);
    
    // Create session with Bluesky
    const sessionData = await blueskyService.createSession(handle, appPassword);
    
    console.log('Bluesky session created successfully');
    
    // Check for existing account
    const existingAccount = await SocialAccount.findByPlatformUserAndUsername(
      req.user.id,
      'bluesky',
      null, // Bluesky doesn't have instance URLs
      sessionData.handle
    );
    
    if (existingAccount.length > 0) {
      console.log('Bluesky account already exists for this user:', existingAccount[0].id);
      return res.status(409).json({ error: 'Bluesky account already connected for this user' });
    }
    
    console.log('Creating new Bluesky account');
    
    // Create new account record
    const newAccount = await SocialAccount.create({
      userId: req.user.id,
      platform: 'bluesky',
      instanceUrl: null,
      username: sessionData.handle,
      displayName: sessionData.displayName || sessionData.handle,
      avatarUrl: sessionData.session?.avatar || null,
      accessToken: blueskyService.encrypt ? blueskyService.encrypt(appPassword) : appPassword,
      refreshToken: null,
      tokenExpiresAt: null
    });
    
    console.log('New Bluesky account created successfully:', newAccount);
    
    // Store agent for this account
    blueskyService.setAgent(newAccount.id, sessionData.agent);
    
    res.json({
      success: true,
      message: 'Bluesky account connected successfully',
      account: {
        platform: 'bluesky',
        username: sessionData.handle,
        displayName: sessionData.displayName,
        status: 'active'
      }
    });
  } catch (error) {
    console.error('Bluesky connect error:', error);
    res.status(500).json({ error: 'Failed to connect to Bluesky: ' + error.message });
  }
};

const connectFacebook = async (req, res) => {
  try {
    console.log('Connecting Facebook account for user:', req.user.id);
    
    // Generate random state for OAuth security
    const random = crypto.randomBytes(32).toString('hex');
    const state = JSON.stringify({
      userId: req.user.id,
      random: random,
      platform: 'facebook'
    });
    
    const stateKey = `facebook_${random}`;
    
    // Store OAuth data in database
    await OAuthState.create(
      stateKey,
      req.user.id,
      'facebook',
      JSON.stringify({
        userId: req.user.id,
        random: random,
        platform: 'facebook'
      }),
      new Date(Date.now() + 15 * 60 * 1000) // 15 minutes expiry
    );
    
    console.log('Facebook OAuth state stored with key:', stateKey);
    
    // Get authorization URL from Facebook service
    const authUrl = await facebookService.getAuthUrl(state);
    
    res.json({
      authUrl: authUrl,
      state: stateKey
    });
  } catch (error) {
    console.error('Facebook connect error:', error);
    res.status(500).json({ error: 'Failed to initialize Facebook connection: ' + error.message });
  }
};

const facebookCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }
    
    // Parse state to get random value
    const parsedState = JSON.parse(state);
    const stateKey = `facebook_${parsedState.random}`;
    
    console.log('Looking for Facebook OAuth state with key:', stateKey);
    const oauthState = await OAuthState.findByStateKey(stateKey);
    
    if (!oauthState) {
      console.log('Facebook OAuth state not found in database');
      return res.status(400).json({ error: 'Invalid or expired authorization state' });
    }
    
    console.log('Facebook OAuth state found:', oauthState);
    
    // Clean up OAuth state data
    await OAuthState.deleteByStateKey(stateKey);
    
    // Exchange code for access token
    const tokenData = await facebookService.getAccessToken(code, state);
    
    // Verify credentials and get user info + pages
    const credentialData = await facebookService.verifyCredentials(tokenData.access_token);
    
    console.log('Facebook credentials verified for user:', credentialData.user.name);
    console.log('Found Facebook Pages:', credentialData.pages.length);
    
    // Create Facebook account record for the main account
    const newFacebookAccount = await SocialAccount.create({
      userId: oauthState.user_id,
      platform: 'facebook',
      instanceUrl: null,
      username: credentialData.user.name,
      displayName: credentialData.user.name,
      avatarUrl: null,
      accessToken: facebookService.encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? facebookService.encrypt(tokenData.refresh_token) : null,
      tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + (tokenData.expires_in * 1000)) : null,
      platformUserId: credentialData.user.id,
      platformData: JSON.stringify({
        pages: credentialData.pages.map(page => ({
          id: page.id,
          name: page.name,
          category: page.category,
          followers_count: page.followers_count
        }))
      })
    });
    
    console.log('Facebook account created successfully:', newFacebookAccount);
    
    // Also check for Instagram accounts via Facebook
    try {
      const instagramData = await instagramService.verifyCredentials(tokenData.access_token);
      
      if (instagramData.accounts && instagramData.accounts.length > 0) {
        console.log('Found Instagram accounts via Facebook:', instagramData.accounts.length);
        
        // Store Instagram accounts info for later connection
        // We'll handle Instagram connection separately through a dedicated dialog
      }
    } catch (instagramError) {
      console.log('No Instagram accounts found via Facebook (this is normal)');
    }
    
    res.json({
      success: true,
      message: 'Facebook account connected successfully',
      account: {
        platform: 'facebook',
        username: credentialData.user.name,
        displayName: credentialData.user.name,
        status: 'active',
        pagesCount: credentialData.pages.length
      }
    });
  } catch (error) {
    console.error('Facebook callback error:', error);
    
    // Clean up OAuth state on error
    try {
      if (req.query.state) {
        const parsedState = JSON.parse(req.query.state);
        await OAuthState.deleteByStateKey(`facebook_${parsedState.random}`);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up Facebook OAuth state:', cleanupError);
    }
    
    res.status(500).json({ error: 'Failed to connect Facebook account: ' + error.message });
  }
};

const connectInstagram = async (req, res) => {
  try {
    console.log('Connecting Instagram account for user:', req.user.id);
    
    const { facebookAccountId } = req.body;
    
    if (!facebookAccountId) {
      return res.status(400).json({ error: 'Facebook account ID is required to connect Instagram' });
    }
    
    // Get the user's Facebook account
    const facebookAccount = await SocialAccount.findByIdAndUserId(facebookAccountId, req.user.id);
    
    if (!facebookAccount || facebookAccount.platform !== 'facebook') {
      return res.status(400).json({ error: 'Valid Facebook account not found' });
    }
    
    // Decrypt Facebook access token
    const facebookAccessToken = facebookService.decrypt(facebookAccount.access_token);
    
    // Get Instagram accounts via Facebook
    const instagramAccounts = await instagramService.getInstagramAccounts(facebookAccessToken);
    
    if (instagramAccounts.length === 0) {
      return res.status(400).json({ 
        error: 'No Instagram Business accounts found. Please connect an Instagram Business account to your Facebook Page.' 
      });
    }
    
    // Return available Instagram accounts for user selection
    res.json({
      success: true,
      message: 'Instagram accounts found',
      instagramAccounts: instagramAccounts.map(account => ({
        id: account.id,
        username: account.username,
        name: account.name,
        followers_count: account.followers_count,
        account_type: account.account_type,
        page_id: account.page_id,
        page_name: account.page_name
      }))
    });
  } catch (error) {
    console.error('Instagram connect error:', error);
    res.status(500).json({ error: 'Failed to connect Instagram account: ' + error.message });
  }
};

const instagramCallback = async (req, res) => {
  try {
    const { facebookAccountId, instagramAccountId } = req.body;
    
    if (!facebookAccountId || !instagramAccountId) {
      return res.status(400).json({ error: 'Facebook account ID and Instagram account ID are required' });
    }
    
    // Get the user's Facebook account
    const facebookAccount = await SocialAccount.findByIdAndUserId(facebookAccountId, req.user.id);
    
    if (!facebookAccount || facebookAccount.platform !== 'facebook') {
      return res.status(400).json({ error: 'Valid Facebook account not found' });
    }
    
    // Decrypt Facebook access token
    const facebookAccessToken = facebookService.decrypt(facebookAccount.access_token);
    
    // Get Instagram accounts to find the selected one
    const instagramAccounts = await instagramService.getInstagramAccounts(facebookAccessToken);
    const selectedAccount = instagramAccounts.find(acc => acc.id === instagramAccountId);
    
    if (!selectedAccount) {
      return res.status(400).json({ error: 'Selected Instagram account not found' });
    }
    
    // Create Instagram account record
    const newInstagramAccount = await SocialAccount.create({
      userId: req.user.id,
      platform: 'instagram',
      instanceUrl: null,
      username: selectedAccount.username,
      displayName: selectedAccount.name || selectedAccount.username,
      avatarUrl: selectedAccount.profile_picture_url,
      accessToken: facebookService.encrypt(selectedAccount.page_access_token),
      refreshToken: null,
      tokenExpiresAt: null,
      platformUserId: selectedAccount.id,
      platformData: JSON.stringify({
        page_id: selectedAccount.page_id,
        page_name: selectedAccount.page_name,
        account_type: selectedAccount.account_type,
        followers_count: selectedAccount.followers_count,
        media_count: selectedAccount.media_count
      })
    });
    
    console.log('Instagram account created successfully:', newInstagramAccount);
    
    res.json({
      success: true,
      message: 'Instagram account connected successfully',
      account: {
        platform: 'instagram',
        username: selectedAccount.username,
        displayName: selectedAccount.name || selectedAccount.username,
        status: 'active',
        followers_count: selectedAccount.followers_count
      }
    });
  } catch (error) {
    console.error('Instagram callback error:', error);
    res.status(500).json({ error: 'Failed to connect Instagram account: ' + error.message });
  }
};

const connectReddit = async (req, res) => {
  try {
    console.log('Reddit connect request from user:', req.user.id);
    
    // Generate random string for OAuth state
    const random = crypto.randomBytes(16).toString('hex');
    const stateKey = `reddit_${random}`;
    const state = JSON.stringify({
      userId: req.user.id,
      random: random,
      platform: 'reddit'
    });
    
    // Store OAuth data in database - corrected parameter order
    await OAuthState.create(
      stateKey,
      req.user.id,
      'reddit',
      null, // instance_url
      process.env.REDDIT_CLIENT_ID,
      process.env.REDDIT_CLIENT_SECRET,
      state // extra_data
    );
    
    console.log('Reddit OAuth state stored with key:', stateKey);
    
    // Get authorization URL from Reddit service
    const authUrl = await redditService.getAuthUrl(state);
    
    console.log('🔗 Reddit OAuth URL generated:', authUrl);
    res.json({ authUrl });
  } catch (error) {
    console.error('Reddit connect error:', error);
    res.status(500).json({ error: 'Failed to initialize Reddit connection: ' + error.message });
  }
};

const redditCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }
    
    // Parse state to get random value
    const parsedState = JSON.parse(state);
    const stateKey = `reddit_${parsedState.random}`;
    
    console.log('Looking for Reddit OAuth state with key:', stateKey);
    const oauthState = await OAuthState.findByStateKey(stateKey);
    
    if (!oauthState) {
      console.log('Reddit OAuth state not found in database');
      return res.status(400).json({ error: 'Invalid or expired authorization state' });
    }
    
    console.log('Reddit OAuth state found:', oauthState);
    
    // Exchange code for access token
    const tokenData = await redditService.getAccessToken(code);
    console.log('Reddit access token received');
    
    // Get user information
    const userInfo = await redditService.verifyCredentials(tokenData.accessToken);
    console.log('Reddit user info received:', userInfo);
    
    // Check if account already exists using the correct method that includes username
    const existingAccount = await SocialAccount.findByPlatformUserAndUsername(
      oauthState.user_id,
      'reddit',
      null, // Reddit doesn't have instance URLs
      userInfo.name
    );
    
    // findByPlatformUserAndUsername returns an array, get first match
    const existingAccountRecord = existingAccount.length > 0 ? existingAccount[0] : null;
    
    if (existingAccountRecord) {
      console.log('Reddit account already exists, updating tokens');
      
      // Update existing account with new tokens
      await SocialAccount.updateTokens(
        existingAccountRecord.id,
        redditService.encrypt(tokenData.accessToken),
        tokenData.refreshToken ? redditService.encrypt(tokenData.refreshToken) : null,
        tokenData.expiresIn ? new Date(Date.now() + tokenData.expiresIn * 1000) : null
      );
      
      // Update Reddit-specific data
      await pool.query(
        `UPDATE social_accounts 
         SET reddit_karma = $1, reddit_created_utc = $2, reddit_is_gold = $3, 
             display_name = $4, status = 'active', updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [userInfo.karma, userInfo.created_utc, userInfo.is_gold, userInfo.name, existingAccountRecord.id]
      );
      
      await SocialAccount.updateLastUsed(existingAccountRecord.id);
      
      // Fetch and update user's subreddits
      try {
        console.log('Fetching Reddit subreddits for existing account:', existingAccountRecord.id);
        const subreddits = await redditService.getUserSubreddits(tokenData.accessToken);
        
        // Store/update subreddits in database
        for (const subreddit of subreddits) {
          await pool.query(
            `INSERT INTO reddit_subreddits 
             (account_id, subreddit_name, display_name, title, description, 
              subscribers, submission_type, can_submit, is_moderator, 
              over_18, created_utc) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (account_id, subreddit_name) 
             DO UPDATE SET 
               display_name = EXCLUDED.display_name,
               title = EXCLUDED.title,
               description = EXCLUDED.description,
               subscribers = EXCLUDED.subscribers,
               submission_type = EXCLUDED.submission_type,
               can_submit = EXCLUDED.can_submit,
               is_moderator = EXCLUDED.is_moderator,
               over_18 = EXCLUDED.over_18,
               last_synced = CURRENT_TIMESTAMP`,
            [
              existingAccountRecord.id,
              subreddit.name,
              subreddit.display_name,
              subreddit.title,
              subreddit.description,
              subreddit.subscribers,
              subreddit.submission_type,
              subreddit.can_submit,
              subreddit.is_moderator,
              subreddit.over_18,
              subreddit.created_utc
            ]
          );
        }
        
        console.log(`Successfully updated ${subreddits.length} subreddits for Reddit account ${existingAccountRecord.id}`);
      } catch (subredditError) {
        console.error('Failed to fetch/store Reddit subreddits for existing account:', subredditError);
        // Don't fail the entire OAuth flow if subreddit fetching fails
      }
      
      // Redirect to frontend instead of JSON response
      return res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://socialmedia.ecitizen.media' : 'http://localhost:3000'}/#/accounts?connected=reddit`);
    }
    
    // Create new account
    console.log('Creating new Reddit account');
    const newAccount = await SocialAccount.create({
      userId: oauthState.user_id,
      platform: 'reddit',
      instanceUrl: null,
      username: userInfo.name,
      displayName: userInfo.name,
      avatarUrl: null, // Reddit doesn't provide avatar URL in basic API
      accessToken: redditService.encrypt(tokenData.accessToken),
      refreshToken: tokenData.refreshToken ? redditService.encrypt(tokenData.refreshToken) : null,
      tokenExpiresAt: tokenData.expiresIn ? new Date(Date.now() + tokenData.expiresIn * 1000) : null,
      status: 'active'
    });
    
    // Update Reddit-specific data
    await pool.query(
      `UPDATE social_accounts 
       SET reddit_karma = $1, reddit_created_utc = $2, reddit_is_gold = $3
       WHERE id = $4`,
      [userInfo.karma, userInfo.created_utc, userInfo.is_gold, newAccount.id]
    );
    
    console.log('Reddit account created successfully:', newAccount);
    
    // Fetch and store user's subreddits
    try {
      console.log('Fetching Reddit subreddits for account:', newAccount.id);
      const subreddits = await redditService.getUserSubreddits(tokenData.accessToken);
      
      // Store subreddits in database
      for (const subreddit of subreddits) {
        await pool.query(
          `INSERT INTO reddit_subreddits 
           (account_id, subreddit_name, display_name, title, description, 
            subscribers, submission_type, can_submit, is_moderator, 
            over_18, created_utc) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (account_id, subreddit_name) 
           DO UPDATE SET 
             display_name = EXCLUDED.display_name,
             title = EXCLUDED.title,
             description = EXCLUDED.description,
             subscribers = EXCLUDED.subscribers,
             submission_type = EXCLUDED.submission_type,
             can_submit = EXCLUDED.can_submit,
             is_moderator = EXCLUDED.is_moderator,
             over_18 = EXCLUDED.over_18,
             last_synced = CURRENT_TIMESTAMP`,
          [
            newAccount.id,
            subreddit.name,
            subreddit.display_name,
            subreddit.title,
            subreddit.description,
            subreddit.subscribers,
            subreddit.submission_type,
            subreddit.can_submit,
            subreddit.is_moderator,
            subreddit.over_18,
            subreddit.created_utc
          ]
        );
      }
      
      console.log(`Successfully stored ${subreddits.length} subreddits for Reddit account ${newAccount.id}`);
    } catch (subredditError) {
      console.error('Failed to fetch/store Reddit subreddits:', subredditError);
      // Don't fail the entire OAuth flow if subreddit fetching fails
    }
    
    // Clean up OAuth state
    await OAuthState.deleteByStateKey(stateKey);
    
    // Redirect to frontend with success message
    res.redirect(`${process.env.NODE_ENV === 'production' ? 'https://socialmedia.ecitizen.media' : 'http://localhost:3000'}/#/accounts?connected=reddit`);
  } catch (error) {
    console.error('Reddit callback error:', error);
    res.status(500).json({ error: 'Failed to connect Reddit account: ' + error.message });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  connectMastodon,
  mastodonCallback,
  connectX,
  xCallback,
  connectPinterest,
  pinterestCallback,
  connectBluesky,
  connectFacebook,
  facebookCallback,
  connectInstagram,
  instagramCallback,
  connectReddit,
  redditCallback,
  registerValidation,
  loginValidation,
  emergencyAdminPromote
};