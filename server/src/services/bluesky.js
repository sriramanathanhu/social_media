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
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return text; // Return original if encryption fails
    }
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
      if (textParts.length !== 2) {
        // If not properly encrypted format, return as-is (for backward compatibility)
        return encryptedText;
      }
      const iv = Buffer.from(textParts[0], 'hex');
      const encrypted = textParts[1];
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
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
   * Upload blob (image) to Bluesky using the official API method
   * @param {BskyAgent} agent - Bluesky agent
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} mimeType - MIME type of the image
   * @returns {Promise<Object>} Blob reference
   */
  async uploadBlob(agent, imageBuffer, mimeType) {
    try {
      const fileSizeBytes = imageBuffer.length;
      const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
      const maxSizeBytes = 1000000; // 1MB limit for Bluesky as per official docs
      
      console.log('Uploading blob to Bluesky, size:', fileSizeBytes, 'bytes (' + fileSizeMB + 'MB), type:', mimeType);
      
      // Check file size before attempting upload (official requirement)
      if (fileSizeBytes > maxSizeBytes) {
        throw new Error(`Image file too large for Bluesky (${fileSizeMB}MB). Maximum size allowed is 1MB. Please compress or resize your image.`);
      }
      
      // Use the official blob upload method as documented
      const response = await agent.uploadBlob(imageBuffer, {
        encoding: mimeType,
      });

      // The response should contain the blob metadata we need for embedding
      console.log('Blob uploaded successfully:', response.data.blob);
      
      // Return the blob object that will be used in post embedding
      return {
        $type: 'blob',
        ref: response.data.blob.ref,
        mimeType: response.data.blob.mimeType,
        size: response.data.blob.size
      };
    } catch (error) {
      console.error('Bluesky blob upload failed:', error);
      if (error.message.includes('too large')) {
        throw error; // Pass through our custom error message
      }
      throw new Error(`Failed to upload blob: ${error.message}`);
    }
  }

  /**
   * Create a post on Bluesky with proper image embedding per official API docs
   * @param {BskyAgent} agent - Bluesky agent
   * @param {string} text - Post text
   * @param {Array} mediaFiles - Array of media file objects or file paths
   * @returns {Promise<Object>} Post creation result
   */
  async createPost(agent, text, mediaFiles = []) {
    try {
      console.log('Creating Bluesky post:', { text: text.substring(0, 50) + '...', mediaCount: mediaFiles.length });
      console.log('Media files received:', mediaFiles.map(f => ({ path: f?.path, mimetype: f?.mimetype, size: f?.size })));

      const post = {
        text: text,
        createdAt: new Date().toISOString(),
      };

      // Handle media files if provided (up to 4 images as per Bluesky docs)
      if (mediaFiles && mediaFiles.length > 0) {
        const imageBlobs = [];
        const maxImages = Math.min(mediaFiles.length, 4); // Bluesky supports max 4 images
        
        console.log(`Processing ${maxImages} images for Bluesky post`);
        
        for (let i = 0; i < maxImages; i++) {
          const mediaFile = mediaFiles[i];
          try {
            let imageBuffer;
            let mimeType;
            
            console.log('Processing media file:', mediaFile);
            
            if (typeof mediaFile === 'string') {
              // It's a file path
              console.log('Processing string path:', mediaFile);
              imageBuffer = fs.readFileSync(mediaFile);
              mimeType = this.getMimeType(mediaFile);
            } else if (mediaFile.path) {
              // It's a media file object with path
              console.log('Processing file object with path:', mediaFile.path);
              if (!fs.existsSync(mediaFile.path)) {
                console.error('Media file does not exist:', mediaFile.path);
                continue;
              }
              imageBuffer = fs.readFileSync(mediaFile.path);
              mimeType = mediaFile.mimetype || this.getMimeType(mediaFile.path);
            } else {
              console.error('Invalid media file format:', mediaFile);
              continue;
            }
            
            console.log('Image buffer size:', imageBuffer.length, 'MIME type:', mimeType);
            
            // Upload blob using the official API method
            const blob = await this.uploadBlob(agent, imageBuffer, mimeType);
            
            // Create image object as per Bluesky docs
            imageBlobs.push({
              alt: `Image ${i + 1}`, // Default alt text for accessibility
              image: blob
            });
            
            console.log(`Successfully uploaded image blob ${i + 1}/${maxImages}`);
          } catch (error) {
            console.error(`Failed to upload image ${i + 1}:`, mediaFile, error);
            // Continue with other images - don't fail the entire post
          }
        }

        console.log('Total image blobs processed:', imageBlobs.length);

        // Add image embed if we have any successful uploads
        if (imageBlobs.length > 0) {
          post.embed = {
            $type: 'app.bsky.embed.images',
            images: imageBlobs,
          };
          console.log('Added image embed to post:', post.embed);
        }
      }

      console.log('Final post object:', JSON.stringify(post, null, 2));
      
      const response = await agent.post(post);
      console.log('Bluesky post created successfully:', response.uri);
      
      return {
        success: true,
        uri: response.uri,
        cid: response.cid,
        data: response,
        imagesCount: post.embed?.images?.length || 0
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