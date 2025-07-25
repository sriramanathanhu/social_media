import axios from 'axios';
import { SocialAccount, User, Post } from '../types';
import logger from '../utils/logger';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  logger.apiRequest(config.url || '', config.method || 'GET', !!token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    logger.apiError(error);

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.hash = '#/login'; // Use hash routing
    }
    
    // Add network error detection
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED' || !error.response) {
      logger.error('Network connectivity issue detected');
      error.isNetworkError = true;
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (email: string, password: string) =>
    api.post('/auth/register', { email, password }),
  
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  getProfile: () =>
    api.get('/auth/profile'),
  
  connectMastodon: (instanceUrl: string) =>
    api.post('/auth/mastodon/connect', { instanceUrl }),
  
  mastodonCallback: (code: string, state: string) =>
    api.get(`/auth/mastodon/callback?code=${code}&state=${state}`),
  
  connectX: () =>
    api.post('/auth/x/connect'),
  
  xCallback: (code: string, state: string) =>
    api.get(`/auth/x/callback?code=${code}&state=${state}`),
  
  connectPinterest: () =>
    api.post('/auth/pinterest/connect'),
  
  pinterestCallback: (code: string, state: string) =>
    api.get(`/auth/pinterest/callback?code=${code}&state=${state}`),
  
  connectBluesky: (handle: string, appPassword: string) =>
    api.post('/auth/bluesky/connect', { handle, appPassword }),
  
  connectFacebook: () =>
    api.post('/auth/facebook/connect'),
  
  facebookCallback: (code: string, state: string) =>
    api.get(`/auth/facebook/callback?code=${code}&state=${state}`),
  
  connectInstagram: (facebookAccountId: string, instagramAccountId: string) =>
    api.post('/auth/instagram/callback', { facebookAccountId, instagramAccountId }),
};

export const accountsAPI = {
  getAccounts: (): Promise<{ data: { accounts: SocialAccount[] } }> =>
    api.get('/accounts'),
  
  getAccount: (id: string): Promise<{ data: { account: SocialAccount } }> =>
    api.get(`/accounts/${id}`),
  
  deleteAccount: (id: string) =>
    api.delete(`/accounts/${id}`),
  
  verifyAccount: (id: string) =>
    api.post(`/accounts/${id}/verify`),
};

export const postsAPI = {
  getPosts: (): Promise<{ data: { posts: Post[] } }> =>
    api.get('/posts'),
  
  getScheduledPosts: (): Promise<{ data: { posts: Post[] } }> =>
    api.get('/posts/scheduled'),
  
  createPost: (content: string, targetAccountIds: string[], mediaFiles?: File[], scheduledFor?: string, postType?: string, pinterestTitle?: string, pinterestDescription?: string, pinterestBoard?: string, pinterestDestinationUrl?: string) => {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('targetAccountIds', JSON.stringify(targetAccountIds));
    
    if (scheduledFor) {
      formData.append('scheduledFor', scheduledFor);
    }
    
    if (postType) {
      formData.append('postType', postType);
    }
    
    if (pinterestTitle) {
      formData.append('pinterestTitle', pinterestTitle);
    }
    
    if (pinterestDescription) {
      formData.append('pinterestDescription', pinterestDescription);
    }
    
    if (pinterestBoard) {
      formData.append('pinterestBoard', pinterestBoard);
    }
    
    if (pinterestDestinationUrl) {
      formData.append('pinterestDestinationUrl', pinterestDestinationUrl);
    }
    
    if (mediaFiles) {
      mediaFiles.forEach((file, index) => {
        formData.append(`mediaFiles`, file);
      });
    }
    
    return api.post('/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  deletePost: (id: string) =>
    api.delete(`/posts/${id}`),
  
  getPostStats: () =>
    api.get('/posts/stats'),
};

export const adminApi = {
  getAllUsers: (): Promise<{ data: User[] }> =>
    api.get('/admin/users'),
  
  updateUserStatus: (userId: string, status: string) =>
    api.put(`/admin/users/${userId}/status`, { status }),
  
  makeAdmin: (userId: string) =>
    api.put(`/admin/users/${userId}/make-admin`),
  
  removeAdmin: (userId: string) =>
    api.put(`/admin/users/${userId}/remove-admin`),
};

export const groupsAPI = {
  getGroups: () =>
    api.get('/groups'),
  
  createGroup: (name: string, description?: string, color?: string) =>
    api.post('/groups', { name, description, color }),
  
  getGroup: (id: string) =>
    api.get(`/groups/${id}`),
  
  updateGroup: (id: string, name: string, description?: string, color?: string) =>
    api.put(`/groups/${id}`, { name, description, color }),
  
  deleteGroup: (id: string) =>
    api.delete(`/groups/${id}`),
  
  addAccountToGroup: (groupId: string, accountId: string) =>
    api.post(`/groups/${groupId}/accounts/${accountId}`),
  
  removeAccountFromGroup: (accountId: string) =>
    api.delete(`/groups/accounts/${accountId}`),
};

export const liveStreamingAPI = {
  getStreams: () =>
    api.get('/live'),
  
  createStream: (streamData: any) =>
    api.post('/live', streamData),
  
  getStream: (id: string) =>
    api.get(`/live/${id}`),
  
  updateStream: (id: string, streamData: any) =>
    api.put(`/live/${id}`, streamData),
  
  deleteStream: (id: string) =>
    api.delete(`/live/${id}`),
  
  getStreamRTMPInfo: (id: string) =>
    api.get(`/live/${id}/rtmp-info`),
  
  getActiveSessions: () =>
    api.get('/live/sessions/active'),
  
  startStreamSession: (id: string) =>
    api.post(`/live/${id}/sessions`),
  
  endStreamSession: (sessionId: string) =>
    api.put(`/live/sessions/${sessionId}/end`),
  
  getNimbleStatus: () =>
    api.get('/live/nimble/status'),
  
  updateNimbleConfig: () =>
    api.post('/live/nimble/config/update'),
};

export const wordpressAPI = {
  // WordPress Site Management
  connectSite: (siteData: { siteUrl: string; username: string; appPassword: string }) =>
    api.post('/wordpress/connect', siteData),

  getSites: () =>
    api.get('/wordpress/sites'),

  getSite: (id: string) =>
    api.get(`/wordpress/sites/${id}`),

  updateSite: (id: string, siteData: any) =>
    api.put(`/wordpress/sites/${id}`, siteData),

  deleteSite: (id: string) =>
    api.delete(`/wordpress/sites/${id}`),

  // Categories and Tags
  getCategories: (siteId: string) =>
    api.get(`/wordpress/sites/${siteId}/categories`),

  getTags: (siteId: string) =>
    api.get(`/wordpress/sites/${siteId}/tags`),

  syncSiteData: (siteId: string) =>
    api.post(`/wordpress/sites/${siteId}/sync`),

  searchTags: (siteId: string, query: string) =>
    api.get(`/wordpress/sites/${siteId}/tags/search`, { params: { q: query } }),

  // Publishing
  publishPost: (postData: {
    siteId: number;
    title: string;
    content: string;
    status?: string;
    categories?: number[];
    tags?: number[];
    excerpt?: string;
    scheduledFor?: string;
  }) =>
    api.post('/wordpress/publish', postData),

  publishPostBulk: (postData: {
    siteIds: number[];
    title: string;
    content: string;
    status?: string;
    categories?: number[];
    tags?: number[];
    excerpt?: string;
    scheduledFor?: string;
  }) =>
    api.post('/wordpress/publish-bulk', postData),

  getPosts: (params?: { siteId?: string; page?: number; perPage?: number }) =>
    api.get('/wordpress/posts', { params }),

  updatePost: (postId: string, postData: any) =>
    api.put(`/wordpress/posts/${postId}`, postData),

  deletePost: (postId: string, siteId: number) =>
    api.delete(`/wordpress/posts/${postId}`, { data: { siteId } }),

  // Media Upload
  uploadMedia: (siteId: string, formData: FormData) =>
    api.post(`/wordpress/sites/${siteId}/media`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};

export default api;