const express = require('express');
const session = require('express-session');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: true, // Set to true to ensure session is created
  cookie: {
    secure: false, // Set to false for debugging - OAuth callbacks may have issues with secure cookies
    httpOnly: true,
    maxAge: 1000 * 60 * 30, // Increase to 30 minutes for OAuth flow
    sameSite: 'lax' // Allow cross-site requests for OAuth
  }
}));

router.post('/register', authController.registerValidation, authController.register);
router.post('/login', authController.loginValidation, authController.login);
router.post('/mastodon/connect', auth, authController.connectMastodon);
router.get('/mastodon/callback', authController.mastodonCallback); // No auth middleware for OAuth callback

module.exports = router;