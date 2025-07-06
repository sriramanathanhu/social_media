import React, { useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Toolbar,
} from '@mui/material';
import {
  AccountCircle as AccountIcon,
  Create as CreateIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchAccounts } from '../store/slices/accountsSlice';
import { fetchPosts } from '../store/slices/postsSlice';
import StatsCard from '../components/StatsCard';
import QuickActions from '../components/QuickActions';
import RecentActivity from '../components/RecentActivity';
import XApiStatus from '../components/XApiStatus';

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { accounts } = useSelector((state: RootState) => state.accounts);
  const { posts } = useSelector((state: RootState) => state.posts);
  const { user, token, initialized } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Only fetch data if user is authenticated and app is initialized
    if (initialized && token) {
      dispatch(fetchAccounts());
      dispatch(fetchPosts());
    }
  }, [dispatch, initialized, token]);

  const activeAccounts = accounts.filter(account => account.status === 'active');
  const mastodonAccounts = accounts.filter(account => account.platform === 'mastodon');
  const xAccounts = accounts.filter(account => account.platform === 'x');
  const publishedPosts = posts.filter(post => post.status === 'published');
  const scheduledPosts = posts.filter(post => post.status === 'scheduled');
  const todayPosts = posts.filter(post => {
    if (!post.publishedAt) return false;
    const today = new Date().toDateString();
    const postDate = new Date(post.publishedAt).toDateString();
    return today === postDate;
  });

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Toolbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back, {user?.email}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Stats Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Active Accounts"
              value={activeAccounts.length}
              icon={AccountIcon}
              color="primary"
              subtitle="Connected and verified"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Published Posts"
              value={publishedPosts.length}
              icon={TrendingUpIcon}
              color="success"
              subtitle="Total published content"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Scheduled Posts"
              value={scheduledPosts.length}
              icon={ScheduleIcon}
              color="info"
              subtitle="Pending publication"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Published Today"
              value={todayPosts.length}
              icon={CreateIcon}
              color="warning"
              subtitle="Content shared today"
            />
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} lg={6}>
            <QuickActions />
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} lg={6}>
            <RecentActivity posts={posts} accounts={accounts} />
          </Grid>

          {/* X API Status - Always show, component handles no accounts case */}
          <Grid item xs={12}>
            <XApiStatus />
          </Grid>

          {/* Getting Started */}
          {accounts.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ 
                p: 4, 
                textAlign: 'center', 
                bgcolor: 'background.paper', 
                borderRadius: 2,
                border: 1,
                borderColor: 'divider'
              }}>
                <Typography variant="h6" gutterBottom>
                  Welcome to Social Media Scheduler! 🎉
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Get started by connecting your first social media account to begin managing your content.
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
  );
};

export default DashboardPage;