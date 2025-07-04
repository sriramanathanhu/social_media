import axios from 'axios';
import { SocialAccount, User, Post } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
  
  connectMastodon: (instanceUrl: string) =>
    api.post('/auth/mastodon/connect', { instanceUrl }),
  
  mastodonCallback: (code: string, state: string) =>
    api.get(`/auth/mastodon/callback?code=${code}&state=${state}`),
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
  
  createPost: (content: string, targetAccountIds: string[]) =>
    api.post('/posts', { content, targetAccountIds }),
  
  deletePost: (id: string) =>
    api.delete(`/posts/${id}`),
  
  getPostStats: () =>
    api.get('/posts/stats'),
};

export default api;