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

module.exports = router;