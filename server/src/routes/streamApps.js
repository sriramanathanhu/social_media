const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const streamAppController = require('../controllers/streamAppController');

const router = express.Router();

// App Management Routes
router.post('/', 
  auth,
  [
    body('appName').notEmpty().withMessage('App name is required')
      .isLength({ min: 2, max: 100 }).withMessage('App name must be 2-100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('rtmpAppPath').notEmpty().withMessage('RTMP app path is required')
      .matches(/^[a-zA-Z0-9_-]+$/).withMessage('RTMP app path can only contain letters, numbers, underscores, and hyphens')
      .isLength({ min: 2, max: 50 }).withMessage('RTMP app path must be 2-50 characters'),
    body('defaultStreamKey').optional().isString(),
    body('settings').optional().isObject()
  ],
  streamAppController.createApp
);

router.get('/', 
  auth,
  streamAppController.getApps
);

router.get('/:id',
  auth,
  streamAppController.getApp
);

router.put('/:id',
  auth,
  [
    body('appName').optional().notEmpty().withMessage('App name cannot be empty')
      .isLength({ min: 2, max: 100 }).withMessage('App name must be 2-100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('rtmpAppPath').optional().notEmpty().withMessage('RTMP app path cannot be empty')
      .matches(/^[a-zA-Z0-9_-]+$/).withMessage('RTMP app path can only contain letters, numbers, underscores, and hyphens')
      .isLength({ min: 2, max: 50 }).withMessage('RTMP app path must be 2-50 characters'),
    body('defaultStreamKey').optional().isString(),
    body('settings').optional().isObject(),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
  ],
  streamAppController.updateApp
);

router.delete('/:id',
  auth,
  streamAppController.deleteApp
);

// Key Management Routes
router.post('/:id/keys',
  auth,
  [
    body('keyName').notEmpty().withMessage('Key name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Key name must be 2-100 characters'),
    body('streamKey').notEmpty().withMessage('Stream key is required')
      .isLength({ min: 8, max: 255 }).withMessage('Stream key must be 8-255 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('isActive').optional().isBoolean()
  ],
  streamAppController.addKey
);

router.get('/:id/keys',
  auth,
  streamAppController.getKeys
);

router.put('/keys/:keyId',
  auth,
  [
    body('keyName').optional().notEmpty().withMessage('Key name cannot be empty')
      .isLength({ min: 2, max: 100 }).withMessage('Key name must be 2-100 characters'),
    body('streamKey').optional().notEmpty().withMessage('Stream key cannot be empty')
      .isLength({ min: 8, max: 255 }).withMessage('Stream key must be 8-255 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('isActive').optional().isBoolean()
  ],
  streamAppController.updateKey
);

router.delete('/keys/:keyId',
  auth,
  streamAppController.deleteKey
);

module.exports = router;