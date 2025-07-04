const { body, validationResult } = require('express-validator');
const publishingService = require('../services/publishingService');
const Post = require('../models/Post');

const createPost = async (req, res) => {
  try {
    console.log('Create post request body:', req.body);
    console.log('User:', req.user);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, targetAccountIds, mediaFiles = [] } = req.body;
    
    console.log('Post data:', { content, targetAccountIds, mediaFiles });
    
    if (!content || !content.trim()) {
      console.log('Content is empty');
      return res.status(400).json({ error: 'Content is required' });
    }
    
    if (!targetAccountIds || targetAccountIds.length === 0) {
      console.log('No target accounts selected');
      return res.status(400).json({ error: 'At least one target account must be selected' });
    }

    const result = await publishingService.publishPost(req.user.id, {
      content,
      targetAccountIds,
      mediaFiles
    });

    console.log('Post created successfully:', result);
    res.json({
      success: true,
      post: result
    });
  } catch (error) {
    console.error('Create post error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message || 'Failed to create post' 
    });
  }
};

const getPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const posts = await publishingService.getPostHistory(req.user.id, limit, offset);
    
    res.json({ posts });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    
    if (!post || post.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    
    if (!post || post.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.status === 'published') {
      return res.status(400).json({ error: 'Cannot delete published posts' });
    }

    await Post.delete(id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

const getPostStats = async (req, res) => {
  try {
    const stats = await publishingService.getPostStats(req.user.id);
    res.json({ stats });
  } catch (error) {
    console.error('Get post stats error:', error);
    res.status(500).json({ error: 'Failed to fetch post statistics' });
  }
};

const createPostValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Content must be between 1 and 5000 characters'),
  body('targetAccountIds')
    .isArray({ min: 1 })
    .withMessage('At least one target account must be selected'),
  body('targetAccountIds.*')
    .isUUID()
    .withMessage('Invalid account ID format')
];

module.exports = {
  createPost,
  getPosts,
  getPost,
  deletePost,
  getPostStats,
  createPostValidation
};