const LiveStream = require('../models/LiveStream');
const StreamSession = require('../models/StreamSession');
const StreamRepublishing = require('../models/StreamRepublishing');
const publishingService = require('./publishingService');
const crypto = require('crypto');

class LiveStreamingService {
  
  // Stream Management
  async createStream(userId, streamData) {
    try {
      console.log('Creating live stream for user:', userId);
      
      // Generate unique source stream name if not provided
      if (!streamData.sourceStream) {
        streamData.sourceStream = `stream_${crypto.randomBytes(8).toString('hex')}`;
      }
      
      const stream = await LiveStream.create({
        userId,
        ...streamData
      });
      
      console.log('Live stream created:', stream.id);
      return stream;
    } catch (error) {
      console.error('Failed to create live stream:', error);
      throw error;
    }
  }
  
  async getUserStreams(userId) {
    try {
      const streams = await LiveStream.findByUserId(userId);
      
      // Enrich streams with additional data
      const enrichedStreams = await Promise.all(streams.map(async (stream) => {
        const stats = await LiveStream.getStreamStats(stream.id);
        const republishing = await StreamRepublishing.findByStreamId(stream.id);
        
        return {
          ...stream,
          stats,
          republishing_count: republishing.length,
          active_republishing: republishing.filter(r => r.status === 'active').length
        };
      }));
      
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
      
      const republishingList = await StreamRepublishing.findByStreamId(streamId);
      const enabledRepublishing = republishingList.filter(r => r.enabled);
      
      for (const republishing of enabledRepublishing) {
        try {
          // Update status to active
          await StreamRepublishing.updateStatus(republishing.id, 'active');
          
          // Here you would integrate with the actual streaming server
          // to configure the republishing destinations
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
      
      const results = await StreamRepublishing.bulkUpdateStatus(streamId, 'inactive');
      
      console.log('Stopped republishing for', results.length, 'destinations');
      return results;
    } catch (error) {
      console.error('Failed to stop republishing:', error);
      throw error;
    }
  }
  
  // Platform-specific republishing helpers
  async addYouTubeRepublishing(streamId, userId, sourceApp, sourceStream, youtubeStreamKey) {
    return StreamRepublishing.createYouTubeRepublishing(streamId, userId, sourceApp, sourceStream, youtubeStreamKey);
  }
  
  async addTwitterRepublishing(streamId, userId, sourceApp, sourceStream, twitterStreamKey) {
    return StreamRepublishing.createTwitterRepublishing(streamId, userId, sourceApp, sourceStream, twitterStreamKey);
  }
  
  async addFacebookRepublishing(streamId, userId, sourceApp, sourceStream, facebookStreamKey) {
    return StreamRepublishing.createFacebookRepublishing(streamId, userId, sourceApp, sourceStream, facebookStreamKey);
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
        total_viewers: recentSessions.reduce((sum, s) => sum + (s.total_viewers || 0), 0),
        avg_viewers: recentSessions.length > 0 ? 
          recentSessions.reduce((sum, s) => sum + (s.peak_viewers || 0), 0) / recentSessions.length : 0,
        avg_connection_quality: recentSessions.length > 0 ?
          recentSessions.reduce((sum, s) => sum + (s.connection_quality || 0), 0) / recentSessions.length : 0
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