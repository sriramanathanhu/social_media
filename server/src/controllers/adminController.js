const ApiCredentials = require('../models/ApiCredentials');
const { body, validationResult } = require('express-validator');

// Middleware to check if user is admin (you can implement your own logic)
const isAdmin = (req, res, next) => {
  // For now, let's allow all authenticated users to manage API credentials
  // In production, you might want to add a proper admin role system
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
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
    
    // Test credentials before saving
    const isValid = await ApiCredentials.testCredentials(platform, clientId, clientSecret);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid API credentials' });
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

const addApiCredentialsValidation = [
  body('platform')
    .isIn(['x', 'twitter'])
    .withMessage('Platform must be x or twitter'),
  body('clientId')
    .isLength({ min: 10 })
    .withMessage('Client ID must be at least 10 characters'),
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
  addApiCredentialsValidation
};