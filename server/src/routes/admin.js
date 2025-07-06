const express = require('express');
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');

const router = express.Router();

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
router.put('/users/:userId/remove-admin', adminController.removeAdmin);

module.exports = router;