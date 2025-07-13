const LiveStream = require('../models/LiveStream');
const StreamSession = require('../models/StreamSession');
const StreamRepublishing = require('../models/StreamRepublishing');
const publishingService = require('./publishingService');
const NimbleController = require('./nimbleController');
const NimbleMonitor = require('./nimbleMonitor');
const crypto = require('crypto');

class LiveStreamingService {
  constructor() {
    this.nimbleController = new NimbleController();
    this.nimbleMonitor = new NimbleMonitor();
    
    // Start monitoring Nimble streams
    this.nimbleMonitor.startMonitoring(30000); // Monitor every 30 seconds
    
    console.log('LiveStreamingService initialized with Nimble integration');
  }
  
  // Stream Management
  async createStream(userId, streamData) {
    try {
      console.log('Creating live stream for user:', userId);
      console.log('Stream data:', streamData);
      
      let streamKey, rtmpUrl, sourceApp;
      
      // Check if this is an app-based stream or legacy stream
      if (streamData.app_id && streamData.app_key_id) {
        // App-based stream creation
        const StreamApp = require('../models/StreamApp');
        const StreamAppKey = require('../models/StreamAppKey');
        
        // Verify app ownership
        const app = await StreamApp.findById(streamData.app_id);
        if (!app || app.user_id !== userId) {
          throw new Error('App not found or access denied');
        }
        
        // Verify key belongs to app
        const appKey = await StreamAppKey.findById(streamData.app_key_id);
        if (!appKey || appKey.app_id !== streamData.app_id) {
          throw new Error('Stream key not found or does not belong to this app');
        }
        
        if (!appKey.is_active) {
          throw new Error('Stream key is not active');
        }
        
        // Use app's RTMP path and DEFAULT key for OBS (not the selected republishing key)
        const nimbleHost = process.env.NIMBLE_HOST || '37.27.201.26';
        const nimblePort = process.env.NIMBLE_PORT || 1935;
        rtmpUrl = `rtmp://${nimbleHost}:${nimblePort}/${app.rtmp_app_path}`;
        
        // ALWAYS use the app's default key for OBS streaming
        streamKey = app.default_stream_key;
        sourceApp = app.rtmp_app_path;
        
        // The selected appKey will be used for republishing destinations
        
        // Increment usage count for the key
        await StreamAppKey.incrementUsage(streamData.app_key_id);
        
        console.log('Creating app-based stream with app:', app.app_name, 'key:', appKey.key_name);
      } else {
        // Legacy stream creation (generate new key)
        streamKey = crypto.randomBytes(16).toString('hex');
        const nimbleHost = process.env.NIMBLE_HOST || '37.27.201.26';
        const nimblePort = process.env.NIMBLE_PORT || 1935;
        rtmpUrl = `rtmp://${nimbleHost}:${nimblePort}/live`;
        sourceApp = streamData.sourceApp || 'live';
        
        console.log('Creating legacy stream with generated key');
      }
      
      // Create stream in database
      const stream = await LiveStream.create({
        userId,
        title: streamData.title,
        description: streamData.description,
        stream_key: streamKey,
        rtmp_url: rtmpUrl,
        source_app: sourceApp,
        source_stream: streamKey,
        app_id: streamData.app_id || null,
        app_key_id: streamData.app_key_id || null,
        destinations: streamData.destinations || [],
        quality_settings: streamData.qualitySettings || {
          resolution: '1920x1080',
          bitrate: 4000,
          framerate: 30,
          audio_bitrate: 128
        },
        auto_post_enabled: streamData.autoPostEnabled || false,
        auto_post_accounts: streamData.autoPostAccounts || [],
        auto_post_message: streamData.autoPostMessage,
        category: streamData.category,
        tags: streamData.tags || [],
        is_public: streamData.isPublic !== false
      });
      
      console.log('Live stream created:', stream.id, 'with key:', streamKey);
      
      // For app-based streams, automatically create republishing destination for the selected key
      if (streamData.app_id && streamData.app_key_id && appKey.key_name.toLowerCase() !== 'default') {
        // Determine platform from key name
        const keyName = appKey.key_name.toLowerCase();
        const keyValue = appKey.stream_key;
        
        let platform = null;
        if (keyName.includes('youtube') || keyName.includes('yt')) {
          platform = 'youtube';
        } else if (keyName.includes('twitch')) {
          platform = 'twitch';
        } else if (keyName.includes('facebook') || keyName.includes('fb')) {
          platform = 'facebook';
        } else if (keyName.includes('twitter') || keyName.includes('x')) {
          platform = 'twitter';
        }
        
        if (platform) {
          console.log(`Auto-creating ${platform} republishing destination with key:`, keyValue);
          const republishingTarget = {
            platform: platform,
            streamKey: keyValue,
            enabled: true
          };
          await this.addStreamRepublishing(stream.id, [republishingTarget]);
        }
      }
      
      // Add additional republishing destinations if provided
      if (streamData.republishingTargets && streamData.republishingTargets.length > 0) {
        await this.addStreamRepublishing(stream.id, streamData.republishingTargets);
      }
      
      return {
        ...stream,
        rtmp_url: rtmpUrl,
        stream_key: streamKey
      };
      
    } catch (error) {
      console.error('Failed to create live stream:', error);
      throw error;
    }
  }
  
  async getUserStreams(userId) {
    try {
      const streams = await LiveStream.findByUserId(userId);
      
      // Return basic streams without complex joins for now
      const enrichedStreams = streams.map((stream) => {
        return {
          ...stream,
          stats: {
            session_count: 0,
            total_duration: 0,
            max_viewers: 0,
            total_viewers: 0
          },
          republishing_count: 0,
          active_republishing: 0
        };
      });
      
      return enrichedStreams;
    } catch (error) {
      console.error('Failed to get user streams:', error);
      throw error;
    }
  }
  
  async getStream(streamId) {
    try {
      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }
      
      const stats = await LiveStream.getStreamStats(streamId);
      const sessions = await StreamSession.findByStreamId(streamId);
      const republishing = await StreamRepublishing.findByStreamId(streamId);
      
      return {
        ...stream,
        stats,
        sessions,
        republishing
      };
    } catch (error) {
      console.error('Failed to get stream:', error);
      throw error;
    }
  }
  
  async updateStream(streamId, updateData) {
    try {
      const updatedStream = await LiveStream.update(streamId, updateData);
      console.log('Stream updated:', updatedStream.id);
      return updatedStream;
    } catch (error) {
      console.error('Failed to update stream:', error);
      throw error;
    }
  }
  
  async deleteStream(streamId) {
    try {
      // End any active sessions first
      const activeSessions = await StreamSession.findByStreamId(streamId);
      for (const session of activeSessions) {
        if (session.status === 'active') {
          await this.endStreamSession(session.id);
        }
      }
      
      const deletedStream = await LiveStream.delete(streamId);
      console.log('Stream deleted:', deletedStream.id);
      return deletedStream;
    } catch (error) {
      console.error('Failed to delete stream:', error);
      throw error;
    }
  }
  
  // Stream Session Management
  async startStreamSession(streamId, userId, metadata = {}) {
    try {
      console.log('Starting stream session for stream:', streamId);
      
      // Update stream status to live
      await LiveStream.updateStatus(streamId, 'live');
      
      // Create new session
      const session = await StreamSession.create({
        streamId,
        userId,
        metadata
      });
      
      // Start republishing if configured
      await this.startRepublishing(streamId);
      
      // Auto-post to social media if enabled
      const stream = await LiveStream.findById(streamId);
      if (stream.auto_post_enabled && stream.auto_post_accounts.length > 0) {
        await this.postStreamAnnouncement(stream);
      }
      
      console.log('Stream session started:', session.id);
      return session;
    } catch (error) {
      console.error('Failed to start stream session:', error);
      throw error;
    }
  }
  
  async endStreamSession(sessionId, endData = {}) {
    try {
      console.log('Ending stream session:', sessionId);
      
      const session = await StreamSession.findById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      // End the session
      const endedSession = await StreamSession.endSession(sessionId, endData);
      
      // Update stream status
      await LiveStream.updateStatus(session.stream_id, 'ended');
      
      // Stop republishing
      await this.stopRepublishing(session.stream_id);
      
      console.log('Stream session ended:', endedSession.id);
      return endedSession;
    } catch (error) {
      console.error('Failed to end stream session:', error);
      throw error;
    }
  }
  
  async updateSessionStats(sessionId, stats) {
    try {
      const updatedSession = await StreamSession.updateStats(sessionId, stats);
      return updatedSession;
    } catch (error) {
      console.error('Failed to update session stats:', error);
      throw error;
    }
  }
  
  // Republishing Management
  async addRepublishing(streamId, userId, republishingData) {
    try {
      console.log('Adding republishing for stream:', streamId);
      
      const republishing = await StreamRepublishing.create({
        streamId,
        userId,
        ...republishingData
      });
      
      console.log('Republishing added:', republishing.id);
      return republishing;
    } catch (error) {
      console.error('Failed to add republishing:', error);
      throw error;
    }
  }
  
  async removeRepublishing(republishingId) {
    try {
      console.log('Removing republishing:', republishingId);
      
      // Stop if active
      await StreamRepublishing.updateStatus(republishingId, 'inactive');
      
      // Delete
      const deletedRepublishing = await StreamRepublishing.delete(republishingId);
      
      console.log('Republishing removed:', deletedRepublishing.id);
      return deletedRepublishing;
    } catch (error) {
      console.error('Failed to remove republishing:', error);
      throw error;
    }
  }
  
  async startRepublishing(streamId) {
    try {
      console.log('Starting republishing for stream:', streamId);
      
      // Use NimbleController to start stream republishing
      await this.nimbleController.startStreamRepublishing(streamId);
      
      const republishingList = await StreamRepublishing.findByStreamId(streamId);
      const enabledRepublishing = republishingList.filter(r => r.enabled);
      
      for (const republishing of enabledRepublishing) {
        try {
          // Update status to active
          await StreamRepublishing.updateStatus(republishing.id, 'active');
          console.log('Started republishing to:', republishing.destination_name);
        } catch (error) {
          console.error('Failed to start republishing to', republishing.destination_name, ':', error);
          await StreamRepublishing.updateStatus(republishing.id, 'error', { error: error.message });
        }
      }
      
      return enabledRepublishing.length;
    } catch (error) {
      console.error('Failed to start republishing:', error);
      throw error;
    }
  }
  
  async stopRepublishing(streamId) {
    try {
      console.log('Stopping republishing for stream:', streamId);
      
      // Use NimbleController to stop stream republishing
      await this.nimbleController.stopStreamRepublishing(streamId);
      
      const results = await StreamRepublishing.bulkUpdateStatus(streamId, 'inactive');
      
      console.log('Stopped republishing for', results.length, 'destinations');
      return results;
    } catch (error) {
      console.error('Failed to stop republishing:', error);
      throw error;
    }
  }
  
  // Helper method to add stream republishing
  async addStreamRepublishing(streamId, republishingTargets) {
    try {
      console.log('Adding republishing targets for stream:', streamId);
      
      const results = [];
      for (const target of republishingTargets) {
        const republishing = await this.nimbleController.addRepublishing(streamId, target);
        results.push(republishing);
      }
      
      console.log(`Added ${results.length} republishing targets`);
      return results;
    } catch (error) {
      console.error('Failed to add stream republishing:', error);
      throw error;
    }
  }
  
  // Platform-specific republishing helpers
  async addYouTubeRepublishing(streamId, userId, sourceApp, sourceStream, youtubeStreamKey) {
    const destination = {
      platform: 'youtube',
      streamKey: youtubeStreamKey,
      enabled: true
    };
    return this.nimbleController.addRepublishing(streamId, destination);
  }
  
  async addTwitterRepublishing(streamId, userId, sourceApp, sourceStream, twitterStreamKey) {
    const destination = {
      platform: 'twitter',
      streamKey: twitterStreamKey,
      enabled: true
    };
    return this.nimbleController.addRepublishing(streamId, destination);
  }
  
  async addFacebookRepublishing(streamId, userId, sourceApp, sourceStream, facebookStreamKey) {
    const destination = {
      platform: 'facebook',
      streamKey: facebookStreamKey,
      enabled: true
    };
    return this.nimbleController.addRepublishing(streamId, destination);
  }
  
  // Social Media Integration
  async postStreamAnnouncement(stream) {
    try {
      console.log('Posting stream announcement for stream:', stream.id);
      
      if (!stream.auto_post_enabled || !stream.auto_post_accounts.length) {
        console.log('Auto-posting not enabled for stream');
        return null;
      }
      
      const message = stream.auto_post_message || `🔴 Live now: ${stream.title}`;
      const mediaFiles = []; // Could add stream thumbnail here
      
      const result = await publishingService.publishPost(
        stream.user_id,
        message,
        stream.auto_post_accounts,
        mediaFiles,
        null, // scheduledFor
        'text' // postType
      );
      
      console.log('Stream announcement posted successfully');
      return result;
    } catch (error) {
      console.error('Failed to post stream announcement:', error);
      throw error;
    }
  }
  
  // Analytics and Stats
  async getStreamAnalytics(userId, period = '7d') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '24h':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }
      
      // This is a simplified analytics query
      // In production, you'd want more sophisticated analytics
      const sessions = await StreamSession.getSessionsByUser(userId, 1000, 0);
      const recentSessions = sessions.filter(s => new Date(s.started_at) >= startDate);
      
      const analytics = {
        total_streams: recentSessions.length,
        total_duration: recentSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0),
        total_viewers: recentSessions.reduce((sum, s) => sum + (s.viewer_count || 0), 0),
        avg_viewers: recentSessions.length > 0 ? 
          recentSessions.reduce((sum, s) => sum + (s.peak_viewers || 0), 0) / recentSessions.length : 0,
        avg_session_duration: recentSessions.length > 0 ?
          recentSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / recentSessions.length : 0
      };
      
      return analytics;
    } catch (error) {
      console.error('Failed to get stream analytics:', error);
      throw error;
    }
  }
  
  async getActiveStreams() {
    try {
      const activeStreams = await LiveStream.getActiveStreams();
      return activeStreams;
    } catch (error) {
      console.error('Failed to get active streams:', error);
      throw error;
    }
  }
  
  async getActiveSessions(userId = null) {
    try {
      const activeSessions = await StreamSession.getActiveSessions(userId);
      return activeSessions;
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      throw error;
    }
  }
}

module.exports = new LiveStreamingService();