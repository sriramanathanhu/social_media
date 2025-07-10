const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const liveStreamController = require('../controllers/liveStreamController');

const router = express.Router();

// Stream Management Routes
router.post('/', 
  auth,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('sourceApp').optional().isString(),
    body('sourceStream').optional().isString(),
    body('destinations').optional().isArray(),
    body('qualitySettings').optional().isObject(),
    body('autoPostEnabled').optional().isBoolean(),
    body('autoPostAccounts').optional().isArray(),
    body('autoPostMessage').optional().isString(),
    body('category').optional().isString(),
    body('tags').optional().isArray(),
    body('isPublic').optional().isBoolean()
  ],
  liveStreamController.createStream
);

router.get('/', 
  auth,
  liveStreamController.getStreams
);

router.get('/analytics',
  auth,
  liveStreamController.getStreamAnalytics
);

router.get('/active',
  auth,
  liveStreamController.getActiveStreams
);

router.get('/sessions/active',
  auth,
  liveStreamController.getActiveSessions
);

router.get('/:id',
  auth,
  liveStreamController.getStream
);

router.put('/:id',
  auth,
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('sourceApp').optional().isString(),
    body('sourceStream').optional().isString(),
    body('destinations').optional().isArray(),
    body('qualitySettings').optional().isObject(),
    body('autoPostEnabled').optional().isBoolean(),
    body('autoPostAccounts').optional().isArray(),
    body('autoPostMessage').optional().isString(),
    body('category').optional().isString(),
    body('tags').optional().isArray(),
    body('isPublic').optional().isBoolean()
  ],
  liveStreamController.updateStream
);

router.delete('/:id',
  auth,
  liveStreamController.deleteStream
);

// Stream Session Management Routes
router.post('/:id/sessions',
  auth,
  liveStreamController.startStreamSession
);

router.put('/sessions/:sessionId/end',
  auth,
  liveStreamController.endStreamSession
);

router.put('/sessions/:sessionId/stats',
  auth,
  [
    body('peak_viewers').optional().isNumeric(),
    body('total_viewers').optional().isNumeric(),
    body('bytes_sent').optional().isNumeric(),
    body('bytes_received').optional().isNumeric(),
    body('avg_bitrate').optional().isNumeric(),
    body('dropped_frames').optional().isNumeric(),
    body('connection_quality').optional().isFloat({ min: 0, max: 1 }),
    body('metadata').optional().isObject()
  ],
  liveStreamController.updateSessionStats
);

// Republishing Management Routes
router.get('/:id/republishing',
  auth,
  liveStreamController.getRepublishing
);

router.post('/:id/republishing',
  auth,
  [
    body('sourceApp').notEmpty().withMessage('Source app is required'),
    body('sourceStream').notEmpty().withMessage('Source stream is required'),
    body('destinationName').notEmpty().withMessage('Destination name is required'),
    body('destinationUrl').notEmpty().withMessage('Destination URL is required'),
    body('destinationPort').optional().isNumeric(),
    body('destinationApp').notEmpty().withMessage('Destination app is required'),
    body('destinationStream').notEmpty().withMessage('Destination stream is required'),
    body('destinationKey').optional().isString(),
    body('enabled').optional().isBoolean(),
    body('priority').optional().isNumeric(),
    body('retryAttempts').optional().isNumeric()
  ],
  liveStreamController.addRepublishing
);

router.delete('/republishing/:republishingId',
  auth,
  liveStreamController.removeRepublishing
);

// Platform-specific republishing routes
router.post('/:id/republishing/youtube',
  auth,
  [
    body('streamKey').notEmpty().withMessage('YouTube stream key is required'),
    body('sourceApp').optional().isString(),
    body('sourceStream').optional().isString()
  ],
  liveStreamController.addYouTubeRepublishing
);

router.post('/:id/republishing/twitter',
  auth,
  [
    body('streamKey').notEmpty().withMessage('Twitter stream key is required'),
    body('sourceApp').optional().isString(),
    body('sourceStream').optional().isString()
  ],
  liveStreamController.addTwitterRepublishing
);

module.exports = router;