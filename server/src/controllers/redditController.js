const pool = require('../config/database');
const redditService = require('../services/reddit');
const SocialAccount = require('../models/SocialAccount');

// Get subreddits for a Reddit account
const getAccountSubreddits = async (req, res) => {
  try {
    const { accountId } = req.params;
    console.log('Getting subreddits for Reddit account:', accountId);

    // Verify account belongs to user
    const account = await SocialAccount.findByIdAndUserId(accountId, req.user.id);
    if (!account || account.platform !== 'reddit') {
      return res.status(404).json({ error: 'Reddit account not found' });
    }

    // Get subreddits from database
    const result = await pool.query(
      `SELECT 
        id, subreddit_name, display_name, title, description, subscribers,
        submission_type, can_submit, is_moderator, over_18, last_synced
      FROM reddit_subreddits 
      WHERE account_id = $1 
      ORDER BY subscribers DESC, subreddit_name ASC`,
      [accountId]
    );

    console.log(`Found ${result.rows.length} subreddits for account ${accountId}`);

    res.json({
      success: true,
      subreddits: result.rows,
      lastSynced: result.rows.length > 0 ? result.rows[0].last_synced : null
    });
  } catch (error) {
    console.error('Get account subreddits error:', error);
    res.status(500).json({ error: 'Failed to fetch subreddits' });
  }
};

// Sync subreddits from Reddit API
const syncAccountSubreddits = async (req, res) => {
  try {
    const { accountId } = req.params;
    console.log('Syncing subreddits for Reddit account:', accountId);

    // Verify account belongs to user and get access token
    const account = await SocialAccount.findByIdAndUserId(accountId, req.user.id);
    if (!account || account.platform !== 'reddit') {
      return res.status(404).json({ error: 'Reddit account not found' });
    }

    if (!account.access_token) {
      return res.status(400).json({ error: 'No access token available for this account' });
    }

    // Decrypt access token
    let accessToken;
    try {
      accessToken = redditService.decrypt(account.access_token);
    } catch (error) {
      console.error('Failed to decrypt Reddit access token:', error);
      // Try to refresh token if decryption fails
      const newToken = await redditService.tryRefreshToken(account);
      if (!newToken) {
        return res.status(401).json({ error: 'Failed to authenticate with Reddit. Please reconnect your account.' });
      }
      accessToken = newToken;
    }

    // Fetch subreddits from Reddit API
    const subreddits = await redditService.getUserSubreddits(accessToken);
    console.log(`Fetched ${subreddits.length} subreddits from Reddit API`);

    // Clear existing subreddits and insert new ones
    await pool.query('DELETE FROM reddit_subreddits WHERE account_id = $1', [accountId]);

    // Insert new subreddits
    if (subreddits.length > 0) {
      const insertQuery = `
        INSERT INTO reddit_subreddits 
        (account_id, subreddit_name, display_name, title, description, subscribers,
         submission_type, can_submit, is_moderator, over_18, created_utc)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      for (const subreddit of subreddits) {
        await pool.query(insertQuery, [
          accountId,
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
        ]);
      }
    }

    console.log(`Synced ${subreddits.length} subreddits for account ${accountId}`);

    res.json({
      success: true,
      message: `Successfully synced ${subreddits.length} subreddits`,
      subredditCount: subreddits.length
    });
  } catch (error) {
    console.error('Sync account subreddits error:', error);
    res.status(500).json({ 
      error: 'Failed to sync subreddits', 
      details: error.message 
    });
  }
};

// Post to Reddit
const submitPost = async (req, res) => {
  try {
    const { accountId, subreddit, title, content, url, type: postType, nsfw, spoiler, flairId } = req.body;
    
    console.log('=== REDDIT POST SUBMISSION DEBUG ===');
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    console.log('Extracted values:', {
      accountId,
      subreddit,
      postType,
      title: title?.substring(0, 50) + (title?.length > 50 ? '...' : ''),
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 200) || 'NO_CONTENT',
      hasContent: !!content,
      urlLength: url?.length || 0,
      urlPreview: url?.substring(0, 100) || 'NO_URL',
      hasUrl: !!url,
      nsfw,
      spoiler
    });
    console.log('=====================================');

    // Validate required fields
    if (!accountId || !subreddit || !title) {
      return res.status(400).json({ error: 'Account ID, subreddit, and title are required' });
    }

    if (title.length > 300) {
      return res.status(400).json({ error: 'Title must be 300 characters or less' });
    }

    // Verify account belongs to user
    const account = await SocialAccount.findByIdAndUserId(accountId, req.user.id);
    if (!account || account.platform !== 'reddit') {
      return res.status(404).json({ error: 'Reddit account not found' });
    }

    if (!account.access_token) {
      return res.status(400).json({ error: 'No access token available for this account' });
    }

    // Decrypt access token
    let accessToken;
    try {
      accessToken = redditService.decrypt(account.access_token);
    } catch (error) {
      console.error('Failed to decrypt Reddit access token:', error);
      // Try to refresh token if decryption fails
      const newToken = await redditService.tryRefreshToken(account);
      if (!newToken) {
        return res.status(401).json({ error: 'Failed to authenticate with Reddit. Please reconnect your account.' });
      }
      accessToken = newToken;
    }

    // Prepare post data
    const postData = {
      kind: postType === 'link' ? 'link' : 'self',
      title: title,
      nsfw: nsfw || false,
      spoiler: spoiler || false
    };

    if (postType === 'link' && url) {
      postData.url = url;
      console.log('Setting link post URL:', url);
    } else if (postType === 'text') {
      postData.text = content || '';
      console.log('Setting text post content:', content?.substring(0, 100) || 'NO_CONTENT');
    }

    if (flairId) {
      postData.flair_id = flairId;
    }

    // Submit post to Reddit
    const result = await redditService.submitPost(accessToken, subreddit, postData);
    
    // Update account last used
    await SocialAccount.updateLastUsed(accountId);
    
    console.log('Reddit post submitted successfully:', result.permalink);

    res.json({
      success: true,
      post: {
        id: result.id,
        url: result.permalink,
        reddit_url: result.url
      },
      message: 'Post submitted successfully to Reddit'
    });
  } catch (error) {
    console.error('Submit Reddit post error:', error);
    res.status(500).json({ 
      error: 'Failed to submit post to Reddit', 
      details: error.message 
    });
  }
};

// Get subreddit information
const getSubredditInfo = async (req, res) => {
  try {
    const { accountId, subredditName } = req.params;
    
    console.log('Getting subreddit info:', { accountId, subredditName });

    // Verify account belongs to user
    const account = await SocialAccount.findByIdAndUserId(accountId, req.user.id);
    if (!account || account.platform !== 'reddit') {
      return res.status(404).json({ error: 'Reddit account not found' });
    }

    if (!account.access_token) {
      return res.status(400).json({ error: 'No access token available for this account' });
    }

    // Decrypt access token
    let accessToken;
    try {
      accessToken = redditService.decrypt(account.access_token);
    } catch (error) {
      console.error('Failed to decrypt Reddit access token:', error);
      const newToken = await redditService.tryRefreshToken(account);
      if (!newToken) {
        return res.status(401).json({ error: 'Failed to authenticate with Reddit. Please reconnect your account.' });
      }
      accessToken = newToken;
    }

    // Get subreddit info from Reddit API
    const subredditInfo = await redditService.getSubredditInfo(accessToken, subredditName);
    
    res.json({
      success: true,
      subreddit: subredditInfo
    });
  } catch (error) {
    console.error('Get subreddit info error:', error);
    res.status(500).json({ 
      error: 'Failed to get subreddit information', 
      details: error.message 
    });
  }
};

module.exports = {
  getAccountSubreddits,
  syncAccountSubreddits,
  submitPost,
  getSubredditInfo
};