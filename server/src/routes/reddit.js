const express = require('express');
const auth = require('../middleware/auth');
const redditController = require('../controllers/redditController');

const router = express.Router();

// Log all Reddit API requests for debugging
router.use((req, res, next) => {
  if (req.path === '/post' && req.method === 'POST') {
    console.log('🔍 REDDIT POST REQUEST RECEIVED');
    console.log('Path:', req.path);
    console.log('Method:', req.method);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Authorization header present:', !!req.headers.authorization);
    console.log('Body keys:', Object.keys(req.body));
    console.log('Body preview:', JSON.stringify({
      accountId: req.body.accountId,
      subreddit: req.body.subreddit,
      title: req.body.title?.substring(0, 50),
      contentLength: req.body.content?.length || 0,
      contentPreview: req.body.content?.substring(0, 100) || 'NO_CONTENT',
      type: req.body.type
    }, null, 2));
    console.log('===========================');
  }
  next();
});

// All Reddit routes require authentication
router.use(auth);

// Get subreddits for a Reddit account
router.get('/accounts/:accountId/subreddits', redditController.getAccountSubreddits);

// Sync subreddits from Reddit API
router.post('/accounts/:accountId/subreddits/sync', redditController.syncAccountSubreddits);

// Submit post to Reddit
router.post('/post', redditController.submitPost);

// Get subreddit information
router.get('/accounts/:accountId/subreddits/:subredditName/info', redditController.getSubredditInfo);

module.exports = router;