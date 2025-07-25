/**
 * Direct Nimble Streamer API Service
 * Handles RTMP republishing without WMSPanel dependency
 */

const crypto = require('crypto');

class NimbleApiService {
  constructor() {
    this.nimbleHost = process.env.NIMBLE_HOST || '37.27.201.26';
    this.nimbleApiPort = process.env.NIMBLE_API_PORT || 8082;
    this.nimbleToken = process.env.NIMBLE_TOKEN || 'NmB7K9mX2vQ8pL4wR6tY1zE5nA3cS0uI9fH8jG2bV7xM4qW6eD1rT5yU3oP9kL2sA8cV0nB6mX4wQ7pR1tY5zE';
    this.baseURL = `http://${this.nimbleHost}:${this.nimbleApiPort}`;
    
    console.log('NimbleApiService initialized:', this.baseURL);
  }
  
  /**
   * Generate Nimble API authentication parameters
   */
  generateAuthParams() {
    const salt = Math.floor(Math.random() * 1000000);
    const str2hash = `${salt}/${this.nimbleToken}`;
    const md5hash = crypto.createHash('md5').update(str2hash).digest();
    const base64hash = Buffer.from(md5hash).toString('base64');
    
    return {
      salt,
      hash: base64hash
    };
  }
  
  /**
   * Make HTTP request to Nimble API
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      // Generate authentication parameters for Nimble API
      const authParams = this.generateAuthParams();
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `${this.baseURL}${endpoint}${separator}salt=${authParams.salt}&hash=${authParams.hash}`;
      console.log(`Nimble API ${method} ${endpoint}`);
      
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`Nimble API error: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.text();
      
      // Try to parse as JSON, fall back to text
      try {
        return JSON.parse(responseData);
      } catch (e) {
        return responseData;
      }
      
    } catch (error) {
      console.error('Nimble API request failed:', error);
      throw error;
    }
  }
  
  /**
   * Get all RTMP republishing rules
   */
  async getRepublishingRules() {
    try {
      console.log('Fetching RTMP republishing rules from Nimble...');
      const rules = await this.makeRequest('/manage/rtmp/republish', 'GET');
      console.log('Retrieved republishing rules:', rules);
      return rules;
    } catch (error) {
      console.error('Failed to get republishing rules:', error);
      throw error;
    }
  }
  
  /**
   * Create new RTMP republishing rule
   */
  async createRepublishingRule(ruleConfig) {
    try {
      const {
        sourceApp,
        sourceStream,
        destinationUrl,
        destinationPort,
        destinationApp,
        destinationStream
      } = ruleConfig;
      
      console.log(`Creating republishing rule: ${sourceApp}/${sourceStream} → ${destinationUrl}:${destinationPort}/${destinationApp}/${destinationStream}`);
      
      const params = {
        src_app: sourceApp,
        src_stream: sourceStream,
        dest_addr: destinationUrl,
        dest_port: destinationPort,
        dest_app: destinationApp,
        dest_stream: destinationStream
      };
      
      const result = await this.makeRequest('/manage/rtmp/republish', 'POST', params);
      console.log('Republishing rule created successfully:', result);
      
      return result;
    } catch (error) {
      console.error('Failed to create republishing rule:', error);
      throw error;
    }
  }
  
  /**
   * Delete RTMP republishing rule
   */
  async deleteRepublishingRule(ruleId) {
    try {
      console.log(`Deleting republishing rule: ${ruleId}`);
      const result = await this.makeRequest(`/manage/rtmp/republish/${ruleId}`, 'DELETE');
      console.log('Republishing rule deleted successfully');
      return result;
    } catch (error) {
      console.error('Failed to delete republishing rule:', error);
      throw error;
    }
  }
  
  /**
   * Get specific RTMP republishing rule
   */
  async getRepublishingRule(ruleId) {
    try {
      console.log(`Fetching republishing rule: ${ruleId}`);
      const rule = await this.makeRequest(`/manage/rtmp/republish/${ruleId}`, 'GET');
      return rule;
    } catch (error) {
      console.error('Failed to get republishing rule:', error);
      throw error;
    }
  }
  
  /**
   * Test Nimble API connectivity
   */
  async testConnection() {
    try {
      console.log('Testing Nimble API connection...');
      
      // Try to get existing rules to test connectivity
      const rules = await this.getRepublishingRules();
      
      return {
        success: true,
        endpoint: this.baseURL,
        rulesCount: Array.isArray(rules) ? rules.length : 0,
        message: 'Nimble API connection successful'
      };
    } catch (error) {
      console.error('Nimble API connection test failed:', error);
      return {
        success: false,
        endpoint: this.baseURL,
        error: error.message,
        message: 'Nimble API connection failed'
      };
    }
  }
  
  /**
   * Create republishing rule for YouTube
   */
  async addYouTubeRepublishing(sourceApp, sourceStream, youtubeStreamKey) {
    return this.createRepublishingRule({
      sourceApp,
      sourceStream,
      destinationUrl: 'a.rtmp.youtube.com',
      destinationPort: 1935,
      destinationApp: 'live2',
      destinationStream: youtubeStreamKey
    });
  }
  
  /**
   * Create republishing rule for Twitch
   */
  async addTwitchRepublishing(sourceApp, sourceStream, twitchStreamKey) {
    return this.createRepublishingRule({
      sourceApp,
      sourceStream,
      destinationUrl: 'live.twitch.tv',
      destinationPort: 1935,
      destinationApp: 'live',
      destinationStream: twitchStreamKey
    });
  }
  
  /**
   * Create republishing rule for Facebook
   */
  async addFacebookRepublishing(sourceApp, sourceStream, facebookStreamKey) {
    return this.createRepublishingRule({
      sourceApp,
      sourceStream,
      destinationUrl: 'rtmps://live-api-s.facebook.com',
      destinationPort: 443,
      destinationApp: 'rtmp',
      destinationStream: facebookStreamKey
    });
  }
  
  /**
   * Create republishing rule for custom RTMP destination
   */
  async addCustomRepublishing(sourceApp, sourceStream, customConfig) {
    const {
      url,
      port = 1935,
      app = 'live',
      streamKey
    } = customConfig;
    
    return this.createRepublishingRule({
      sourceApp,
      sourceStream,
      destinationUrl: url,
      destinationPort: port,
      destinationApp: app,
      destinationStream: streamKey
    });
  }
  
  /**
   * Clear all republishing rules (useful for cleanup)
   */
  async clearAllRepublishingRules() {
    try {
      console.log('Clearing all republishing rules...');
      const rules = await this.getRepublishingRules();
      
      if (Array.isArray(rules)) {
        for (const rule of rules) {
          if (rule.id) {
            await this.deleteRepublishingRule(rule.id);
          }
        }
      }
      
      console.log('All republishing rules cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear republishing rules:', error);
      throw error;
    }
  }
  
  /**
   * Get stream statistics (if available)
   */
  async getStreamStats() {
    try {
      console.log('Fetching stream statistics...');
      // Try different stats endpoints
      const endpoints = ['/stats', '/stats.json', '/status', '/info'];
      
      for (const endpoint of endpoints) {
        try {
          const stats = await this.makeRequest(endpoint, 'GET');
          console.log('Stream stats retrieved:', endpoint);
          return stats;
        } catch (error) {
          console.log(`Stats endpoint ${endpoint} not available:`, error.message);
        }
      }
      
      throw new Error('No working stats endpoint found');
    } catch (error) {
      console.error('Failed to get stream stats:', error);
      throw error;
    }
  }
}

module.exports = new NimbleApiService();