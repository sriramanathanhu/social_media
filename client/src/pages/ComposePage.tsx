import React, { useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  CircularProgress,
  Toolbar,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchPosts } from '../store/slices/postsSlice';
import ComposePostOptimized from '../components/ComposePost/ComposePostOptimized';
import PostCard from '../components/PostCard';

const ComposePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { posts, loading } = useSelector((state: RootState) => state.posts);
  const { token, initialized } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (initialized && token) {
      dispatch(fetchPosts());
    }
  }, [dispatch, initialized, token]);

  const recentPosts = posts.slice(0, 5);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Toolbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create Post
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Compose and publish content to your connected social media accounts
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <ComposePostOptimized />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Posts
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : recentPosts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No recent posts to display
              </Typography>
            ) : (
              <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
                {recentPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      </Container>
    </Box>
  );
};

export default React.memo(ComposePage);