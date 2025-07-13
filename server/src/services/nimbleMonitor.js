const LiveStream = require('../models/LiveStream');
const StreamSession = require('../models/StreamSession');
const StreamRepublishing = require('../models/StreamRepublishing');

class NimbleMonitor {
  constructor() {
    this.nimbleHost = process.env.NIMBLE_HOST || '37.27.201.26';
    this.nimbleStatsPort = process.env.NIMBLE_STATS_PORT || 8082;
    this.nimbleStatsURL = `http://${this.nimbleHost}:${this.nimbleStatsPort}`;
    this.monitoringInterval = null;
    this.isMonitoring = false;
    
    console.log('NimbleMonitor initialized with stats URL:', this.nimbleStatsURL);
  }
  
  /**
   * Start monitoring Nimble streams
   */
  startMonitoring(intervalMs = 30000) {
    if (this.isMonitoring) {
      console.log('NimbleMonitor is already running');
      return;
    }
    
    console.log(`Starting NimbleMonitor with ${intervalMs}ms interval`);
    this.isMonitoring = true;
    
    // Initial check
    this.checkStreamStatus();
    
    // Set up interval monitoring
    this.monitoringInterval = setInterval(() => {
      this.checkStreamStatus();
    }, intervalMs);
  }
  
  /**
   * Stop monitoring Nimble streams
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('NimbleMonitor stopped');
  }
  
  /**
   * Check stream status from Nimble stats
   */
  async checkStreamStatus() {
    try {
      const stats = await this.fetchNimbleStats();
      if (stats) {
        await this.processStreamStats(stats);
      }
    } catch (error) {
      console.error('Error checking stream status:', error);
    }
  }
  
  /**
   * Fetch stats from Nimble server
   */
  async fetchNimbleStats() {
    try {
      const endpoints = [
        '/stats',
        '/stats.json',
        '/status',
        '/info'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.nimbleStatsURL}${endpoint}`, {
            timeout: 5000,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Social-Media-Platform-Monitor'
            }
          });
          
          if (response.ok) {
            const stats = await response.json();
            console.log(`Successfully fetched stats from ${endpoint}`);
            return stats;
          }
        } catch (err) {
          console.log(`Stats endpoint ${endpoint} not available:`, err.message);
        }
      }
      
      throw new Error('No working stats endpoint found');
      
    } catch (error) {
      console.error('Failed to fetch Nimble stats:', error);
      return null;
    }
  }
  
  /**
   * Process stream statistics from Nimble
   */
  async processStreamStats(stats) {
    try {
      console.log('Processing Nimble stats...');
      
      // Handle different Nimble stats formats
      const applications = this.extractApplications(stats);
      
      for (const app of applications) {
        const streams = this.extractStreams(app);
        
        for (const nimbleStream of streams) {
          await this.updateStreamFromNimbleData(nimbleStream, app.name);
        }
      }
      
    } catch (error) {
      console.error('Error processing stream stats:', error);
    }
  }
  
  /**
   * Extract applications from different Nimble stats formats
   */
  extractApplications(stats) {
    // Try different possible stats structures
    if (stats.applications) {
      return stats.applications;
    }
    
    if (stats.rtmp && stats.rtmp.applications) {
      return stats.rtmp.applications;
    }
    
    if (stats.server && stats.server.applications) {
      return stats.server.applications;
    }
    
    // If no applications structure, create a default one
    if (stats.streams) {
      return [{ name: 'live', streams: stats.streams }];
    }
    
    console.log('No applications found in stats structure');
    return [];
  }
  
  /**
   * Extract streams from application data
   */
  extractStreams(app) {
    if (app.streams) {
      return Array.isArray(app.streams) ? app.streams : Object.values(app.streams);
    }
    
    if (app.publishers) {
      return Array.isArray(app.publishers) ? app.publishers : Object.values(app.publishers);
    }
    
    return [];
  }
  
  /**
   * Update database with stream data from Nimble
   */
  async updateStreamFromNimbleData(nimbleStream, appName) {
    try {
      const streamKey = nimbleStream.name || nimbleStream.stream || nimbleStream.key;
      if (!streamKey) {
        console.log('No stream key found in Nimble data');
        return;
      }
      
      console.log(`Processing stream: ${streamKey} from app: ${appName}`);
      
      // Find the stream in our database
      const stream = await this.findStreamByKey(streamKey, appName);
      if (!stream) {
        console.log(`Stream ${streamKey} not found in database`);
        return;
      }
      
      // Check if stream is marked as live in our database
      if (stream.status !== 'live') {
        // Stream is broadcasting but not marked as live, update status
        await LiveStream.updateStatus(stream.id, 'live');
        console.log(`Updated stream ${streamKey} status to live`);
      }
      
      // Find or create active session
      let session = await this.findOrCreateActiveSession(stream.id, stream.user_id);
      
      // Update session stats
      const stats = this.extractStreamMetrics(nimbleStream);
      if (stats && session) {
        await StreamSession.updateStats(session.id, stats);
        console.log(`Updated stats for session ${session.id}`);
      }
      
      // Update republishing status
      await this.updateRepublishingStatus(stream.id, nimbleStream);
      
    } catch (error) {
      console.error('Error updating stream from Nimble data:', error);
    }
  }
  
  /**
   * Find stream by key and app name
   */
  async findStreamByKey(streamKey, appName) {
    try {
      // Try to find by stream key
      const stream = await LiveStream.findByStreamKey(streamKey);
      if (stream) {
        return stream;
      }
      
      // Try to find by source stream (in case of different naming)
      const streams = await LiveStream.getActiveStreams();
      return streams.find(s => 
        s.source_stream === streamKey || 
        s.stream_key === streamKey ||
        (s.source_app === appName && s.source_stream === streamKey)
      );
      
    } catch (error) {
      console.error('Error finding stream by key:', error);
      return null;
    }
  }
  
  /**
   * Find or create active session for stream
   */
  async findOrCreateActiveSession(streamId, userId) {
    try {
      // Look for existing active session
      const activeSessions = await StreamSession.getActiveSessions(userId);
      const existingSession = activeSessions.find(s => s.stream_id === streamId);
      
      if (existingSession) {
        return existingSession;
      }
      
      // Create new session
      const session = await StreamSession.create({
        streamId,
        userId,
        metadata: { auto_created: true, created_by: 'nimble_monitor' }
      });
      
      console.log(`Created new session ${session.id} for stream ${streamId}`);
      return session;
      
    } catch (error) {
      console.error('Error finding/creating session:', error);
      return null;
    }
  }
  
  /**
   * Extract metrics from Nimble stream data
   */
  extractStreamMetrics(nimbleStream) {
    try {
      const stats = {};
      
      // Viewers
      if (nimbleStream.clients !== undefined) {
        stats.peak_viewers = Math.max(stats.peak_viewers || 0, nimbleStream.clients);
        stats.total_viewers = (stats.total_viewers || 0) + nimbleStream.clients;
      }
      
      if (nimbleStream.viewers !== undefined) {
        stats.peak_viewers = Math.max(stats.peak_viewers || 0, nimbleStream.viewers);
        stats.total_viewers = (stats.total_viewers || 0) + nimbleStream.viewers;
      }
      
      // Bytes transferred
      if (nimbleStream.bytes_in !== undefined) {
        stats.bytes_received = nimbleStream.bytes_in;
      }
      
      if (nimbleStream.bytes_out !== undefined) {
        stats.bytes_sent = nimbleStream.bytes_out;
      }
      
      // Bitrate
      if (nimbleStream.bitrate !== undefined) {
        stats.avg_bitrate = nimbleStream.bitrate;
      }
      
      if (nimbleStream.video && nimbleStream.video.bitrate) {
        stats.avg_bitrate = nimbleStream.video.bitrate;
      }
      
      // Frame drops and quality
      if (nimbleStream.dropped_frames !== undefined && nimbleStream.total_frames !== undefined) {
        stats.dropped_frames = nimbleStream.dropped_frames;
        const dropRate = nimbleStream.dropped_frames / (nimbleStream.total_frames || 1);
        stats.connection_quality = Math.max(0, Math.min(1, 1 - dropRate));
      } else {
        // Calculate quality based on other metrics
        stats.connection_quality = this.calculateConnectionQuality(nimbleStream);
      }
      
      // Duration
      if (nimbleStream.uptime !== undefined) {
        stats.duration_seconds = nimbleStream.uptime;
      }
      
      if (nimbleStream.start_time) {
        const startTime = new Date(nimbleStream.start_time);
        const now = new Date();
        stats.duration_seconds = Math.floor((now - startTime) / 1000);
      }
      
      console.log(`Extracted stats:`, stats);
      return stats;
      
    } catch (error) {
      console.error('Error extracting stream metrics:', error);
      return null;
    }
  }
  
  /**
   * Calculate connection quality based on available metrics
   */
  calculateConnectionQuality(nimbleStream) {
    try {
      let quality = 1.0; // Start with perfect quality
      
      // Reduce quality based on various factors
      if (nimbleStream.errors && nimbleStream.total_packets) {
        const errorRate = nimbleStream.errors / nimbleStream.total_packets;
        quality -= errorRate * 0.5;
      }
      
      if (nimbleStream.retransmits && nimbleStream.total_packets) {
        const retransmitRate = nimbleStream.retransmits / nimbleStream.total_packets;
        quality -= retransmitRate * 0.3;
      }
      
      // Check bitrate stability
      if (nimbleStream.bitrate && nimbleStream.target_bitrate) {
        const bitrateRatio = nimbleStream.bitrate / nimbleStream.target_bitrate;
        if (bitrateRatio < 0.8) {
          quality -= (0.8 - bitrateRatio) * 0.5;
        }
      }
      
      return Math.max(0, Math.min(1, quality));
      
    } catch (error) {
      console.error('Error calculating connection quality:', error);
      return 0.8; // Default decent quality
    }
  }
  
  /**
   * Update republishing status based on Nimble data
   */
  async updateRepublishingStatus(streamId, nimbleStream) {
    try {
      const republishingList = await StreamRepublishing.findByStreamId(streamId);
      
      for (const repub of republishingList) {
        // Check if this republishing destination is working
        const isWorking = this.checkRepublishingHealth(nimbleStream, repub);
        
        // Update status if needed
        const newStatus = isWorking ? 'active' : 'error';
        if (repub.status !== newStatus) {
          await StreamRepublishing.updateStatus(repub.id, newStatus);
          console.log(`Updated republishing ${repub.id} status to ${newStatus}`);
        }
      }
      
    } catch (error) {
      console.error('Error updating republishing status:', error);
    }
  }
  
  /**
   * Check if republishing destination is healthy
   */
  checkRepublishingHealth(nimbleStream, republishing) {
    // This is a simplified check - in a real implementation,
    // you would check Nimble's republishing stats
    
    // For now, assume republishing is working if the main stream is healthy
    return nimbleStream.state === 'active' || 
           nimbleStream.status === 'active' || 
           nimbleStream.clients > 0 ||
           nimbleStream.viewers > 0;
  }
  
  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      nimbleStatsURL: this.nimbleStatsURL,
      intervalMs: this.monitoringInterval ? 30000 : null
    };
  }
}

module.exports = NimbleMonitor;