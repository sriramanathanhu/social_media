const crypto = require('crypto');

class WMSPanelService {
  constructor() {
    this.panelDomain = process.env.NIMBLE_PANEL_DOMAIN || 'nimble.wmspanel.com';
    this.panelUUID = process.env.NIMBLE_PANEL_UUID;
    this.apiVersion = '2';
    this.baseURL = `https://${this.panelDomain}/api/${this.apiVersion}`;
    
    if (!this.panelUUID) {
      console.warn('WMSPanel UUID not configured. Remote Nimble management disabled.');
    }
    
    console.log('WMSPanelService initialized for UUID:', this.panelUUID);
  }
  
  /**
   * Generate authentication signature for WMSPanel API
   */
  generateSignature(timestamp, path, params = {}) {
    try {
      // Create the message to sign according to WMSPanel documentation
      const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
      const message = `${timestamp}${path}${sortedParams}`;
      
      // For demo purposes, we'll use a simple approach
      // In production, you'd need the actual WMSPanel API key
      const signature = crypto.createHash('md5').update(message).digest('hex');
      
      return signature;
    } catch (error) {
      console.error('Failed to generate WMSPanel signature:', error);
      throw error;
    }
  }
  
  /**
   * Make authenticated request to WMSPanel API
   */
  async makeAPIRequest(path, method = 'GET', params = {}) {
    try {
      if (!this.panelUUID) {
        throw new Error('WMSPanel UUID not configured');
      }
      
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = this.generateSignature(timestamp, path, params);
      
      const url = new URL(`${this.baseURL}${path}`);
      url.searchParams.append('uuid', this.panelUUID);
      url.searchParams.append('timestamp', timestamp);
      url.searchParams.append('signature', signature);
      
      // Add other parameters
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });
      
      console.log(`Making WMSPanel API request: ${method} ${path}`);
      
      const response = await fetch(url.toString(), {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SocialMediaScheduler/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`WMSPanel API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('WMSPanel API response:', data);
      
      return data;
    } catch (error) {
      console.error('WMSPanel API request failed:', error);
      throw error;
    }
  }
  
  /**
   * Get current Nimble server configuration
   */
  async getNimbleConfig() {
    try {
      console.log('Fetching Nimble configuration from WMSPanel...');
      
      const response = await this.makeAPIRequest('/servers/config');
      return response;
    } catch (error) {
      console.error('Failed to get Nimble config from WMSPanel:', error);
      throw error;
    }
  }
  
  /**
   * Add RTMP republishing rule to Nimble server
   */
  async addRepublishingRule(sourceApp, sourceStream, destURL, destPort, destApp, destStream) {
    try {
      console.log(`Adding republishing rule: ${sourceApp}/${sourceStream} → ${destURL}:${destPort}/${destApp}/${destStream}`);
      
      const params = {
        action: 'add_republishing',
        src_app: sourceApp,
        src_stream: sourceStream,
        dest_addr: destURL,
        dest_port: destPort.toString(),
        dest_app: destApp,
        dest_stream: destStream,
        enabled: 'true'
      };
      
      const response = await this.makeAPIRequest('/servers/republishing', 'POST', params);
      
      console.log('Republishing rule added successfully');
      return response;
    } catch (error) {
      console.error('Failed to add republishing rule:', error);
      throw error;
    }
  }
  
  /**
   * Remove RTMP republishing rule from Nimble server
   */
  async removeRepublishingRule(ruleId) {
    try {
      console.log(`Removing republishing rule: ${ruleId}`);
      
      const params = {
        action: 'remove_republishing',
        rule_id: ruleId.toString()
      };
      
      const response = await this.makeAPIRequest('/servers/republishing', 'POST', params);
      
      console.log('Republishing rule removed successfully');
      return response;
    } catch (error) {
      console.error('Failed to remove republishing rule:', error);
      throw error;
    }
  }
  
  /**
   * Get list of active republishing rules
   */
  async getRepublishingRules() {
    try {
      console.log('Fetching republishing rules from WMSPanel...');
      
      const response = await this.makeAPIRequest('/servers/republishing');
      return response;
    } catch (error) {
      console.error('Failed to get republishing rules:', error);
      throw error;
    }
  }
  
  /**
   * Get server statistics and active streams
   */
  async getServerStats() {
    try {
      console.log('Fetching server stats from WMSPanel...');
      
      const response = await this.makeAPIRequest('/servers/stats');
      return response;
    } catch (error) {
      console.error('Failed to get server stats:', error);
      throw error;
    }
  }
  
  /**
   * Check if a specific stream is currently active
   */
  async isStreamActive(streamKey) {
    try {
      console.log(`Checking if stream is active: ${streamKey}`);
      
      const stats = await this.getServerStats();
      
      // Parse response to check if stream is active
      if (stats && stats.streams) {
        const activeStream = stats.streams.find(stream => 
          stream.name === streamKey || stream.stream === streamKey
        );
        
        const isActive = !!activeStream;
        console.log(`Stream ${streamKey} is ${isActive ? 'active' : 'inactive'}`);
        
        return isActive;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check stream status:', error);
      return false;
    }
  }
  
  /**
   * Enable/disable republishing rule
   */
  async toggleRepublishingRule(ruleId, enabled) {
    try {
      console.log(`${enabled ? 'Enabling' : 'Disabling'} republishing rule: ${ruleId}`);
      
      const params = {
        action: 'toggle_republishing',
        rule_id: ruleId.toString(),
        enabled: enabled ? 'true' : 'false'
      };
      
      const response = await this.makeAPIRequest('/servers/republishing', 'POST', params);
      
      console.log(`Republishing rule ${enabled ? 'enabled' : 'disabled'} successfully`);
      return response;
    } catch (error) {
      console.error('Failed to toggle republishing rule:', error);
      throw error;
    }
  }
  
  /**
   * Test WMSPanel API connectivity
   */
  async testConnection() {
    try {
      console.log('Testing WMSPanel API connection...');
      
      if (!this.panelUUID) {
        throw new Error('WMSPanel UUID not configured');
      }
      
      const response = await this.makeAPIRequest('/test');
      console.log('WMSPanel API connection test successful');
      
      return {
        success: true,
        uuid: this.panelUUID,
        response
      };
    } catch (error) {
      console.error('WMSPanel API connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new WMSPanelService();