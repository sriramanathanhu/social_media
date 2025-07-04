const SocialAccount = require('../models/SocialAccount');
const Post = require('../models/Post');
const mastodonService = require('./mastodon');

class PublishingService {
  async publishPost(userId, postData) {
    const { content, targetAccountIds, mediaFiles = [] } = postData;
    
    const accounts = await SocialAccount.getActiveAccountsByIds(targetAccountIds);
    
    if (accounts.length === 0) {
      throw new Error('No active accounts found');
    }

    const userAccounts = accounts.filter(account => account.user_id === userId);
    if (userAccounts.length !== accounts.length) {
      throw new Error('Some accounts do not belong to the user');
    }

    const post = await Post.create({
      userId,
      content,
      targetAccounts: targetAccountIds,
      mediaUrls: []
    });

    const publishResults = [];
    let hasErrors = false;

    for (const account of userAccounts) {
      try {
        const result = await this.publishToAccount(account, content, mediaFiles);
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

  async publishToAccount(account, content, mediaFiles = []) {
    switch (account.platform) {
      case 'mastodon':
        return await this.publishToMastodon(account, content, mediaFiles);
      default:
        throw new Error(`Platform ${account.platform} not supported`);
    }
  }

  async publishToMastodon(account, content, mediaFiles = []) {
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

  async getPostStats(userId) {
    return await Post.getPostStats(userId);
  }
}

module.exports = new PublishingService();