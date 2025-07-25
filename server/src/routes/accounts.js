const express = require('express');
const accountController = require('../controllers/accountController');
const auth = require('../middleware/auth');
const { performanceCache } = require('../config/redis');

const router = express.Router();

router.use(auth);

// Enhanced accounts route with caching
router.get('/', async (req, res) => {
  try {
    // Try to get from cache first
    const cachedAccounts = await performanceCache.getSocialAccounts(req.user.id);
    if (cachedAccounts) {
      res.set('X-Cache', 'HIT');
      return res.json(cachedAccounts);
    }

    // If not in cache, get from controller and cache result
    const originalSend = res.json;
    res.json = function(data) {
      if (res.statusCode === 200) {
        performanceCache.cacheSocialAccounts(req.user.id, data, 600); // Cache for 10 minutes
      }
      res.set('X-Cache', 'MISS');
      return originalSend.call(this, data);
    };

    return accountController.getAccounts(req, res);
  } catch (error) {
    console.error('Accounts cache error:', error);
    return accountController.getAccounts(req, res);
  }
});
router.get('/:id', accountController.getAccount);
// Enhanced delete with cache invalidation
router.delete('/:id', async (req, res) => {
  try {
    const result = await accountController.deleteAccount(req, res);
    // Invalidate user cache after account deletion
    await performanceCache.invalidateUserCache(req.user.id);
    return result;
  } catch (error) {
    console.error('Delete account error:', error);
    return accountController.deleteAccount(req, res);
  }
});

// Enhanced verify with cache invalidation
router.post('/:id/verify', async (req, res) => {
  try {
    const result = await accountController.verifyAccount(req, res);
    // Invalidate user cache after account verification
    await performanceCache.invalidateUserCache(req.user.id);
    return result;
  } catch (error) {
    console.error('Verify account error:', error);
    return accountController.verifyAccount(req, res);
  }
});

module.exports = router;