const { body, validationResult } = require('express-validator');
const multer = require('multer');
const publishingService = require('../services/publishingService');
const Post = require('../models/Post');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const createPost = async (req, res) => {
  try {
    console.log('Create post request body:', req.body);
    console.log('User:', req.user);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    let { content, targetAccountIds } = req.body;
    const mediaFiles = req.files || [];
    
    // Parse targetAccountIds if it's a JSON string
    if (typeof targetAccountIds === 'string') {
      try {
        targetAccountIds = JSON.parse(targetAccountIds);
      } catch (error) {
        console.log('Error parsing targetAccountIds:', error);
        targetAccountIds = [];
      }
    }
    
    console.log('Post data:', { content, targetAccountIds, mediaFilesCount: mediaFiles.length });
    
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
  // Custom validation for targetAccountIds to handle both array and JSON string
  body('targetAccountIds')
    .custom((value) => {
      let accountIds;
      
      // If it's a string, try to parse as JSON
      if (typeof value === 'string') {
        try {
          accountIds = JSON.parse(value);
        } catch (error) {
          throw new Error('Invalid targetAccountIds format');
        }
      } else if (Array.isArray(value)) {
        accountIds = value;
      } else {
        throw new Error('targetAccountIds must be an array or JSON string');
      }
      
      // Check if it's an array with at least one element
      if (!Array.isArray(accountIds) || accountIds.length === 0) {
        throw new Error('At least one target account must be selected');
      }
      
      // Check if all elements are valid UUIDs (basic format check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      for (const id of accountIds) {
        if (!uuidRegex.test(id)) {
          throw new Error(`Invalid account ID format: ${id}`);
        }
      }
      
      return true;
    })
];

module.exports = {
  createPost,
  getPosts,
  getPost,
  deletePost,
  getPostStats,
  createPostValidation,
  uploadMiddleware: upload.array('mediaFiles', 4) // Allow up to 4 files
};