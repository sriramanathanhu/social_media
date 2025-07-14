const SocialAccount = require('../models/SocialAccount');
const Post = require('../models/Post');
const mastodonService = require('./mastodon');
const xService = require('./x');
const pinterestService = require('./pinterest');
const blueskyService = require('./bluesky');
const facebookService = require('./facebook');
const instagramService = require('./instagram');

class PublishingService {
  async publishPost(userId, postData) {
    const { 
      content, 
      targetAccountIds, 
      mediaFiles = [], 
      scheduledFor, 
      postType = 'text',
      // Platform-specific data
      facebookData = {},
      instagramData = {},
      pinterestTitle,
      pinterestDescription,
      pinterestBoard,
      pinterestDestinationUrl
    } = postData;
    
    // Prepare platform-specific data object
    const platformSpecificData = {
      facebook: facebookData,
      instagram: instagramData,
      pinterest: {
        title: pinterestTitle,
        description: pinterestDescription,
        board: pinterestBoard,
        destinationUrl: pinterestDestinationUrl
      }
    };
    
    console.log('Publishing post for user:', userId);
    console.log('Target account IDs:', targetAccountIds);
    console.log('Media files count:', mediaFiles.length);
    console.log('Scheduled for:', scheduledFor);
    console.log('Post type:', postType);
    
    const accounts = await SocialAccount.getActiveAccountsByIds(targetAccountIds);
    console.log('Found accounts:', accounts.length);
    console.log('Account details:', accounts.map(acc => ({
      id: acc.id,
      platform: acc.platform,
      username: acc.username,
      user_id: acc.user_id
    })));
    
    if (accounts.length === 0) {
      console.log('No active accounts found for IDs:', targetAccountIds);
      throw new Error('No active accounts found');
    }

    const userAccounts = accounts.filter(account => account.user_id === userId);
    console.log('User accounts after filtering:', userAccounts.length);
    
    if (userAccounts.length !== accounts.length) {
      console.log('Account ownership mismatch:', {
        totalAccounts: accounts.length,
        userAccounts: userAccounts.length,
        userId: userId
      });
      throw new Error('Some accounts do not belong to the user');
    }

    const post = await Post.create({
      userId,
      content,
      targetAccounts: targetAccountIds,
      mediaUrls: [],
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      postType,
      isScheduled: !!scheduledFor
    });

    const publishResults = [];
    let hasErrors = false;
    
    // If scheduled, don't publish now
    if (scheduledFor) {
      console.log('Post scheduled for later, not publishing immediately');
      return {
        postId: post.id,
        status: 'scheduled',
        scheduledFor: scheduledFor,
        message: 'Post scheduled successfully'
      };
    }

    // Immediate publishing
    for (const account of userAccounts) {
      try {
        const result = await this.publishToAccount(account, content, mediaFiles, postType, platformSpecificData);
        publishResults.push({
          accountId: account.id,
          success: true,
          result
        });
        
        await SocialAccount.updateLastUsed(account.id);
      } catch (error) {
        console.error(`Failed to publish to account ${account.id}:`, error);
        hasErrors = true;
        publishResults.push({
          accountId: account.id,
          success: false,
          error: error.message
        });
      }
    }

    const finalStatus = hasErrors ? 'failed' : 'published';
    await Post.updateStatus(
      post.id, 
      finalStatus, 
      finalStatus === 'published' ? new Date() : null,
      hasErrors ? 'Some accounts failed to publish' : null
    );

    return {
      postId: post.id,
      status: finalStatus,
      results: publishResults
    };
  }

  async publishToAccount(account, content, mediaFiles = [], postType = 'text', platformSpecificData = {}) {
    switch (account.platform) {
      case 'mastodon':
        return await this.publishToMastodon(account, content, mediaFiles, postType);
      case 'x':
        return await this.publishToX(account, content, mediaFiles, postType);
      case 'pinterest':
        return await this.publishToPinterest(account, content, mediaFiles, postType);
      case 'bluesky':
        return await this.publishToBluesky(account, content, mediaFiles, postType);
      case 'facebook':
        return await this.publishToFacebook(account, content, mediaFiles, postType, platformSpecificData);
      case 'instagram':
        return await this.publishToInstagram(account, content, mediaFiles, postType, platformSpecificData);
      default:
        throw new Error(`Platform ${account.platform} not supported`);
    }
  }

  async publishToMastodon(account, content, mediaFiles = [], postType = 'text') {
    const decryptedToken = mastodonService.decrypt(account.access_token);
    
    let mediaIds = [];
    if (mediaFiles.length > 0) {
      for (const mediaFile of mediaFiles) {
        const mediaId = await mastodonService.uploadMedia(
          account.instance_url,
          decryptedToken,
          mediaFile
        );
        mediaIds.push(mediaId);
      }
    }

    const result = await mastodonService.publishStatus(
      account.instance_url,
      decryptedToken,
      content,
      mediaIds
    );

    return result;
  }

  async publishToX(account, content, mediaFiles = [], postType = 'text') {
    console.log('Publishing to X account:', {
      accountId: account.id,
      username: account.username,
      tokenEncrypted: account.access_token ? account.access_token.substring(0, 20) + '...' : 'null',
      mediaFilesCount: mediaFiles.length,
      postType
    });
    
    let decryptedToken;
    try {
      decryptedToken = xService.decrypt(account.access_token);
      console.log('X token decrypted successfully, length:', decryptedToken ? decryptedToken.length : 0);
    } catch (error) {
      console.error('X token decryption failed:', error.message);
      
      // Try to refresh the token if we have a refresh token
      console.log('X token: Attempting token refresh...');
      const refreshedToken = await xService.tryRefreshToken(account);
      
      if (refreshedToken) {
        console.log('X token: Refresh successful, using new token');
        decryptedToken = refreshedToken;
      } else {
        console.error('X token: Refresh failed, account needs reconnection');
        await SocialAccount.updateStatus(account.id, 'error');
        throw new Error('X account token is invalid and could not be refreshed. Please reconnect your X account.');
      }
    }
    
    let mediaIds = [];
    
    // Handle media uploads with detailed error logging
    if (mediaFiles.length > 0) {
      console.log('X media upload: Starting upload of', mediaFiles.length, 'files');
      
      for (let i = 0; i < mediaFiles.length; i++) {
        const mediaFile = mediaFiles[i];
        console.log(`X media upload: Processing file ${i + 1}/${mediaFiles.length}:`, {
          filename: mediaFile.originalname,
          mimetype: mediaFile.mimetype,
          size: mediaFile.size,
          hasBuffer: !!mediaFile.buffer
        });
        
        try {
          const isVideo = mediaFile.mimetype?.startsWith('video/') || postType === 'video' || postType === 'reel';
          console.log(`X media upload: Uploading ${isVideo ? 'video' : 'image'} file to X...`);
          
          const mediaId = await xService.uploadMedia(
            decryptedToken,
            mediaFile,
            isVideo
          );
          
          console.log(`X media upload: File ${i + 1} uploaded successfully, media ID:`, mediaId);
          mediaIds.push(mediaId);
          
        } catch (error) {
          console.error(`X media upload: File ${i + 1} upload failed:`, {
            error: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          });
          
          // Check if it's a token-related error
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.error('X media upload: Authentication error detected, trying token refresh...');
            
            // Try to refresh the token
            const refreshedToken = await xService.tryRefreshToken(account);
            
            if (refreshedToken) {
              console.log('X media upload: Token refreshed, retrying upload...');
              
              // Retry the upload with the new token
              try {
                const mediaId = await xService.uploadMedia(
                  refreshedToken,
                  mediaFile,
                  isVideo
                );
                console.log(`X media upload: File ${i + 1} uploaded successfully after token refresh, media ID:`, mediaId);
                mediaIds.push(mediaId);
                decryptedToken = refreshedToken; // Update token for future use
                continue; // Continue to next file
              } catch (retryError) {
                console.error(`X media upload: Retry failed after token refresh:`, retryError.message);
              }
            }
            
            console.error('X media upload: Token refresh failed, marking account as invalid');
            await SocialAccount.updateStatus(account.id, 'error');
            throw new Error('X account authentication failed. Please reconnect your X account.');
          }
          
          // Check if it's a rate limit error
          if (error.response?.status === 429) {
            const resetTime = error.response?.headers?.['x-rate-limit-reset'];
            const retryAfter = error.response?.headers?.['retry-after'];
            const waitTime = retryAfter || (resetTime ? Math.max(0, resetTime - Math.floor(Date.now() / 1000)) : 900);
            throw new Error(`X rate limit exceeded. Please wait ${Math.ceil(waitTime / 60)} minutes before posting again.`);
          }
          
          // For other errors, try to continue with remaining files
          console.log(`X media upload: Continuing with remaining files after error for file ${i + 1}`);
        }
      }
      
      console.log('X media upload: Completed. Successfully uploaded', mediaIds.length, 'out of', mediaFiles.length, 'files');
    }

    console.log('X posting: Creating tweet with', mediaIds.length, 'media attachments');
    
    try {
      const result = await xService.postTweet(
        decryptedToken,
        content,
        mediaIds,
        postType
      );
      
      console.log('X posting: Tweet created successfully:', {
        id: result.id,
        text: result.text ? result.text.substring(0, 50) + '...' : 'N/A',
        mediaCount: mediaIds.length
      });
      
      // Mark account as active since posting was successful
      await SocialAccount.updateLastUsed(account.id);
      
      return result;
      
    } catch (error) {
      console.error('X posting: Tweet creation failed:', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // Check if it's a token-related error
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('X posting: Authentication error detected, trying token refresh...');
        
        // Try to refresh the token
        const refreshedToken = await xService.tryRefreshToken(account);
        
        if (refreshedToken) {
          console.log('X posting: Token refreshed, retrying tweet creation...');
          
          // Retry the tweet with the new token
          try {
            const retryResult = await xService.postTweet(
              refreshedToken,
              content,
              mediaIds,
              postType
            );
            
            console.log('X posting: Tweet created successfully after token refresh:', {
              id: retryResult.id,
              text: retryResult.text ? retryResult.text.substring(0, 50) + '...' : 'N/A',
              mediaCount: mediaIds.length
            });
            
            // Mark account as active since posting was successful
            await SocialAccount.updateLastUsed(account.id);
            
            return retryResult;
            
          } catch (retryError) {
            console.error('X posting: Retry failed after token refresh:', retryError.message);
          }
        }
        
        console.error('X posting: Token refresh failed, marking account as invalid');
        await SocialAccount.updateStatus(account.id, 'error');
        throw new Error('X account authentication failed. Please reconnect your X account.');
      }
      
      throw error;
    }
  }

  async getPostHistory(userId, limit = 50, offset = 0) {
    const posts = await Post.findByUserId(userId, limit, offset);
    
    const postsWithAccounts = await Promise.all(
      posts.map(async (post) => {
        const accounts = await SocialAccount.getActiveAccountsByIds(post.target_accounts);
        return {
          ...post,
          targetAccounts: accounts.map(acc => ({
            id: acc.id,
            platform: acc.platform,
            username: acc.username,
            instanceUrl: acc.instance_url
          }))
        };
      })
    );

    return postsWithAccounts;
  }

  async getScheduledPosts(userId, limit = 50, offset = 0) {
    const posts = await Post.findScheduledByUserId(userId, limit, offset);
    
    const postsWithAccounts = await Promise.all(
      posts.map(async (post) => {
        const accounts = await SocialAccount.getActiveAccountsByIds(post.target_accounts);
        return {
          ...post,
          targetAccounts: accounts.map(acc => ({
            id: acc.id,
            platform: acc.platform,
            username: acc.username,
            instanceUrl: acc.instance_url
          }))
        };
      })
    );

    return postsWithAccounts;
  }

  async getPostStats(userId) {
    return await Post.getPostStats(userId);
  }

  async publishToPinterest(account, content, mediaFiles = [], postType = 'text') {
    console.log('Publishing to Pinterest account:', {
      accountId: account.id,
      username: account.username,
      tokenEncrypted: account.access_token ? account.access_token.substring(0, 20) + '...' : 'null'
    });
    
    const decryptedToken = pinterestService.decrypt(account.access_token);
    console.log('Pinterest token decrypted successfully, length:', decryptedToken ? decryptedToken.length : 0);
    
    // Pinterest requires an image for pins, so we need at least one media file
    if (!mediaFiles || mediaFiles.length === 0) {
      throw new Error('Pinterest pins require at least one image. Please add an image to your post.');
    }
    
    // Pinterest requires a board to post to
    // We'll need to get the user's boards and use the first available one
    // In a real implementation, you'd let the user choose the board
    const boards = await pinterestService.getUserBoards(decryptedToken);
    
    if (!boards || boards.length === 0) {
      throw new Error('No Pinterest boards found. Please create a board on Pinterest first.');
    }
    
    // Use the first available board
    const targetBoard = boards[0];
    console.log('Using Pinterest board:', targetBoard.name);
    
    // For now, we'll assume the first media file is an image URL
    // In a real implementation, you'd need to handle file uploads properly
    const imageUrl = mediaFiles[0].url || mediaFiles[0];
    
    // Create pin data
    const pinData = {
      boardId: targetBoard.id,
      title: content.substring(0, 100), // Pinterest titles are limited
      description: content,
      mediaUrl: imageUrl,
      link: null // Optional link back to your site
    };
    
    console.log('Creating Pinterest pin with data:', pinData);
    
    const result = await pinterestService.createPin(decryptedToken, pinData);
    
    console.log('Pinterest pin created successfully:', result);
    
    return {
      id: result.id,
      url: result.url,
      platform: 'pinterest',
      board: targetBoard.name
    };
  }

  async publishToBluesky(account, content, mediaFiles = [], postType = 'text') {
    console.log('Publishing to Bluesky account:', {
      accountId: account.id,
      username: account.username,
      hasToken: !!account.access_token
    });
    
    // Get the stored agent for this account
    let agent = blueskyService.getAgent(account.id);
    
    if (!agent) {
      console.log('No cached agent found, creating new session');
      // If no cached agent, create a new session
      const appPassword = blueskyService.decrypt ? 
        blueskyService.decrypt(account.access_token) : 
        account.access_token;
      
      const sessionData = await blueskyService.createSession(account.username, appPassword);
      agent = sessionData.agent;
      blueskyService.setAgent(account.id, agent);
    }
    
    // Prepare media files for Bluesky
    console.log('Bluesky publishToBluesky received media files:', mediaFiles.length);
    console.log('Media files details:', mediaFiles.map(f => ({ path: f?.path, mimetype: f?.mimetype, size: f?.size })));
    
    const mediaForBluesky = [];
    if (mediaFiles && mediaFiles.length > 0) {
      for (const mediaFile of mediaFiles) {
        console.log('Processing media file for Bluesky:', { 
          hasPath: !!mediaFile.path, 
          hasBuffer: !!mediaFile.buffer,
          bufferLength: mediaFile.buffer ? mediaFile.buffer.length : 'no buffer',
          file: mediaFile 
        });
        // Always accept files from multer - they have fieldname, originalname, and buffer
        console.log('Adding media file to mediaForBluesky array');
        mediaForBluesky.push(mediaFile);
      }
    }
    
    console.log('Creating Bluesky post with media files:', mediaForBluesky.length);
    
    const result = await blueskyService.createPost(agent, content, mediaForBluesky);
    
    console.log('Bluesky post created successfully:', result);
    
    return {
      id: result.uri,
      url: result.uri,
      platform: 'bluesky',
      success: result.success
    };
  }

  async publishToFacebook(account, content, mediaFiles = [], postType = 'text', platformSpecificData = {}) {
    console.log('Publishing to Facebook account:', {
      accountId: account.id,
      username: account.username,
      hasToken: !!account.access_token
    });

    try {
      const result = await facebookService.publishPost(
        account,
        content,
        mediaFiles,
        postType,
        platformSpecificData
      );

      console.log('Facebook post created successfully:', result);

      // Mark account as active since posting was successful
      await SocialAccount.updateLastUsed(account.id);

      return {
        id: result.platformPostId,
        url: `https://facebook.com/${result.platformPostId}`,
        platform: 'facebook',
        success: result.success
      };

    } catch (error) {
      console.error('Facebook posting failed:', {
        error: error.message,
        accountId: account.id
      });

      // Mark account as error if posting failed
      await SocialAccount.updateStatus(account.id, 'error');
      throw error;
    }
  }

  async publishToInstagram(account, content, mediaFiles = [], postType = 'text', platformSpecificData = {}) {
    console.log('Publishing to Instagram account:', {
      accountId: account.id,
      username: account.username,
      hasToken: !!account.access_token
    });

    try {
      const result = await instagramService.publishPost(
        account,
        content,
        mediaFiles,
        postType,
        platformSpecificData
      );

      console.log('Instagram post created successfully:', result);

      // Mark account as active since posting was successful
      await SocialAccount.updateLastUsed(account.id);

      return {
        id: result.platformPostId,
        url: `https://instagram.com/p/${result.platformPostId}`,
        platform: 'instagram',
        success: result.success
      };

    } catch (error) {
      console.error('Instagram posting failed:', {
        error: error.message,
        accountId: account.id
      });

      // Mark account as error if posting failed
      await SocialAccount.updateStatus(account.id, 'error');
      throw error;
    }
  }
}

module.exports = new PublishingService();