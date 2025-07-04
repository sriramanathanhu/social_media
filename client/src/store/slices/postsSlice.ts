import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postsAPI } from '../../services/api';
import { Post } from '../../types';

interface PostsState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  publishing: boolean;
}

const initialState: PostsState = {
  posts: [],
  loading: false,
  error: null,
  publishing: false,
};

export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async () => {
    const response = await postsAPI.getPosts();
    return response.data.posts;
  }
);

export const createPost = createAsyncThunk(
  'posts/createPost',
  async ({ content, targetAccountIds }: { content: string; targetAccountIds: string[] }) => {
    const response = await postsAPI.createPost(content, targetAccountIds);
    return response.data;
  }
);

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch posts';
      })
      .addCase(createPost.pending, (state) => {
        state.publishing = true;
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.publishing = false;
        state.posts.unshift(action.payload);
      })
      .addCase(createPost.rejected, (state, action) => {
        state.publishing = false;
        state.error = action.error.message || 'Failed to create post';
      });
  },
});

export const { clearError } = postsSlice.actions;
export default postsSlice.reducer;