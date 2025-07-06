const SocialAccount = require('../models/SocialAccount');
const Post = require('../models/Post');
const mastodonService = require('./mastodon');
const xService = require('./x');

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
}

module.exports = new PublishingService();