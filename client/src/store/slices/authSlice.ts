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
  async ({ email, password }: { email: string; password: string }) => {
    const response = await authAPI.login(email, password);
    return response.data;
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
        state.error = action.error.message || 'Login failed';
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
      .addCase(validateToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.initialized = true;
      })
      .addCase(validateToken.rejected, (state) => {
        // Only clear user data if token is actually invalid, not on network errors
        const token = localStorage.getItem('token');
        if (!token) {
          state.token = null;
          state.user = null;
        }
        state.initialized = true;
      });
  },
});

export const { logout, clearError, clearRegistrationMessage } = authSlice.actions;
export default authSlice.reducer;