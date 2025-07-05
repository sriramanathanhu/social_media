const SocialAccount = require('../models/SocialAccount');
const mastodonService = require('../services/mastodon');

const getAccounts = async (req, res) => {
  try {
    console.log('Fetching accounts for user:', req.user.id);
    const accounts = await SocialAccount.findByUserId(req.user.id);
    console.log('Found accounts:', accounts.length);
    console.log('Account details:', accounts.map(acc => ({
      id: acc.id,
      platform: acc.platform,
      username: acc.username,
      status: acc.status
    })));
    res.json({ accounts });
  } catch (error) {
    console.error('Get accounts error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
};

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
        await SocialAccount.updateStatus(id, 'error');
        res.status(400).json({ 
          verified: false, 
          error: 'Account verification failed' 
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