const SocialAccount = require('../models/SocialAccount');
const mastodonService = require('../services/mastodon');
const xService = require('../services/x');
const redditService = require('../services/reddit');

const getAccounts = async (req, res) => {
  try {
    console.log('Fetching accounts for user:', req.user.id);
    const accounts = await SocialAccount.findByUserId(req.user.id);
    console.log('Found accounts:', accounts.length);
    
    // Enhanced logging for token status
    const accountsWithTokenStatus = await Promise.all(accounts.map(async (acc) => {
      const tokenStatus = await checkTokenStatus(acc);
      console.log(`Account ${acc.id} (${acc.platform}:${acc.username}) - Token Status:`, tokenStatus);
      return {
        ...acc,
        hasValidToken: tokenStatus.hasValidToken,
        tokenError: tokenStatus.error
      };
    }));
    
    console.log('Account details:', accountsWithTokenStatus.map(acc => ({
      id: acc.id,
      platform: acc.platform,
      username: acc.username,
      status: acc.status,
      hasValidToken: acc.hasValidToken,
      tokenError: acc.tokenError
    })));
    
    res.json({ accounts: accountsWithTokenStatus });
  } catch (error) {
    console.error('Get accounts error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
};

// Helper function to check token status
async function checkTokenStatus(account) {
  try {
    const fullAccount = await SocialAccount.findById(account.id);
    
    if (!fullAccount) {
      return { hasValidToken: false, error: 'Account not found' };
    }
    
    if (!fullAccount.access_token) {
      return { hasValidToken: false, error: 'No access token stored' };
    }
    
    console.log(`Checking token for ${account.platform} account ${account.id}:`);
    console.log('- Token exists:', !!fullAccount.access_token);
    console.log('- Token length:', fullAccount.access_token.length);
    console.log('- Token format (has colon):', fullAccount.access_token.includes(':'));
    console.log('- Token preview:', fullAccount.access_token.substring(0, 32) + '...');
    
    // Platform-specific token validation
    if (account.platform === 'x') {
      try {
        const decryptedToken = xService.decrypt(fullAccount.access_token);
        console.log('- X token decryption successful, length:', decryptedToken.length);
        return { hasValidToken: true, error: null };
      } catch (decryptError) {
        console.log('- X token decryption failed:', decryptError.message);
        return { hasValidToken: false, error: 'Token decryption failed: ' + decryptError.message };
      }
    } else if (account.platform === 'mastodon') {
      try {
        const decryptedToken = mastodonService.decrypt(fullAccount.access_token);
        console.log('- Mastodon token decryption successful, length:', decryptedToken.length);
        return { hasValidToken: true, error: null };
      } catch (decryptError) {
        console.log('- Mastodon token decryption failed:', decryptError.message);
        return { hasValidToken: false, error: 'Token decryption failed: ' + decryptError.message };
      }
    } else if (account.platform === 'reddit') {
      try {
        const decryptedToken = redditService.decrypt(fullAccount.access_token);
        console.log('- Reddit token decryption successful, length:', decryptedToken.length);
        return { hasValidToken: true, error: null };
      } catch (decryptError) {
        console.log('- Reddit token decryption failed:', decryptError.message);
        return { hasValidToken: false, error: 'Token decryption failed: ' + decryptError.message };
      }
    } else {
      // For other platforms, just check if token exists
      return { hasValidToken: true, error: null };
    }
  } catch (error) {
    console.error('Token status check error:', error);
    return { hasValidToken: false, error: 'Token check failed: ' + error.message };
  }
}

const getAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await SocialAccount.findById(id);
    
    if (!account || account.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const { access_token, refresh_token, ...accountData } = account;
    res.json({ account: accountData });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await SocialAccount.findById(id);
    
    if (!account || account.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await SocialAccount.delete(id);
    res.json({ message: 'Account disconnected successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
};

const verifyAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await SocialAccount.findById(id);
    
    if (!account || account.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.platform === 'mastodon') {
      try {
        console.log('Verifying Mastodon account:', id, 'for user:', req.user.id);
        const decryptedToken = mastodonService.decrypt(account.access_token);
        const userInfo = await mastodonService.verifyCredentials(
          account.instance_url,
          decryptedToken
        );
        
        await SocialAccount.updateStatus(id, 'active');
        await SocialAccount.updateLastUsed(id);
        
        res.json({ 
          verified: true, 
          account: {
            ...account,
            username: userInfo.username,
            display_name: userInfo.display_name,
            avatar: userInfo.avatar
          }
        });
      } catch (error) {
        console.error('Mastodon account verification failed for account:', id, 'Error:', error.message);
        await SocialAccount.updateStatus(id, 'error');
        res.status(400).json({ 
          verified: false, 
          error: 'Account verification failed: ' + error.message 
        });
      }
    } else if (account.platform === 'x') {
      try {
        console.log('Verifying X account:', id, 'for user:', req.user.id);
        const decryptedToken = xService.decrypt(account.access_token);
        const userInfo = await xService.verifyCredentials(decryptedToken);
        
        await SocialAccount.updateStatus(id, 'active');
        await SocialAccount.updateLastUsed(id);
        
        res.json({ 
          verified: true, 
          account: {
            ...account,
            username: userInfo.username,
            display_name: userInfo.name,
            avatar: userInfo.profile_image_url
          }
        });
      } catch (error) {
        console.error('X account verification failed for account:', id, 'Error:', error.message);
        await SocialAccount.updateStatus(id, 'error');
        res.status(400).json({ 
          verified: false, 
          error: 'Account verification failed: ' + error.message 
        });
      }
    } else if (account.platform === 'reddit') {
      try {
        console.log('Verifying Reddit account:', id, 'for user:', req.user.id);
        const decryptedToken = redditService.decrypt(account.access_token);
        const userInfo = await redditService.verifyCredentials(decryptedToken);
        
        await SocialAccount.updateStatus(id, 'active');
        await SocialAccount.updateLastUsed(id);
        
        res.json({ 
          verified: true, 
          account: {
            ...account,
            username: userInfo.name,
            display_name: userInfo.name,
            karma: userInfo.karma,
            created_utc: userInfo.created_utc
          }
        });
      } catch (error) {
        console.error('Reddit account verification failed for account:', id, 'Error:', error.message);
        await SocialAccount.updateStatus(id, 'error');
        res.status(400).json({ 
          verified: false, 
          error: 'Account verification failed: ' + error.message 
        });
      }
    } else {
      res.status(400).json({ error: 'Platform not supported for verification' });
    }
  } catch (error) {
    console.error('Verify account error:', error);
    res.status(500).json({ error: 'Failed to verify account' });
  }
};

module.exports = {
  getAccounts,
  getAccount,
  deleteAccount,
  verifyAccount
};