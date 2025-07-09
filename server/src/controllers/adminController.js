const ApiCredentials = require('../models/ApiCredentials');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ error: 'Failed to verify admin status' });
  }
};

const getApiCredentials = async (req, res) => {
  try {
    const credentials = await ApiCredentials.findAll();
    
    // Don't send client_secret in the response for security
    const safeCredentials = credentials.map(cred => ({
      id: cred.id,
      platform: cred.platform,
      client_id: cred.client_id,
      status: cred.status,
      created_by: cred.created_by,
      created_at: cred.created_at
    }));
    
    res.json({ credentials: safeCredentials });
  } catch (error) {
    console.error('Get API credentials error:', error);
    res.status(500).json({ error: 'Failed to fetch API credentials' });
  }
};

const addApiCredentials = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { platform, clientId, clientSecret } = req.body;
    
    // Test credentials before saving (skip for Pinterest and Bluesky for now)
    if (platform !== 'pinterest' && platform !== 'bluesky') {
      const isValid = await ApiCredentials.testCredentials(platform, clientId, clientSecret);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid API credentials' });
      }
    }

    // Check if credentials for this platform already exist
    const existingCredentials = await ApiCredentials.findByPlatform(platform);
    if (existingCredentials) {
      // Update existing credentials
      await ApiCredentials.updateStatus(existingCredentials.id, 'inactive');
    }

    const credentials = await ApiCredentials.create(platform, clientId, clientSecret, req.user.id);
    
    // Don't send client_secret in the response
    const safeCredentials = {
      id: credentials.id,
      platform: credentials.platform,
      client_id: credentials.client_id,
      status: credentials.status,
      created_at: credentials.created_at
    };
    
    res.status(201).json({ credentials: safeCredentials });
  } catch (error) {
    console.error('Add API credentials error:', error);
    res.status(500).json({ error: 'Failed to add API credentials' });
  }
};

const updateApiCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const credentials = await ApiCredentials.updateStatus(id, status);
    
    if (!credentials) {
      return res.status(404).json({ error: 'API credentials not found' });
    }
    
    res.json({ credentials });
  } catch (error) {
    console.error('Update API credentials error:', error);
    res.status(500).json({ error: 'Failed to update API credentials' });
  }
};

const deleteApiCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    
    const credentials = await ApiCredentials.delete(id);
    
    if (!credentials) {
      return res.status(404).json({ error: 'API credentials not found' });
    }
    
    res.json({ message: 'API credentials deleted successfully' });
  } catch (error) {
    console.error('Delete API credentials error:', error);
    res.status(500).json({ error: 'Failed to delete API credentials' });
  }
};

const testApiCredentials = async (req, res) => {
  try {
    const { platform, clientId, clientSecret } = req.body;
    
    const isValid = await ApiCredentials.testCredentials(platform, clientId, clientSecret);
    
    res.json({ valid: isValid });
  } catch (error) {
    console.error('Test API credentials error:', error);
    res.status(500).json({ error: 'Failed to test API credentials' });
  }
};

// User Management Functions
const getAllUsers = async (req, res) => {
  try {
    const users = await User.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await User.updateUserStatus(userId, status);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: `User ${status} successfully`, user });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

const makeAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.makeAdmin(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User promoted to admin successfully', user });
  } catch (error) {
    console.error('Make admin error:', error);
    res.status(500).json({ error: 'Failed to promote user to admin' });
  }
};

const removeAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent removing admin from yourself
    if (userId === req.user.id) {
      return res.status(403).json({ error: 'Cannot remove admin privileges from yourself' });
    }

    const user = await User.removeAdmin(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Admin privileges removed successfully', user });
  } catch (error) {
    console.error('Remove admin error:', error);
    res.status(500).json({ error: 'Failed to remove admin privileges' });
  }
};

const addApiCredentialsValidation = [
  body('platform')
    .isIn(['x', 'twitter', 'pinterest', 'bluesky'])
    .withMessage('Platform must be x, twitter, pinterest, or bluesky'),
  body('clientId')
    .isLength({ min: 5 })
    .withMessage('Client ID must be at least 5 characters'),
  body('clientSecret')
    .isLength({ min: 10 })
    .withMessage('Client Secret must be at least 10 characters')
];

module.exports = {
  isAdmin,
  getApiCredentials,
  addApiCredentials,
  updateApiCredentials,
  deleteApiCredentials,
  testApiCredentials,
  getAllUsers,
  updateUserStatus,
  makeAdmin,
  removeAdmin,
  addApiCredentialsValidation
};