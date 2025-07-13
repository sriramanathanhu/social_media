const liveStreamingService = require('../services/liveStreamingService');
const StreamRepublishing = require('../models/StreamRepublishing');
const NimbleController = require('../services/nimbleController');
const NimbleMonitor = require('../services/nimbleMonitor');
const { validationResult } = require('express-validator');

// Stream Management
const createStream = async (req, res) => {
  try {
    console.log('Creating live stream for user:', req.user.id);
    console.log('Request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const stream = await liveStreamingService.createStream(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      stream
    });
  } catch (error) {
    console.error('Create stream error:', error);
    res.status(500).json({ 
      error: 'Failed to create stream',
      details: error.message 
    });
  }
};

const getStreams = async (req, res) => {
  try {
    console.log('Fetching streams for user:', req.user.id);
    
    const streams = await liveStreamingService.getUserStreams(req.user.id);
    
    res.json({
      success: true,
      streams
    });
  } catch (error) {
    console.error('Get streams error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch streams',
      details: error.message 
    });
  }
};

const getStream = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching stream:', id, 'for user:', req.user.id);
    
    const stream = await liveStreamingService.getStream(id);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    // Check ownership
    if (stream.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      success: true,
      stream
    });
  } catch (error) {
    console.error('Get stream error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stream',
      details: error.message 
    });
  }
};

const updateStream = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Updating stream:', id, 'for user:', req.user.id);
    console.log('Update data:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Check ownership first
    const existingStream = await liveStreamingService.getStream(id);
    if (!existingStream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    if (existingStream.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updatedStream = await liveStreamingService.updateStream(id, req.body);
    
    res.json({
      success: true,
      stream: updatedStream
    });
  } catch (error) {
    console.error('Update stream error:', error);
    res.status(500).json({ 
      error: 'Failed to update stream',
      details: error.message 
    });
  }
};

const deleteStream = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting stream:', id, 'for user:', req.user.id);
    
    // Check ownership first
    const existingStream = await liveStreamingService.getStream(id);
    if (!existingStream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    if (existingStream.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const deletedStream = await liveStreamingService.deleteStream(id);
    
    res.json({
      success: true,
      message: 'Stream deleted successfully',
      stream: deletedStream
    });
  } catch (error) {
    console.error('Delete stream error:', error);
    res.status(500).json({ 
      error: 'Failed to delete stream',
      details: error.message 
    });
  }
};

// Stream Session Management
const startStreamSession = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Starting stream session for stream:', id);
    
    // Check ownership
    const stream = await liveStreamingService.getStream(id);
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    if (stream.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const session = await liveStreamingService.startStreamSession(
      id, 
      req.user.id, 
      req.body.metadata || {}
    );
    
    res.status(201).json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Start stream session error:', error);
    res.status(500).json({ 
      error: 'Failed to start stream session',
      details: error.message 
    });
  }
};

const endStreamSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log('Ending stream session:', sessionId);
    
    const endedSession = await liveStreamingService.endStreamSession(sessionId, req.body);
    
    res.json({
      success: true,
      session: endedSession
    });
  } catch (error) {
    console.error('End stream session error:', error);
    res.status(500).json({ 
      error: 'Failed to end stream session',
      details: error.message 
    });
  }
};

const updateSessionStats = async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log('Updating session stats for session:', sessionId);
    
    const updatedSession = await liveStreamingService.updateSessionStats(sessionId, req.body);
    
    res.json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    console.error('Update session stats error:', error);
    res.status(500).json({ 
      error: 'Failed to update session stats',
      details: error.message 
    });
  }
};

// Republishing Management
const getRepublishing = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching republishing for stream:', id);
    
    const republishing = await StreamRepublishing.findByStreamId(id);
    
    res.json({
      success: true,
      republishing
    });
  } catch (error) {
    console.error('Get republishing error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch republishing settings',
      details: error.message 
    });
  }
};

const addRepublishing = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Adding republishing for stream:', id);
    console.log('Republishing data:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Check ownership
    const stream = await liveStreamingService.getStream(id);
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    if (stream.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const republishing = await liveStreamingService.addRepublishing(id, req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      republishing
    });
  } catch (error) {
    console.error('Add republishing error:', error);
    res.status(500).json({ 
      error: 'Failed to add republishing',
      details: error.message 
    });
  }
};

const removeRepublishing = async (req, res) => {
  try {
    const { republishingId } = req.params;
    console.log('Removing republishing:', republishingId);
    
    // Check ownership
    const republishing = await StreamRepublishing.findById(republishingId);
    if (!republishing) {
      return res.status(404).json({ error: 'Republishing not found' });
    }
    
    if (republishing.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const removedRepublishing = await liveStreamingService.removeRepublishing(republishingId);
    
    res.json({
      success: true,
      message: 'Republishing removed successfully',
      republishing: removedRepublishing
    });
  } catch (error) {
    console.error('Remove republishing error:', error);
    res.status(500).json({ 
      error: 'Failed to remove republishing',
      details: error.message 
    });
  }
};

// Platform-specific republishing
const addYouTubeRepublishing = async (req, res) => {
  try {
    const { id } = req.params;
    const { sourceApp, sourceStream, streamKey } = req.body;
    
    console.log('Adding YouTube republishing for stream:', id);
    
    if (!streamKey) {
      return res.status(400).json({ error: 'YouTube stream key is required' });
    }
    
    // Check ownership
    const stream = await liveStreamingService.getStream(id);
    if (!stream || stream.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Stream not found or access denied' });
    }
    
    const republishing = await liveStreamingService.addYouTubeRepublishing(
      id, 
      req.user.id, 
      sourceApp || stream.source_app, 
      sourceStream || stream.source_stream, 
      streamKey
    );
    
    res.status(201).json({
      success: true,
      republishing
    });
  } catch (error) {
    console.error('Add YouTube republishing error:', error);
    res.status(500).json({ 
      error: 'Failed to add YouTube republishing',
      details: error.message 
    });
  }
};

const addTwitterRepublishing = async (req, res) => {
  try {
    const { id } = req.params;
    const { sourceApp, sourceStream, streamKey } = req.body;
    
    console.log('Adding Twitter republishing for stream:', id);
    
    if (!streamKey) {
      return res.status(400).json({ error: 'Twitter stream key is required' });
    }
    
    // Check ownership
    const stream = await liveStreamingService.getStream(id);
    if (!stream || stream.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Stream not found or access denied' });
    }
    
    const republishing = await liveStreamingService.addTwitterRepublishing(
      id, 
      req.user.id, 
      sourceApp || stream.source_app, 
      sourceStream || stream.source_stream, 
      streamKey
    );
    
    res.status(201).json({
      success: true,
      republishing
    });
  } catch (error) {
    console.error('Add Twitter republishing error:', error);
    res.status(500).json({ 
      error: 'Failed to add Twitter republishing',
      details: error.message 
    });
  }
};

// Analytics and Stats
const getStreamAnalytics = async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    console.log('Fetching stream analytics for user:', req.user.id, 'period:', period);
    
    const analytics = await liveStreamingService.getStreamAnalytics(req.user.id, period);
    
    res.json({
      success: true,
      analytics,
      period
    });
  } catch (error) {
    console.error('Get stream analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stream analytics',
      details: error.message 
    });
  }
};

const getActiveStreams = async (req, res) => {
  try {
    console.log('Fetching active streams');
    
    const activeStreams = await liveStreamingService.getActiveStreams();
    
    res.json({
      success: true,
      streams: activeStreams
    });
  } catch (error) {
    console.error('Get active streams error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch active streams',
      details: error.message 
    });
  }
};

const getActiveSessions = async (req, res) => {
  try {
    console.log('Fetching active sessions for user:', req.user.id);
    
    const activeSessions = await liveStreamingService.getActiveSessions(req.user.id);
    
    res.json({
      success: true,
      sessions: activeSessions
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch active sessions',
      details: error.message 
    });
  }
};

// Nimble-specific endpoints
const getNimbleConfig = async (req, res) => {
  try {
    console.log('Fetching Nimble configuration');
    
    const nimbleController = new NimbleController();
    const config = await nimbleController.getCurrentConfig();
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Get Nimble config error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Nimble configuration',
      details: error.message 
    });
  }
};

const updateNimbleConfig = async (req, res) => {
  try {
    console.log('Updating Nimble configuration');
    
    const nimbleController = new NimbleController();
    const config = await nimbleController.updateNimbleConfig();
    
    res.json({
      success: true,
      message: 'Nimble configuration updated successfully',
      config
    });
  } catch (error) {
    console.error('Update Nimble config error:', error);
    res.status(500).json({ 
      error: 'Failed to update Nimble configuration',
      details: error.message 
    });
  }
};

const getNimbleStatus = async (req, res) => {
  try {
    console.log('Fetching Nimble monitor status');
    
    const nimbleMonitor = new NimbleMonitor();
    const status = nimbleMonitor.getStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Get Nimble status error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Nimble status',
      details: error.message 
    });
  }
};

const getStreamRTMPInfo = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching RTMP info for stream:', id);
    
    // Check ownership
    const stream = await liveStreamingService.getStream(id);
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    if (stream.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const nimbleHost = process.env.NIMBLE_HOST || '37.27.201.26';
    const nimblePort = process.env.NIMBLE_PORT || 1935;
    
    res.json({
      success: true,
      rtmp_info: {
        server: `rtmp://${nimbleHost}:${nimblePort}/live`,
        stream_key: stream.stream_key,
        full_url: `rtmp://${nimbleHost}:${nimblePort}/live/${stream.stream_key}`,
        obs_settings: {
          server: `rtmp://${nimbleHost}:${nimblePort}/live`,
          stream_key: stream.stream_key
        }
      }
    });
  } catch (error) {
    console.error('Get RTMP info error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch RTMP information',
      details: error.message 
    });
  }
};

module.exports = {
  createStream,
  getStreams,
  getStream,
  updateStream,
  deleteStream,
  startStreamSession,
  endStreamSession,
  updateSessionStats,
  getRepublishing,
  addRepublishing,
  removeRepublishing,
  addYouTubeRepublishing,
  addTwitterRepublishing,
  getStreamAnalytics,
  getActiveStreams,
  getActiveSessions,
  getNimbleConfig,
  updateNimbleConfig,
  getNimbleStatus,
  getStreamRTMPInfo
};