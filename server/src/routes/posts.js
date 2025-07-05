const express = require('express');
const postController = require('../controllers/postController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', postController.getPosts);

// Debug route to test basic POST functionality
router.post('/debug', (req, res) => {
  console.log('=== DEBUG POST REQUEST ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Files:', req.files);
  console.log('User:', req.user);
  res.json({ 
    success: true, 
    message: 'Debug endpoint reached',
    body: req.body,
    files: req.files?.length || 0,
    user: req.user?.id || 'no user'
  });
});

// Temporarily remove validation to test basic functionality
router.post('/', postController.uploadMiddleware, postController.createPost);
router.get('/stats', postController.getPostStats);
router.get('/:id', postController.getPost);
router.delete('/:id', postController.deletePost);

module.exports = router;