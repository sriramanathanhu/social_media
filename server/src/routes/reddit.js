const express = require('express');
const auth = require('../middleware/auth');
const redditController = require('../controllers/redditController');

const router = express.Router();

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