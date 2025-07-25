const express = require('express');
const { body, param, query } = require('express-validator');
const auth = require('../middleware/auth');
const wordpressController = require('../controllers/wordpressController');

const router = express.Router();

// WordPress Site Management Routes
router.post('/connect',
  auth,
  [
    body('siteUrl').isURL().withMessage('Valid site URL is required'),
    body('username').notEmpty().withMessage('Username is required'),
    body('appPassword').notEmpty().withMessage('Application password is required')
  ],
  wordpressController.connectSite
);

router.get('/sites',
  auth,
  wordpressController.getSites
);

router.get('/sites/:id',
  auth,
  param('id').isInt().withMessage('Valid site ID is required'),
  wordpressController.getSite
);

router.put('/sites/:id',
  auth,
  [
    param('id').isInt().withMessage('Valid site ID is required'),
    body('siteUrl').optional().isURL().withMessage('Valid site URL is required'),
    body('username').optional().notEmpty().withMessage('Username cannot be empty'),
    body('appPassword').optional().notEmpty().withMessage('Application password cannot be empty')
  ],
  wordpressController.updateSite
);

router.delete('/sites/:id',
  auth,
  param('id').isInt().withMessage('Valid site ID is required'),
  wordpressController.deleteSite
);

// Categories and Tags Routes
router.get('/sites/:id/categories',
  auth,
  param('id').isInt().withMessage('Valid site ID is required'),
  wordpressController.getCategories
);

router.get('/sites/:id/tags',
  auth,
  param('id').isInt().withMessage('Valid site ID is required'),
  wordpressController.getTags
);

router.post('/sites/:id/sync',
  auth,
  param('id').isInt().withMessage('Valid site ID is required'),
  wordpressController.syncSiteData
);

// Tag search for autocomplete
router.get('/sites/:id/tags/search',
  auth,
  [
    param('id').isInt().withMessage('Valid site ID is required'),
    query('q').notEmpty().withMessage('Search query is required')
  ],
  wordpressController.searchTags
);

// WordPress Publishing Routes
router.post('/publish',
  auth,
  [
    body('siteId').isInt().withMessage('Valid site ID is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('status').optional().isIn(['draft', 'publish', 'private']).withMessage('Invalid post status'),
    body('categories').optional().isArray().withMessage('Categories must be an array'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('excerpt').optional().isString().withMessage('Excerpt must be a string'),
    body('scheduledFor').optional().isISO8601().withMessage('Scheduled date must be valid ISO 8601 date')
  ],
  wordpressController.publishPost
);

// Bulk publishing to multiple sites
router.post('/publish-bulk',
  auth,
  [
    body('siteIds').isArray({ min: 1 }).withMessage('Site IDs must be a non-empty array'),
    body('siteIds.*').isInt().withMessage('Each site ID must be an integer'),
    body('title').notEmpty().withMessage('Title is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('status').optional().isIn(['draft', 'publish', 'private']).withMessage('Invalid post status'),
    body('categories').optional().isArray().withMessage('Categories must be an array'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('excerpt').optional().isString().withMessage('Excerpt must be a string'),
    body('scheduledFor').optional().isISO8601().withMessage('Scheduled date must be valid ISO 8601 date')
  ],
  wordpressController.publishPostBulk
);

router.get('/posts',
  auth,
  [
    query('siteId').optional().isInt().withMessage('Valid site ID is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('perPage').optional().isInt({ min: 1, max: 100 }).withMessage('Per page must be between 1 and 100')
  ],
  wordpressController.getPosts
);

router.put('/posts/:postId',
  auth,
  [
    param('postId').isInt().withMessage('Valid post ID is required'),
    body('siteId').isInt().withMessage('Valid site ID is required'),
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('content').optional().notEmpty().withMessage('Content cannot be empty'),
    body('status').optional().isIn(['draft', 'publish', 'private']).withMessage('Invalid post status'),
    body('categories').optional().isArray().withMessage('Categories must be an array'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('excerpt').optional().isString().withMessage('Excerpt must be a string')
  ],
  wordpressController.updatePost
);

router.delete('/posts/:postId',
  auth,
  [
    param('postId').isInt().withMessage('Valid post ID is required'),
    body('siteId').isInt().withMessage('Valid site ID is required')
  ],
  wordpressController.deletePost
);

// Media Upload Route
router.post('/sites/:id/media',
  auth,
  param('id').isInt().withMessage('Valid site ID is required'),
  wordpressController.uploadMedia
);

module.exports = router;