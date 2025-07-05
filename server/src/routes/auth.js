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
router.post('/mastodon/connect', auth, authController.connectMastodon);
router.get('/mastodon/callback', authController.mastodonCallback); // No auth middleware for OAuth callback
router.post('/x/connect', auth, authController.connectX);
router.get('/x/callback', authController.xCallback); // No auth middleware for OAuth callback

module.exports = router;