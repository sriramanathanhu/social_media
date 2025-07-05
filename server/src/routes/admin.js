const express = require('express');
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');

const router = express.Router();

// Emergency approval endpoint - REMOVE IN PRODUCTION
router.post('/emergency-approve', async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Get all pending users
    const pool = require('../config/database');
    const result = await pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE status = $2 RETURNING id, email, status',
      ['approved', 'pending']
    );
    
    res.json({ 
      message: `Approved ${result.rows.length} users`, 
      approvedUsers: result.rows 
    });
  } catch (error) {
    console.error('Emergency approval error:', error);
    res.status(500).json({ error: 'Failed to approve users' });
  }
});

// All admin routes require authentication and admin privileges
router.use(auth);
router.use(adminController.isAdmin);

// API Credentials management
router.get('/api-credentials', adminController.getApiCredentials);
router.post('/api-credentials', adminController.addApiCredentialsValidation, adminController.addApiCredentials);
router.put('/api-credentials/:id', adminController.updateApiCredentials);
router.delete('/api-credentials/:id', adminController.deleteApiCredentials);
router.post('/api-credentials/test', adminController.testApiCredentials);

// User management
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/status', adminController.updateUserStatus);
router.put('/users/:userId/make-admin', adminController.makeAdmin);

module.exports = router;