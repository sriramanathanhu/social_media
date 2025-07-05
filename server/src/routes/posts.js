const express = require('express');
const postController = require('../controllers/postController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', postController.getPosts);
router.get('/scheduled', postController.getScheduledPosts);

router.post('/', postController.uploadMiddleware, postController.createPostValidation, postController.createPost);
router.get('/stats', postController.getPostStats);
router.get('/:id', postController.getPost);
router.delete('/:id', postController.deletePost);

module.exports = router;