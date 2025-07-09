export interface User {
  id: string;
  email: string;
  role?: 'admin' | 'user';
  status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface SocialAccount {
  id: string;
  userId: string;
  platform: 'mastodon' | 'x' | 'twitter' | 'pinterest' | 'bluesky' | 'soundcloud' | 'substack' | 'telegram' | 'deviantart';
  instanceUrl?: string;
  username: string;
  displayName?: string;
  avatar?: string;
  status: 'active' | 'expired' | 'error';
  createdAt: string;
  lastUsed?: string;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  mediaUrls?: string[];
  targetAccounts: string[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  publishedAt?: string;
  scheduledFor?: string;
  createdAt: string;
}

export interface PublishRequest {
  content: string;
  mediaFiles?: File[];
  targetAccountIds: string[];
  scheduleFor?: string;
}

export interface MastodonInstance {
  uri: string;
  title: string;
  description: string;
  version: string;
  registrations: boolean;
}