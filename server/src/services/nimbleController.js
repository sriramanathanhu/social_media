const LiveStream = require('../models/LiveStream');
const StreamRepublishing = require('../models/StreamRepublishing');
const nimbleApiService = require('./nimbleApiService');

class NimbleController {
  constructor() {
    this.nimbleHost = process.env.NIMBLE_HOST || '37.27.201.26';
    this.nimblePort = process.env.NIMBLE_PORT || 1935;
    this.nimbleStatsPort = process.env.NIMBLE_STATS_PORT || 8082;
    this.panelUUID = process.env.NIMBLE_PANEL_UUID;
    
    console.log('NimbleController initialized with remote server:', this.nimbleHost);
  }
  
  /**
   * Generate complete Nimble configuration from database
   */
  async generateNimbleConfig() {
    try {
      console.log('Generating Nimble configuration...');
      
      const timestamp = Date.now().toString();
      const config = {
        SyncResponse: {
          RtmpSettings: {
            hash: timestamp,
            interfaces: [
              { 
                ip: "*", 
                port: parseInt(this.nimblePort), 
                ssl: false 
              }
            ],
            login: "",
            password: "",
            duration: 6,
            chunk_count: 4,
            dash_template: "TIME",
            protocols: []
          },
          RtmpPublishSettings: {
            hash: timestamp,
            settings: []
          },
          LivePullSettings: {
            hash: timestamp,
            streams: []
          },
          pub_count: 0
        }
      };
      
      // Get all active streams with their republishing settings
      const activeStreams = await LiveStream.getActiveStreams();
      console.log(`Found ${activeStreams.length} active streams`);
      
      for (const stream of activeStreams) {
        const republishingList = await StreamRepublishing.findByStreamId(stream.id);
        const enabledRepublishing = republishingList.filter(r => r.enabled);
        
        console.log(`Stream ${stream.id} has ${enabledRepublishing.length} enabled republishing destinations`);
        
        for (const repub of enabledRepublishing) {
          const republishingConfig = {
            id: repub.id,
            src_app: stream.source_app || 'live',
            src_stream: stream.stream_key,
            dest_addr: repub.destination_url,
            dest_port: repub.destination_port || 1935,
            dest_app: repub.destination_app,
            dest_stream: repub.destination_stream
          };
          
          config.SyncResponse.RtmpPublishSettings.settings.push(republishingConfig);
          console.log(`Added republishing: ${stream.stream_key} → ${repub.destination_name}`);
        }
      }
      
      // Update pub_count for UI display
      config.SyncResponse.pub_count = config.SyncResponse.RtmpPublishSettings.settings.length;
      
      console.log(`Generated config with ${config.SyncResponse.pub_count} republishing destinations`);
      return config;
      
    } catch (error) {
      console.error('Failed to generate Nimble configuration:', error);
      throw error;
    }
  }
  
  /**
   * Write configuration to Nimble config file
   */
  async writeNimbleConfig(config) {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      
      // Create backup of existing config
      try {
        await fs.access(this.configPath);
        const backupPath = `${this.configPath}.backup.${Date.now()}`;
        await fs.copyFile(this.configPath, backupPath);
        console.log(`Created backup at: ${backupPath}`);
      } catch (err) {
        // Config file doesn't exist, no backup needed
        console.log('No existing config file to backup');
      }
      
      // Write new configuration
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      console.log(`Nimble configuration written to: ${this.configPath}`);
      
      return true;
    } catch (error) {
      console.error('Failed to write Nimble configuration:', error);
      throw error;
    }
  }
  
  /**
   * Update Nimble configuration and reload
   */
  async updateNimbleConfig() {
    try {
      console.log('Updating Nimble configuration...');
      
      const config = await this.generateNimbleConfig();
      await this.writeNimbleConfig(config);
      await this.reloadNimbleConfig();
      
      console.log('Nimble configuration updated successfully');
      return config;
      
    } catch (error) {
      console.error('Failed to update Nimble configuration:', error);
      throw error;
    }
  }
  
  /**
   * Signal Nimble to reload configuration
   */
  async reloadNimbleConfig() {
    try {
      console.log('Reloading Nimble configuration...');
      
      // Try different methods to reload Nimble configuration
      const reloadMethods = [
        // Method 1: Send SIGHUP to nimble process
        () => execAsync('pkill -HUP nimble'),
        // Method 2: Use systemctl if Nimble is a service
        () => execAsync('systemctl reload nimble'),
        // Method 3: Send HTTP request to Nimble control interface
        () => this.sendNimbleReloadRequest()
      ];
      
      for (const method of reloadMethods) {
        try {
          await method();
          console.log('Nimble configuration reloaded successfully');
          return true;
        } catch (error) {
          console.log('Reload method failed, trying next method...');
        }
      }
      
      console.warn('All reload methods failed, configuration may not be active until Nimble restart');
      return false;
      
    } catch (error) {
      console.error('Failed to reload Nimble configuration:', error);
      return false;
    }
  }
  
  /**
   * Send HTTP reload request to Nimble (if control interface is enabled)
   */
  async sendNimbleReloadRequest() {
    try {
      const controlURL = `http://${this.nimbleHost}:${this.nimbleStatsPort}/control/reload`;
      const response = await fetch(controlURL, { method: 'POST' });
      
      if (response.ok) {
        console.log('Nimble reloaded via HTTP control interface');
        return true;
      } else {
        throw new Error(`HTTP reload failed with status: ${response.status}`);
      }
    } catch (error) {
      console.log('HTTP reload method not available');
      throw error;
    }
  }
  
  /**
   * Add republishing destination for a stream
   */
  async addRepublishing(streamId, destination) {
    try {
      console.log(`Adding republishing for stream ${streamId} to ${destination.platform}`);
      
      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }
      
      // Create republishing record in database
      const republishing = await StreamRepublishing.create({
        streamId,
        userId: stream.user_id,
        sourceApp: stream.source_app || 'live',
        sourceStream: stream.stream_key,
        destinationName: destination.platform,
        destinationUrl: this.getPlatformURL(destination.platform),
        destinationPort: this.getPlatformPort(destination.platform),
        destinationApp: this.getPlatformApp(destination.platform),
        destinationStream: destination.streamKey,
        enabled: destination.enabled !== false,
        priority: destination.priority || 1
      });
      
      console.log(`Created republishing record: ${republishing.id}`);
      
      // Configure remote Nimble server via direct API
      try {
        const nimbleRule = await nimbleApiService.createRepublishingRule({
          sourceApp: stream.source_app || 'live',
          sourceStream: stream.stream_key,
          destinationUrl: this.getPlatformURL(destination.platform),
          destinationPort: this.getPlatformPort(destination.platform),
          destinationApp: this.getPlatformApp(destination.platform),
          destinationStream: destination.streamKey
        });
        
        console.log('Republishing rule added to Nimble server:', nimbleRule);
        
        // Store the Nimble rule ID for future reference
        if (nimbleRule && nimbleRule.id) {
          await StreamRepublishing.update(republishing.id, {
            nimble_rule_id: nimbleRule.id
          });
        }
        
      } catch (nimbleError) {
        console.warn('Failed to configure Nimble server:', nimbleError.message);
        // Continue anyway - the database record is created for manual configuration
      }
      
      return republishing;
      
    } catch (error) {
      console.error('Failed to add republishing:', error);
      throw error;
    }
  }
  
  /**
   * Remove republishing destination
   */
  async removeRepublishing(republishingId) {
    try {
      console.log(`Removing republishing: ${republishingId}`);
      
      const republishing = await StreamRepublishing.findById(republishingId);
      if (!republishing) {
        throw new Error('Republishing not found');
      }
      
      const stream = await LiveStream.findById(republishing.stream_id);
      await StreamRepublishing.delete(republishingId);
      
      console.log(`Deleted republishing record: ${republishingId}`);
      
      // Update Nimble configuration if stream is active
      if (stream && stream.status === 'live') {
        await this.updateNimbleConfig();
      }
      
      return true;
      
    } catch (error) {
      console.error('Failed to remove republishing:', error);
      throw error;
    }
  }
  
  /**
   * Start republishing for a stream (when stream goes live)
   */
  async startStreamRepublishing(streamId) {
    try {
      console.log(`Starting republishing for stream: ${streamId}`);
      
      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }
      
      // Update stream status
      await LiveStream.updateStatus(streamId, 'live');
      
      // Update Nimble configuration to include this stream's republishing
      await this.updateNimbleConfig();
      
      console.log(`Started republishing for stream: ${streamId}`);
      return true;
      
    } catch (error) {
      console.error('Failed to start stream republishing:', error);
      throw error;
    }
  }
  
  /**
   * Stop republishing for a stream (when stream ends)
   */
  async stopStreamRepublishing(streamId) {
    try {
      console.log(`Stopping republishing for stream: ${streamId}`);
      
      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }
      
      // Update stream status
      await LiveStream.updateStatus(streamId, 'ended');
      
      // Update Nimble configuration to remove this stream's republishing
      await this.updateNimbleConfig();
      
      console.log(`Stopped republishing for stream: ${streamId}`);
      return true;
      
    } catch (error) {
      console.error('Failed to stop stream republishing:', error);
      throw error;
    }
  }
  
  /**
   * Get platform-specific RTMP URL
   */
  getPlatformURL(platform) {
    const urls = {
      youtube: 'a.rtmp.youtube.com',
      twitch: 'live.twitch.tv',
      facebook: 'live-api-s.facebook.com',
      twitter: 'ingest.pscp.tv',
      linkedin: 'live-api.linkedin.com'
    };
    return urls[platform.toLowerCase()] || platform;
  }
  
  /**
   * Get platform-specific RTMP port
   */
  getPlatformPort(platform) {
    const ports = {
      youtube: 1935,
      twitch: 1935,
      facebook: 443,
      twitter: 80,
      linkedin: 1935
    };
    return ports[platform.toLowerCase()] || 1935;
  }
  
  /**
   * Get platform-specific RTMP app
   */
  getPlatformApp(platform) {
    const apps = {
      youtube: 'live2',
      twitch: 'live',
      facebook: 'rtmp',
      twitter: 'x',
      linkedin: 'live'
    };
    return apps[platform.toLowerCase()] || 'live';
  }
  
  /**
   * Get current Nimble configuration
   */
  async getCurrentConfig() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Failed to read current Nimble config:', error);
      return null;
    }
  }
  
  /**
   * Validate Nimble configuration
   */
  validateConfig(config) {
    try {
      // Basic validation of Nimble config structure
      if (!config || !config.SyncResponse) {
        throw new Error('Invalid config structure: missing SyncResponse');
      }
      
      if (!config.SyncResponse.RtmpSettings) {
        throw new Error('Invalid config structure: missing RtmpSettings');
      }
      
      if (!config.SyncResponse.RtmpPublishSettings) {
        throw new Error('Invalid config structure: missing RtmpPublishSettings');
      }
      
      console.log('Nimble configuration validation passed');
      return true;
      
    } catch (error) {
      console.error('Nimble configuration validation failed:', error);
      throw error;
    }
  }
}

module.exports = NimbleController;