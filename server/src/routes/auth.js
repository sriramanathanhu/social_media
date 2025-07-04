const express = require('express');
const session = require('express-session');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 15
  }
}));

router.post('/register', authController.registerValidation, authController.register);
router.post('/login', authController.loginValidation, authController.login);
router.post('/mastodon/connect', auth, authController.connectMastodon);
router.get('/mastodon/callback', authController.mastodonCallback); // No auth middleware for OAuth callback

module.exports = router;