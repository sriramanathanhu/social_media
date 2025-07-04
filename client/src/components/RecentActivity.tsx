import React from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Box,
  Chip,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';
import { Post, SocialAccount } from '../types';

interface RecentActivityProps {
  posts: Post[];
  accounts: SocialAccount[];
}

interface ActivityItem {
  id: string;
  type: 'post_published' | 'post_failed' | 'account_connected' | 'account_disconnected';
  title: string;
  subtitle: string;
  timestamp: string;
  icon: React.ReactNode;
  color: 'success' | 'error' | 'warning' | 'info';
}

const RecentActivity: React.FC<RecentActivityProps> = ({ posts, accounts }) => {
  const generateActivityItems = (): ActivityItem[] => {
    const activities: ActivityItem[] = [];

    // Add post activities
    posts.slice(0, 5).forEach((post) => {
      if (post.status === 'published' && post.publishedAt) {
        activities.push({
          id: `post-${post.id}`,
          type: 'post_published',
          title: 'Post published successfully',
          subtitle: post.content.substring(0, 60) + (post.content.length > 60 ? '...' : ''),
          timestamp: post.publishedAt,
          icon: <CheckCircleIcon />,
          color: 'success',
        });
      } else if (post.status === 'failed') {
        activities.push({
          id: `post-failed-${post.id}`,
          type: 'post_failed',
          title: 'Post publishing failed',
          subtitle: post.content.substring(0, 60) + (post.content.length > 60 ? '...' : ''),
          timestamp: post.createdAt,
          icon: <ErrorIcon />,
          color: 'error',
        });
      }
    });

    // Add account activities
    accounts.slice(0, 3).forEach((account) => {
      activities.push({
        id: `account-${account.id}`,
        type: 'account_connected',
        title: `${account.platform.charAt(0).toUpperCase() + account.platform.slice(1)} account connected`,
        subtitle: `@${account.username}${account.instanceUrl ? ` on ${account.instanceUrl}` : ''}`,
        timestamp: account.createdAt,
        icon: <AccountIcon />,
        color: 'info',
      });
    });

    // Sort by timestamp (most recent first)
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  };

  const activityItems = generateActivityItems();

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Recent Activity
      </Typography>
      
      {activityItems.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No recent activity to display
          </Typography>
        </Box>
      ) : (
        <List sx={{ py: 0 }}>
          {activityItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: `${item.color}.main` }}>
                    {item.icon}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {item.title}
                      </Typography>
                      <Chip
                        label={formatTimeAgo(item.timestamp)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {item.subtitle}
                    </Typography>
                  }
                />
              </ListItem>
              {index < activityItems.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default RecentActivity;