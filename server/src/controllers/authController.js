const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const SocialAccount = require('../models/SocialAccount');
const mastodonService = require('../services/mastodon');
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

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
    
    const state = crypto.randomBytes(32).toString('hex');
    const authUrl = mastodonService.getAuthUrl(
      normalizedUrl, 
      appCredentials.client_id, 
      state
    );

    req.session = req.session || {};
    req.session.mastodon = {
      instanceUrl: normalizedUrl,
      clientId: appCredentials.client_id,
      clientSecret: appCredentials.client_secret,
      state: state
    };

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
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }

    const sessionData = req.session?.mastodon;
    if (!sessionData || sessionData.state !== state) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    const accessToken = await mastodonService.getAccessToken(
      sessionData.instanceUrl,
      sessionData.clientId,
      sessionData.clientSecret,
      code
    );

    const userInfo = await mastodonService.verifyCredentials(
      sessionData.instanceUrl,
      accessToken
    );

    const existingAccount = await SocialAccount.findByPlatformAndUser(
      req.user.id,
      'mastodon',
      sessionData.instanceUrl
    );

    if (existingAccount.length > 0) {
      await SocialAccount.updateTokens(existingAccount[0].id, accessToken);
    } else {
      await SocialAccount.create({
        userId: req.user.id,
        platform: 'mastodon',
        instanceUrl: sessionData.instanceUrl,
        username: userInfo.username,
        displayName: userInfo.display_name,
        avatarUrl: userInfo.avatar,
        accessToken: mastodonService.encrypt(accessToken),
        refreshToken: null,
        tokenExpiresAt: null
      });
    }

    delete req.session.mastodon;

    res.json({
      success: true,
      account: {
        platform: 'mastodon',
        instanceUrl: sessionData.instanceUrl,
        username: userInfo.username,
        displayName: userInfo.display_name,
        avatar: userInfo.avatar
      }
    });
  } catch (error) {
    console.error('Mastodon callback error:', error);
    res.status(500).json({ error: 'Failed to complete Mastodon authentication' });
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
  registerValidation,
  loginValidation
};