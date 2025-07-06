const express = require('express');
const session = require('express-session');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: true,
  name: 'socialmedia.sid', // Custom session name
  cookie: {
    secure: false, // Keep false for OAuth compatibility
    httpOnly: false, // Set to false for OAuth debugging
    maxAge: 1000 * 60 * 60, // 1 hour for OAuth flow
    sameSite: 'none' // More permissive for cross-domain OAuth
  }
}));

router.post('/register', authController.registerValidation, authController.register);
router.post('/login', authController.loginValidation, authController.login);
router.get('/profile', auth, authController.getProfile);
router.post('/emergency-admin-promote', authController.emergencyAdminPromote);
router.post('/mastodon/connect', auth, authController.connectMastodon);
router.get('/mastodon/callback', authController.mastodonCallback); // No auth middleware for OAuth callback
router.post('/x/connect', auth, authController.connectX);
router.get('/x/callback', authController.xCallback); // No auth middleware for OAuth callback

// Debug route to test X posting
router.post('/debug/test-x-post', auth, async (req, res) => {
  try {
    const { content = 'Test post from social media scheduler' } = req.body;
    const SocialAccount = require('../models/SocialAccount');
    const xService = require('../services/x');
    
    // Get user's X accounts
    const accounts = await SocialAccount.findByUserId(req.user.id);
    const xAccounts = accounts.filter(acc => acc.platform === 'x');
    
    if (xAccounts.length === 0) {
      return res.status(400).json({ error: 'No X accounts found' });
    }
    
    const account = xAccounts[0];
    console.log('Testing X post with account:', {
      id: account.id,
      username: account.username,
      hasToken: !!account.access_token
    });
    
    // Test token decryption
    const decryptedToken = xService.decrypt(account.access_token);
    console.log('Token decrypted, length:', decryptedToken ? decryptedToken.length : 0);
    
    // Test posting
    const result = await xService.postTweet(decryptedToken, content, [], 'text');
    console.log('X post test result:', result);
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('X post test error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;