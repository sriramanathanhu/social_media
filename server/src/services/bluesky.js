const { BskyAgent } = require('@atproto/api');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BlueskyService {
  constructor() {
    this.agents = new Map(); // Store agents by account ID
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    if (!text) return null;
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedText) {
    if (!encryptedText) return null;
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const textParts = encryptedText.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encrypted = textParts.join(':');
      const decipher = crypto.createDecipher(algorithm, key);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedText; // Return original if decryption fails
    }
  }

  /**
   * Create a new Bluesky session
   * @param {string} handle - Bluesky handle (e.g., 'user.bsky.social')
   * @param {string} appPassword - App password from Bluesky settings
   * @returns {Promise<Object>} Session info and agent
   */
  async createSession(handle, appPassword) {
    try {
      const agent = new BskyAgent({
        service: 'https://bsky.social',
      });

      console.log('Creating Bluesky session for:', handle);
      
      const response = await agent.login({
        identifier: handle,
        password: appPassword,
      });

      console.log('Bluesky session created successfully');
      
      return {
        agent,
        session: response.data,
        handle: handle,
        displayName: response.data.displayName,
        did: response.data.did,
      };
    } catch (error) {
      console.error('Bluesky session creation failed:', error);
      throw new Error(`Failed to create Bluesky session: ${error.message}`);
    }
  }

  /**
   * Store agent for account
   * @param {string} accountId - Account ID
   * @param {BskyAgent} agent - Bluesky agent instance
   */
  setAgent(accountId, agent) {
    this.agents.set(accountId, agent);
  }

  /**
   * Get agent for account
   * @param {string} accountId - Account ID
   * @returns {BskyAgent|null} Agent or null if not found
   */
  getAgent(accountId) {
    return this.agents.get(accountId) || null;
  }

  /**
   * Upload blob (image) to Bluesky
   * @param {BskyAgent} agent - Bluesky agent
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} mimeType - MIME type of the image
   * @returns {Promise<Object>} Blob reference
   */
  async uploadBlob(agent, imageBuffer, mimeType) {
    try {
      console.log('Uploading blob to Bluesky, size:', imageBuffer.length, 'type:', mimeType);
      
      const response = await agent.uploadBlob(imageBuffer, {
        encoding: mimeType,
      });

      console.log('Blob uploaded successfully:', response.data.blob.ref);
      return response.data.blob;
    } catch (error) {
      console.error('Bluesky blob upload failed:', error);
      throw new Error(`Failed to upload blob: ${error.message}`);
    }
  }

  /**
   * Create a post on Bluesky
   * @param {BskyAgent} agent - Bluesky agent
   * @param {string} text - Post text
   * @param {Array} images - Array of image file paths
   * @returns {Promise<Object>} Post creation result
   */
  async createPost(agent, text, images = []) {
    try {
      console.log('Creating Bluesky post:', { text: text.substring(0, 50) + '...', imageCount: images.length });

      const post = {
        text: text,
        createdAt: new Date().toISOString(),
      };

      // Handle images if provided
      if (images && images.length > 0) {
        const imageBlobs = [];
        
        for (const imagePath of images.slice(0, 4)) { // Max 4 images
          try {
            const imageBuffer = fs.readFileSync(imagePath);
            const mimeType = this.getMimeType(imagePath);
            
            const blob = await this.uploadBlob(agent, imageBuffer, mimeType);
            imageBlobs.push({
              image: blob,
              alt: '', // Alt text can be added later
            });
          } catch (error) {
            console.error('Failed to upload image:', imagePath, error);
            // Continue with other images
          }
        }

        if (imageBlobs.length > 0) {
          post.embed = {
            $type: 'app.bsky.embed.images',
            images: imageBlobs,
          };
        }
      }

      const response = await agent.post(post);
      console.log('Bluesky post created successfully:', response.uri);
      
      return {
        success: true,
        uri: response.uri,
        cid: response.cid,
        data: response,
      };
    } catch (error) {
      console.error('Bluesky post creation failed:', error);
      throw new Error(`Failed to create Bluesky post: ${error.message}`);
    }
  }

  /**
   * Get MIME type from file extension
   * @param {string} filePath - File path
   * @returns {string} MIME type
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * Verify Bluesky account
   * @param {string} handle - Bluesky handle
   * @param {string} appPassword - App password
   * @returns {Promise<Object>} Verification result
   */
  async verifyAccount(handle, appPassword) {
    try {
      const session = await this.createSession(handle, appPassword);
      
      return {
        success: true,
        handle: session.handle,
        displayName: session.displayName,
        did: session.did,
        avatar: session.session.avatar,
      };
    } catch (error) {
      console.error('Bluesky account verification failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user profile
   * @param {BskyAgent} agent - Bluesky agent
   * @returns {Promise<Object>} User profile
   */
  async getProfile(agent) {
    try {
      const response = await agent.getProfile({ actor: agent.session.did });
      return response.data;
    } catch (error) {
      console.error('Failed to get Bluesky profile:', error);
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  /**
   * Refresh session if needed
   * @param {BskyAgent} agent - Bluesky agent
   * @returns {Promise<boolean>} Success status
   */
  async refreshSession(agent) {
    try {
      if (agent.session?.refreshJwt) {
        await agent.resumeSession(agent.session);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh Bluesky session:', error);
      return false;
    }
  }
}

module.exports = new BlueskyService();