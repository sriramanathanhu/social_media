const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const liveStreamingService = require('../services/liveStreamingService');
const wmsPanelService = require('../services/wmsPanelService');

// Get all live streams for a user
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching streams for user:', req.user.userId);
    const streams = await liveStreamingService.getUserStreams(req.user.userId);
    
    res.json({
      success: true,
      streams
    });
  } catch (error) {
    console.error('Get streams error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get a specific live stream
router.get('/:streamId', auth, async (req, res) => {
  try {
    console.log('Fetching stream:', req.params.streamId, 'for user:', req.user.userId);
    const stream = await liveStreamingService.getStream(req.params.streamId);
    
    if (!stream || stream.user_id !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }
    
    res.json({
      success: true,
      stream
    });
  } catch (error) {
    console.error('Get stream error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create a new live stream
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating live stream for user:', req.user.userId);
    console.log('Request body:', req.body);
    
    const stream = await liveStreamingService.createStream(req.user.userId, req.body);
    
    res.json({
      success: true,
      stream
    });
  } catch (error) {
    console.error('Create stream error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update a live stream
router.put('/:streamId', auth, async (req, res) => {
  try {
    console.log('Updating stream:', req.params.streamId, 'for user:', req.user.userId);
    console.log('Update data:', req.body);
    
    const stream = await liveStreamingService.getStream(req.params.streamId);
    if (!stream || stream.user_id !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }
    
    const updatedStream = await liveStreamingService.updateStream(req.params.streamId, req.body);
    
    console.log('Stream updated:', updatedStream.id);
    res.json({
      success: true,
      stream: updatedStream
    });
  } catch (error) {
    console.error('Update stream error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete a live stream
router.delete('/:streamId', auth, async (req, res) => {
  try {
    console.log('Deleting stream:', req.params.streamId, 'for user:', req.user.userId);
    
    const stream = await liveStreamingService.getStream(req.params.streamId);
    if (!stream || stream.user_id !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }
    
    const deletedStream = await liveStreamingService.deleteStream(req.params.streamId);
    
    res.json({
      success: true,
      stream: deletedStream
    });
  } catch (error) {
    console.error('Delete stream error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Start republishing for a stream (manual activation)
router.post('/:streamId/start', auth, async (req, res) => {
  try {
    console.log('Starting republishing for stream:', req.params.streamId);
    
    const stream = await liveStreamingService.getStream(req.params.streamId);
    if (!stream || stream.user_id !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }
    
    // Update stream status to live
    await liveStreamingService.updateStream(req.params.streamId, { status: 'live' });
    
    // Configure republishing through WMSPanel
    const republishingResults = [];
    for (const republishing of stream.republishing || []) {
      if (republishing.enabled) {
        try {
          console.log(`Configuring republishing to ${republishing.destination_name}...`);
          
          // Add republishing rule via WMSPanel
          await wmsPanelService.addRepublishingRule(
            stream.source_app || 'live',
            stream.stream_key,
            republishing.destination_url,
            republishing.destination_port || 1935,
            republishing.destination_app,
            republishing.destination_stream
          );
          
          republishingResults.push({
            destination: republishing.destination_name,
            status: 'configured',
            message: 'Republishing rule added successfully'
          });
          
        } catch (wmsPanelError) {
          console.warn(`Failed to configure ${republishing.destination_name}:`, wmsPanelError.message);
          republishingResults.push({
            destination: republishing.destination_name,
            status: 'manual_required',
            message: 'Manual configuration required in WMSPanel',
            details: {
              source_app: stream.source_app || 'live',
              source_stream: stream.stream_key,
              destination_url: republishing.destination_url,
              destination_port: republishing.destination_port || 1935,
              destination_app: republishing.destination_app,
              destination_stream: republishing.destination_stream
            }
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

// Stop republishing for a stream
router.post('/:streamId/stop', auth, async (req, res) => {
  try {
    console.log('Stopping republishing for stream:', req.params.streamId);
    
    const stream = await liveStreamingService.getStream(req.params.streamId);
    if (!stream || stream.user_id !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }
    
    // Update stream status to ended
    await liveStreamingService.updateStream(req.params.streamId, { status: 'ended' });
    
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

// Get RTMP information for a stream
router.get('/:streamId/rtmp', auth, async (req, res) => {
  try {
    console.log('Fetching RTMP info for stream:', req.params.streamId);
    
    const stream = await liveStreamingService.getStream(req.params.streamId);
    if (!stream || stream.user_id !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }
    
    res.json({
      success: true,
      rtmp_url: stream.rtmp_url,
      stream_key: stream.stream_key,
      source_app: stream.source_app,
      republishing: stream.republishing || []
    });
  } catch (error) {
    console.error('Get RTMP info error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get active sessions
router.get('/sessions/active', auth, async (req, res) => {
  try {
    console.log('Fetching active sessions for user:', req.user.userId);
    const sessions = await liveStreamingService.getActiveSessions(req.user.userId);
    
    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;