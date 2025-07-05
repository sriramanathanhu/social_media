const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const SocialAccount = require('../models/SocialAccount');
const OAuthState = require('../models/OAuthState');
const mastodonService = require('../services/mastodon');
const xService = require('../services/x');
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
      token,
      user: {
        id: user.id,
        email: user.email,
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
    const tokenData = await xService.getAccessToken(code, oauthState.extra_data);
    
    // Verify credentials
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
      await SocialAccount.updateTokens(
        existingAccount[0].id,
        xService.encrypt(tokenData.accessToken),
        xService.encrypt(tokenData.refreshToken),
        tokenData.expiresIn ? new Date(Date.now() + tokenData.expiresIn * 1000) : null
      );
    } else {
      console.log('Creating new X account for user:', oauthState.user_id);
      const newAccount = await SocialAccount.create({
        userId: oauthState.user_id,
        platform: 'x',
        instanceUrl: null,
        username: userInfo.username,
        displayName: userInfo.name,
        avatarUrl: userInfo.profile_image_url,
        accessToken: xService.encrypt(tokenData.accessToken),
        refreshToken: xService.encrypt(tokenData.refreshToken),
        tokenExpiresAt: tokenData.expiresIn ? new Date(Date.now() + tokenData.expiresIn * 1000) : null
      });
      console.log('New X account created:', newAccount);
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

module.exports = {
  register,
  login,
  connectMastodon,
  mastodonCallback,
  connectX,
  xCallback,
  registerValidation,
  loginValidation
};