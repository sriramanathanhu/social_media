const SocialAccount = require('../models/SocialAccount');
const Post = require('../models/Post');
const mastodonService = require('./mastodon');
const xService = require('./x');
const pinterestService = require('./pinterest');
const blueskyService = require('./bluesky');

class PublishingService {
  async publishPost(userId, postData) {
    const { content, targetAccountIds, mediaFiles = [], scheduledFor, postType = 'text' } = postData;
    
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
        const result = await this.publishToAccount(account, content, mediaFiles, postType);
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

  async publishToAccount(account, content, mediaFiles = [], postType = 'text') {
    switch (account.platform) {
      case 'mastodon':
        return await this.publishToMastodon(account, content, mediaFiles, postType);
      case 'x':
        return await this.publishToX(account, content, mediaFiles, postType);
      case 'pinterest':
        return await this.publishToPinterest(account, content, mediaFiles, postType);
      case 'bluesky':
        return await this.publishToBluesky(account, content, mediaFiles, postType);
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
      tokenEncrypted: account.access_token ? account.access_token.substring(0, 20) + '...' : 'null'
    });
    
    const decryptedToken = xService.decrypt(account.access_token);
    console.log('Token decrypted successfully, length:', decryptedToken ? decryptedToken.length : 0);
    
    let mediaIds = [];
    
    // Temporarily disable media upload to test text posts
    if (mediaFiles.length > 0) {
      try {
        for (const mediaFile of mediaFiles) {
          const isVideo = mediaFile.mimetype?.startsWith('video/') || postType === 'video' || postType === 'reel';
          const mediaId = await xService.uploadMedia(
            decryptedToken,
            mediaFile,
            isVideo
          );
          mediaIds.push(mediaId);
        }
      } catch (error) {
        console.error('X media upload failed, posting text only:', error.message);
        // Continue with text-only post if media upload fails
        mediaIds = [];
      }
    }

    const result = await xService.postTweet(
      decryptedToken,
      content,
      mediaIds,
      postType
    );

    return result;
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
    const mediaForBluesky = [];
    if (mediaFiles && mediaFiles.length > 0) {
      for (const mediaFile of mediaFiles) {
        if (mediaFile.path) {
          mediaForBluesky.push(mediaFile);
        }
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
}

module.exports = new PublishingService();