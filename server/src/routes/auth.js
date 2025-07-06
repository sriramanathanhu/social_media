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
router.post('/pinterest/connect', auth, authController.connectPinterest);
router.get('/pinterest/callback', authController.pinterestCallback); // No auth middleware for OAuth callback

// Get X API status and limits for dashboard
router.get('/x-api-status', auth, async (req, res) => {
  try {
    const SocialAccount = require('../models/SocialAccount');
    const xService = require('../services/x');
    
    // Get user's X accounts
    const allAccounts = await SocialAccount.findByUserId(req.user.id);
    const xAccounts = allAccounts.filter(acc => acc.platform === 'x');
    
    // X API v2 rate limits (these can be updated based on your plan)
    const apiLimits = {
      free: {
        posts_per_month: 1500,
        posts_per_day: 50,
        reads_per_month: 10000,
        plan_name: 'Free'
      },
      basic: {
        posts_per_month: 3000,
        posts_per_day: 100,
        reads_per_month: 50000,
        plan_name: 'Basic ($100/month)'
      },
      pro: {
        posts_per_month: 300000,
        posts_per_day: 10000,
        reads_per_month: 1000000,
        plan_name: 'Pro ($5000/month)'
      }
    };
    
    // Default to free plan - this should be configurable per user
    const currentPlan = 'free'; // TODO: Make this user-configurable
    const limits = apiLimits[currentPlan];
    
    // Get recent post count for rate limiting estimate
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const pool = require('../config/database');
    
    // Count posts made today and this month to X accounts
    let dailyUsage = 0;
    let monthlyUsage = 0;
    
    if (xAccounts.length > 0) {
      const xAccountIds = xAccounts.map(acc => acc.id);
      
      // Use JSONB operator to check if any of the account IDs exist in the target_accounts array
      const dailyPosts = await pool.query(
        `SELECT COUNT(*) as count FROM posts 
         WHERE user_id = $1 AND status = 'published' 
         AND published_at >= $2
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(target_accounts) AS elem
           WHERE elem::text::int = ANY($3::int[])
         )`,
        [req.user.id, startOfDay, xAccountIds]
      );
      
      const monthlyPosts = await pool.query(
        `SELECT COUNT(*) as count FROM posts 
         WHERE user_id = $1 AND status = 'published' 
         AND published_at >= $2
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(target_accounts) AS elem
           WHERE elem::text::int = ANY($3::int[])
         )`,
        [req.user.id, startOfMonth, xAccountIds]
      );
      
      dailyUsage = parseInt(dailyPosts.rows[0]?.count || 0);
      monthlyUsage = parseInt(monthlyPosts.rows[0]?.count || 0);
    }
    
    res.json({
      accounts: xAccounts.map(acc => ({
        id: acc.id,
        username: acc.username,
        status: acc.status,
        hasToken: !!acc.access_token,
        lastUsed: acc.last_used
      })),
      rateLimits: {
        currentPlan: limits.plan_name,
        daily: {
          used: dailyUsage,
          limit: limits.posts_per_day,
          remaining: limits.posts_per_day - dailyUsage,
          resetTime: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000).toISOString()
        },
        monthly: {
          used: monthlyUsage,
          limit: limits.posts_per_month,
          remaining: limits.posts_per_month - monthlyUsage,
          resetTime: new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString()
        }
      },
      availablePlans: Object.keys(apiLimits).map(key => ({
        key,
        ...apiLimits[key]
      })),
      lastRateLimitError: null, // TODO: Track last rate limit error time
      recommendations: [
        dailyUsage >= limits.posts_per_day * 0.8 ? 'Daily limit warning: Consider spacing out posts' : null,
        monthlyUsage >= limits.posts_per_month * 0.8 ? 'Monthly limit warning: Consider upgrading plan' : null
      ].filter(Boolean)
    });
  } catch (error) {
    console.error('X API status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug route to check X accounts
router.get('/debug/x-accounts', auth, async (req, res) => {
  try {
    const SocialAccount = require('../models/SocialAccount');
    const pool = require('../config/database');
    
    // Get all accounts for this user
    const allAccounts = await SocialAccount.findByUserId(req.user.id);
    
    // Get X accounts specifically
    const xAccounts = allAccounts.filter(acc => acc.platform === 'x');
    
    // Check database directly for X accounts
    const dbResult = await pool.query(
      `SELECT id, user_id, platform, username, display_name, status, created_at,
              CASE WHEN access_token IS NOT NULL THEN 'has_token' ELSE 'no_token' END as token_status
       FROM social_accounts 
       WHERE user_id = $1 AND platform = 'x'`,
      [req.user.id]
    );
    
    res.json({
      userId: req.user.id,
      totalAccounts: allAccounts.length,
      xAccountsFiltered: xAccounts.length,
      xAccountsFromDB: dbResult.rows.length,
      allAccountsPlatforms: allAccounts.map(acc => acc.platform),
      xAccountsDetails: xAccounts.map(acc => ({
        id: acc.id,
        username: acc.username,
        status: acc.status,
        hasToken: !!acc.access_token
      })),
      xAccountsFromDB: dbResult.rows
    });
  } catch (error) {
    console.error('X accounts debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

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