const express = require('express');
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');

const router = express.Router();

// Temporary admin promotion endpoint
router.post('/promote-admin', async (req, res) => {
  try {
    const pool = require('../config/database');
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email, role, status',
      ['admin', 'sri.ramanatha@uskfoundation.or.ke']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      message: 'User promoted to admin successfully', 
      user: result.rows[0] 
    });
  } catch (error) {
    console.error('Admin promotion error:', error);
    res.status(500).json({ error: 'Failed to promote user to admin' });
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