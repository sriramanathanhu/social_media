import axios from 'axios';
import { SocialAccount, User, Post } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('API Request:', config.url, 'Token:', token ? 'present' : 'missing');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.hash = '#/login'; // Use hash routing
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
  
  createPost: (content: string, targetAccountIds: string[], mediaFiles?: File[], scheduledFor?: string, postType?: string) => {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('targetAccountIds', JSON.stringify(targetAccountIds));
    
    if (scheduledFor) {
      formData.append('scheduledFor', scheduledFor);
    }
    
    if (postType) {
      formData.append('postType', postType);
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

export default api;