const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/admin');
const liveStreamController = require('../controllers/liveStreamController');
const nimbleApiService = require('../services/nimbleApiService');
const liveStreamingService = require('../services/liveStreamingService');
const LiveStream = require('../models/LiveStream');
const StreamRepublishing = require('../models/StreamRepublishing');

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

// Test Nimble API connectivity
router.get('/nimble/test', auth, async (req, res) => {
  try {
    console.log('Testing Nimble API connection...');
    const testResult = await nimbleApiService.testConnection();
    
    res.json({
      success: testResult.success,
      ...testResult
    });
  } catch (error) {
    console.error('Nimble API test error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

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
    body('destination_name').notEmpty().withMessage('Destination name is required'),
    body('destination_url').notEmpty().withMessage('Destination URL is required'),
    body('destination_port').optional().isNumeric(),
    body('destination_app').notEmpty().withMessage('Destination app is required'),
    body('destination_stream').notEmpty().withMessage('Destination stream is required'),
    body('destination_key').optional().isString(),
    body('enabled').optional().isBoolean(),
    body('priority').optional().isNumeric(),
    body('retry_attempts').optional().isNumeric()
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
    body('streamKey').notEmpty().withMessage('YouTube stream key is required')
  ],
  liveStreamController.addYouTubeRepublishing
);

router.post('/:id/republishing/twitter',
  auth,
  [
    body('streamKey').notEmpty().withMessage('Twitter stream key is required')
  ],
  liveStreamController.addTwitterRepublishing
);

// Nimble-specific routes (Admin only)
router.get('/nimble/config',
  auth,
  adminAuth,
  liveStreamController.getNimbleConfig
);

router.post('/nimble/config/update',
  auth,
  adminAuth,
  liveStreamController.updateNimbleConfig
);

router.get('/nimble/status',
  auth,
  adminAuth,
  liveStreamController.getNimbleStatus
);

router.get('/:id/rtmp-info',
  auth,
  liveStreamController.getStreamRTMPInfo
);

// Manual republishing control endpoints
router.post('/:id/start', auth, async (req, res) => {
  try {
    console.log('Starting republishing for stream:', req.params.id);
    console.log('req.user:', req.user);
    
    // Use direct model access like the working GET endpoint
    console.log('Calling LiveStream.findById with:', req.params.id);
    const stream = await LiveStream.findById(req.params.id);
    console.log('LiveStream.findById result:', stream ? 'found' : 'null');
    
    if (!stream) {
      console.log('Stream not found in database');
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }
    
    if (stream.user_id !== req.user.id) {
      console.log('Stream user_id mismatch:', stream.user_id, 'vs', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }
    
    console.log('Stream found:', stream.id, 'title:', stream.title);
    
    // Get republishing targets
    const republishingTargets = await StreamRepublishing.findByStreamId(req.params.id);
    console.log('Found republishing targets:', republishingTargets.length);
    
    // Update stream status to live
    await LiveStream.updateStatus(req.params.id, 'live');
    
    // Activate existing republishing rules (don't create new ones)
    const republishingResults = [];
    for (const republishing of republishingTargets || []) {
      if (republishing.enabled) {
        try {
          console.log(`Activating republishing to ${republishing.destination_name}...`);
          
          // Update republishing status to active in database
          // Note: Nimble rules already exist from stream creation
          await StreamRepublishing.updateStatus(republishing.id, 'active');
          
          republishingResults.push({
            destination: republishing.destination_name,
            status: 'active',
            message: 'Republishing activated successfully',
            republishing_id: republishing.id
          });
          
        } catch (activationError) {
          console.warn(`Failed to activate ${republishing.destination_name}:`, activationError.message);
          republishingResults.push({
            destination: republishing.destination_name,
            status: 'failed',
            message: 'Failed to activate republishing',
            error: activationError.message
          });
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Stream republishing activation initiated',
      stream_key: stream.stream_key,
      rtmp_url: stream.rtmp_url,
      republishing_results: republishingResults
    });
    
  } catch (error) {
    console.error('Start republishing error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/:id/stop', auth, async (req, res) => {
  try {
    console.log('Stopping republishing for stream:', req.params.id);
    
    const stream = await LiveStream.findById(req.params.id);
    if (!stream || stream.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }
    
    // Update stream status to inactive (not ended) so it can be reused
    await LiveStream.updateStatus(req.params.id, 'inactive');
    
    // Deactivate republishing targets
    const republishingTargets = await StreamRepublishing.findByStreamId(req.params.id);
    for (const republishing of republishingTargets || []) {
      try {
        await StreamRepublishing.updateStatus(republishing.id, 'inactive');
        console.log(`Deactivated republishing to ${republishing.destination_name}`);
      } catch (error) {
        console.warn(`Failed to deactivate ${republishing.destination_name}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      message: 'Stream republishing stopped'
    });
    
  } catch (error) {
    console.error('Stop republishing error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;