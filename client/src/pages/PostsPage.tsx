import React, { useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Toolbar,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store';
import { fetchPosts } from '../store/slices/postsSlice';
import PostCard from '../components/PostCard';

const PostsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { posts, loading, error } = useSelector((state: RootState) => state.posts);

  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  const handleDeletePost = (postId: string) => {
    console.log('Delete post:', postId);
  };

  const publishedPosts = posts.filter(post => post.status === 'published');
  const scheduledPosts = posts.filter(post => post.status === 'scheduled');
  const failedPosts = posts.filter(post => post.status === 'failed');

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Toolbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Posts
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage your published content
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/compose')}
        >
          Create Post
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && posts.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Published Posts */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Published Posts ({publishedPosts.length})
              </Typography>
              
              {publishedPosts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No published posts yet
                </Typography>
              ) : (
                <Box sx={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {publishedPosts.map((post) => (
                    <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Scheduled Posts */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Scheduled Posts ({scheduledPosts.length})
              </Typography>
              
              {scheduledPosts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No scheduled posts
                </Typography>
              ) : (
                <Box sx={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {scheduledPosts.map((post) => (
                    <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Failed Posts */}
          {failedPosts.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Failed Posts ({failedPosts.length})
                </Typography>
                
                <Box sx={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {failedPosts.map((post) => (
                    <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
                  ))}
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Empty State */}
          {posts.length === 0 && !loading && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  No posts yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Create your first post to get started
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/compose')}
                >
                  Create Your First Post
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}
      </Container>
    </Box>
  );
};

export default PostsPage;