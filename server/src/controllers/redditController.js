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
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    console.log('Content-Type header:', req.headers['content-type']);
    console.log('Body keys:', Object.keys(req.body));
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    console.log('Body size (bytes):', JSON.stringify(req.body).length);
    console.log('Content field analysis:');
    console.log('- content exists in body:', req.body.hasOwnProperty('content'));
    console.log('- content type:', typeof req.body.content);
    console.log('- content value:', req.body.content);
    console.log('- content is null:', req.body.content === null);
    console.log('- content is undefined:', req.body.content === undefined);
    console.log('- content is empty string:', req.body.content === '');
    console.log('- content after trim:', req.body.content?.trim?.());
    
    // Validate content for text posts
    if (req.body.type === 'text' && (!req.body.content || req.body.content.trim().length === 0)) {
      console.error('❌ CRITICAL: Text post submitted without content!');
      console.error('Request body keys:', Object.keys(req.body));
      console.error('Content value debug:', {
        raw: req.body.content,
        trimmed: req.body.content?.trim(),
        length: req.body.content?.length || 0
      });
      return res.status(400).json({ 
        error: 'Text posts require content. Content field was empty or missing.',
        debug: {
          contentReceived: !!req.body.content,
          contentType: typeof req.body.content,
          contentLength: req.body.content?.length || 0
        }
      });
    }
    
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
      const textContent = content || '';
      postData.text = textContent;
      console.log('Setting text post content:', textContent?.substring(0, 100) || 'NO_CONTENT');
      console.log('Text content length:', textContent.length);
      
      // Double-check that text content is not empty
      if (!textContent || textContent.trim().length === 0) {
        console.error('❌ ERROR: Attempting to submit text post with empty content!');
        console.error('Original content value:', content);
        console.error('Processed content value:', textContent);
        return res.status(400).json({ 
          error: 'Cannot submit text post with empty content',
          debug: { originalContent: content, processedContent: textContent }
        });
      }
    }

    if (flairId) {
      postData.flair_id = flairId;
    }

    console.log('=== FINAL POST DATA TO REDDIT ===');
    console.log('postData object:', JSON.stringify(postData, null, 2));
    console.log('postData.text value:', postData.text);
    console.log('postData.text length:', postData.text?.length || 0);
    console.log('=================================');

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