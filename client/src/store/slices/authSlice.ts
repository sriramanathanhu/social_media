import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';
import { User } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  registrationMessage: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,
  initialized: false,
  registrationMessage: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(email, password);
      return response.data;
    } catch (error: any) {
      // Handle network errors specifically
      if (error.isNetworkError || error.code === 'NETWORK_ERROR' || !error.response) {
        return rejectWithValue('Network error: Unable to connect to server. Please check your internet connection and try again.');
      }
      // Handle other errors
      return rejectWithValue(error.response?.data?.error || error.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await authAPI.register(email, password);
    return response.data;
  }
);

export const validateToken = createAsyncThunk(
  'auth/validateToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return rejectWithValue('No token found');
      }
      // Fetch user data to validate token and get user info
      const response = await authAPI.getProfile();
      return { token, user: response.data.user };
    } catch (error) {
      localStorage.removeItem('token');
      return rejectWithValue('Token validation failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    },
    clearRegistrationMessage: (state) => {
      state.registrationMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.initialized = true;
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || action.error.message || 'Login failed';
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.registrationMessage = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        // Check if user needs approval (no token provided)
        if (action.payload.token) {
          // User is approved, can login immediately
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.initialized = true;
          localStorage.setItem('token', action.payload.token);
        } else {
          // User needs approval, show message
          state.registrationMessage = action.payload.message || 'Account created successfully. Please wait for admin approval.';
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Registration failed';
      })
      .addCase(validateToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateToken.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.initialized = true;
      })
      .addCase(validateToken.rejected, (state, action) => {
        state.loading = false;
        // Handle different rejection scenarios
        const token = localStorage.getItem('token');
        if (!token || action.payload === 'No token found') {
          // No token or invalid token - clear all auth data
          state.token = null;
          state.user = null;
        } else {
          // Network error or other issue - keep existing data if we have it
          console.log('Token validation failed, but keeping existing user data');
        }
        state.initialized = true;
      });
  },
});

export const { logout, clearError, clearRegistrationMessage } = authSlice.actions;
export default authSlice.reducer;