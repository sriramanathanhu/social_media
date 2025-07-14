const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
const facebookService = require('./facebook');

class InstagramService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
    
    // Instagram Basic Display + Content Publishing API (via Facebook Graph API)
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    
    // Instagram content types
    this.contentTypes = {
      IMAGE: 'IMAGE',
      VIDEO: 'VIDEO',
      CAROUSEL_ALBUM: 'CAROUSEL_ALBUM',
      REELS: 'REELS'
    };
  }

  encrypt(text) {
    return facebookService.encrypt(text);
  }

  decrypt(encryptedData) {
    return facebookService.decrypt(encryptedData);
  }

  async getInstagramAccounts(facebookAccessToken) {
    try {
      console.log('Fetching user Instagram accounts via Facebook...');
      
      // Get user's Facebook Pages first
      const pagesResponse = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: facebookAccessToken,
          fields: 'id,name,access_token'
        }
      });

      const pages = pagesResponse.data.data || [];
      const instagramAccounts = [];

      // Check each page for connected Instagram account
      for (const page of pages) {
        try {
          const igResponse = await axios.get(`${this.baseUrl}/${page.id}`, {
            params: {
              access_token: page.access_token,
              fields: 'instagram_business_account'
            }
          });

          if (igResponse.data.instagram_business_account) {
            // Get Instagram account details
            const igAccountResponse = await axios.get(`${this.baseUrl}/${igResponse.data.instagram_business_account.id}`, {
              params: {
                access_token: page.access_token,
                fields: 'id,username,name,profile_picture_url,followers_count,media_count,account_type'
              }
            });

            instagramAccounts.push({
              ...igAccountResponse.data,
              page_id: page.id,
              page_name: page.name,
              page_access_token: page.access_token
            });
          }
        } catch (error) {
          console.log(`No Instagram account found for page ${page.name}`);
        }
      }

      console.log('Found Instagram accounts:', instagramAccounts.length);
      return instagramAccounts;
    } catch (error) {
      console.error('Failed to fetch Instagram accounts:', error.response?.data || error.message);
      throw new Error('Failed to fetch Instagram accounts');
    }
  }

  async verifyCredentials(accessToken) {
    try {
      console.log('Verifying Instagram credentials via Facebook...');
      
      // Get Instagram accounts via Facebook connection
      const instagramAccounts = await this.getInstagramAccounts(accessToken);
      
      if (instagramAccounts.length === 0) {
        throw new Error('No Instagram Business accounts found. Please connect an Instagram Business account to your Facebook Page.');
      }

      console.log('Instagram verification successful');
      return {
        accounts: instagramAccounts
      };
    } catch (error) {
      console.error('Instagram credential verification failed:', error.response?.data || error.message);
      throw new Error('Failed to verify Instagram credentials');
    }
  }

  async publishPost(accountData, content, mediaFiles = [], postType = 'text', platformSpecificData = {}) {
    try {
      console.log('Publishing Instagram post...');
      console.log('Account:', accountData.id, accountData.username);
      console.log('Content length:', content.length);
      console.log('Media files:', mediaFiles.length);
      console.log('Post type:', postType);

      const accessToken = this.decrypt(accountData.access_token);
      
      // Parse platform-specific data for Instagram
      const instagramData = platformSpecificData.instagram || {};
      const instagramAccountId = instagramData.accountId || accountData.platform_user_id;
      
      if (!instagramAccountId) {
        throw new Error('Instagram account ID is required for posting');
      }

      // Determine Instagram media type
      let mediaType = this.contentTypes.IMAGE;
      let mediaUrl = null;
      
      if (mediaFiles && mediaFiles.length > 0) {
        if (postType === 'reel' || (mediaFiles.some(f => f.mimetype?.startsWith('video/')) && postType === 'video')) {
          mediaType = this.contentTypes.REELS;
          const videoFile = mediaFiles.find(f => f.mimetype?.startsWith('video/'));
          mediaUrl = await this.uploadMediaToPublicUrl(videoFile);
        } else if (mediaFiles.length > 1) {
          mediaType = this.contentTypes.CAROUSEL_ALBUM;
          // Handle carousel album
          return await this.publishCarouselPost(instagramAccountId, accessToken, content, mediaFiles, instagramData);
        } else {
          mediaType = this.contentTypes.IMAGE;
          const imageFile = mediaFiles.find(f => f.mimetype?.startsWith('image/'));
          mediaUrl = await this.uploadMediaToPublicUrl(imageFile);
        }
      } else {
        throw new Error('Instagram posts require at least one image or video');
      }

      // Create Instagram media container
      const containerResponse = await this.createMediaContainer(
        instagramAccountId,
        accessToken,
        mediaType,
        mediaUrl,
        content,
        instagramData
      );

      const containerId = containerResponse.id;

      // Publish the media container
      const publishResponse = await axios.post(`${this.baseUrl}/${instagramAccountId}/media_publish`, {
        creation_id: containerId,
        access_token: accessToken
      });

      console.log('Instagram post published successfully:', publishResponse.data.id);
      
      return {
        success: true,
        platformPostId: publishResponse.data.id,
        platform: 'instagram',
        type: postType
      };

    } catch (error) {
      console.error('Instagram post publishing failed:', error.response?.data || error.message);
      throw new Error(`Failed to publish Instagram post: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async createMediaContainer(instagramAccountId, accessToken, mediaType, mediaUrl, caption, instagramData = {}) {
    try {
      console.log('Creating Instagram media container...');
      
      let containerData = {
        access_token: accessToken,
        caption: caption
      };

      if (mediaType === this.contentTypes.IMAGE) {
        containerData.image_url = mediaUrl;
      } else if (mediaType === this.contentTypes.VIDEO || mediaType === this.contentTypes.REELS) {
        containerData.video_url = mediaUrl;
        containerData.media_type = mediaType;
        
        // Add thumbnail for videos if provided
        if (instagramData.thumbnailUrl) {
          containerData.thumb_offset = instagramData.thumbOffset || 0;
        }
      }

      // Add location if provided
      if (instagramData.locationId) {
        containerData.location_id = instagramData.locationId;
      }

      const response = await axios.post(`${this.baseUrl}/${instagramAccountId}/media`, containerData);
      
      console.log('Instagram media container created:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('Failed to create Instagram media container:', error.response?.data || error.message);
      throw new Error('Failed to create Instagram media container');
    }
  }

  async publishCarouselPost(instagramAccountId, accessToken, caption, mediaFiles, instagramData = {}) {
    try {
      console.log('Publishing Instagram carousel post...');
      
      // Create media containers for each item
      const containerIds = [];
      
      for (const mediaFile of mediaFiles.slice(0, 10)) { // Instagram allows max 10 items
        const mediaUrl = await this.uploadMediaToPublicUrl(mediaFile);
        const mediaType = mediaFile.mimetype?.startsWith('video/') ? this.contentTypes.VIDEO : this.contentTypes.IMAGE;
        
        const containerResponse = await this.createMediaContainer(
          instagramAccountId,
          accessToken,
          mediaType,
          mediaUrl,
          '', // No caption for individual items
          instagramData
        );
        
        containerIds.push(containerResponse.id);
      }

      // Create carousel container
      const carouselResponse = await axios.post(`${this.baseUrl}/${instagramAccountId}/media`, {
        media_type: this.contentTypes.CAROUSEL_ALBUM,
        children: containerIds.join(','),
        caption: caption,
        access_token: accessToken
      });

      // Publish the carousel
      const publishResponse = await axios.post(`${this.baseUrl}/${instagramAccountId}/media_publish`, {
        creation_id: carouselResponse.data.id,
        access_token: accessToken
      });

      console.log('Instagram carousel published successfully:', publishResponse.data.id);
      
      return {
        success: true,
        platformPostId: publishResponse.data.id,
        platform: 'instagram',
        type: 'carousel'
      };
    } catch (error) {
      console.error('Instagram carousel publishing failed:', error.response?.data || error.message);
      throw new Error('Failed to publish Instagram carousel');
    }
  }

  async uploadMediaToPublicUrl(mediaFile) {
    // In a real implementation, you would upload the media file to a public URL
    // This could be AWS S3, Cloudinary, or your own server
    // For now, we'll simulate this with a placeholder
    
    console.log('Uploading media to public URL...');
    console.log('Media file:', mediaFile.originalname, mediaFile.mimetype, mediaFile.size);
    
    // TODO: Implement actual file upload to public storage
    // This is a placeholder - you need to implement actual file upload
    throw new Error('Media upload to public URL not implemented. Please configure a public storage service (AWS S3, Cloudinary, etc.)');
    
    // Example implementation:
    // const uploadResult = await uploadToS3(mediaFile);
    // return uploadResult.publicUrl;
  }

  async publishStory(accountData, mediaFile, storyData = {}) {
    try {
      console.log('Publishing Instagram Story...');
      
      const accessToken = this.decrypt(accountData.access_token);
      const instagramAccountId = accountData.platform_user_id;
      
      const mediaUrl = await this.uploadMediaToPublicUrl(mediaFile);
      const mediaType = mediaFile.mimetype?.startsWith('video/') ? this.contentTypes.VIDEO : this.contentTypes.IMAGE;
      
      const containerData = {
        access_token: accessToken,
        media_type: mediaType
      };

      if (mediaType === this.contentTypes.IMAGE) {
        containerData.image_url = mediaUrl;
      } else {
        containerData.video_url = mediaUrl;
      }

      // Add story-specific features
      if (storyData.link) {
        containerData.link = storyData.link;
      }

      const containerResponse = await axios.post(`${this.baseUrl}/${instagramAccountId}/media`, containerData);
      
      const publishResponse = await axios.post(`${this.baseUrl}/${instagramAccountId}/media_publish`, {
        creation_id: containerResponse.data.id,
        access_token: accessToken
      });

      console.log('Instagram Story published successfully:', publishResponse.data.id);
      
      return {
        success: true,
        platformPostId: publishResponse.data.id,
        platform: 'instagram',
        type: 'story'
      };
    } catch (error) {
      console.error('Instagram Story publishing failed:', error.response?.data || error.message);
      throw new Error('Failed to publish Instagram Story');
    }
  }

  async getAccountInsights(accountData, metrics = ['impressions', 'reach', 'profile_views'], period = 'day') {
    try {
      console.log('Fetching Instagram account insights...');
      
      const accessToken = this.decrypt(accountData.access_token);
      const instagramAccountId = accountData.platform_user_id;
      
      const response = await axios.get(`${this.baseUrl}/${instagramAccountId}/insights`, {
        params: {
          access_token: accessToken,
          metric: metrics.join(','),
          period: period
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch Instagram insights:', error.response?.data || error.message);
      throw new Error('Failed to fetch Instagram account insights');
    }
  }
}

module.exports = new InstagramService();