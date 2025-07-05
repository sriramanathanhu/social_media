import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store';
import { login, register, clearError, clearRegistrationMessage } from '../store/slices/authSlice';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error, registrationMessage } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const action = showRegister ? register : login;
    const result = await dispatch(action({ email, password }));
    if (result.meta.requestStatus === 'fulfilled') {
      // For registration, only navigate if user is immediately approved (has token)
      if (!showRegister || result.payload.token) {
        navigate('/dashboard', { replace: true });
      } else {
        // For pending registration, clear form but stay on page
        setEmail('');
        setPassword('');
      }
    }
  };

  const handleErrorDismiss = () => {
    dispatch(clearError());
  };

  const handleToggleMode = () => {
    setShowRegister(!showRegister);
    setEmail('');
    setPassword('');
    dispatch(clearError());
    dispatch(clearRegistrationMessage());
  };

  const handleRegistrationMessageDismiss = () => {
    dispatch(clearRegistrationMessage());
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Social Media Scheduler
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            {showRegister ? 'Create your account to get started' : 'Sign in to manage your social media accounts'}
          </Typography>
          

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={handleErrorDismiss}>
              {error}
            </Alert>
          )}

          {registrationMessage && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={handleRegistrationMessageDismiss}>
              {registrationMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete={showRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              helperText={showRegister ? "Password must be at least 8 characters" : ""}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || !email || !password || (showRegister && password.length < 8)}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading 
                ? (showRegister ? 'Creating Account...' : 'Signing In...') 
                : (showRegister ? 'Create Account' : 'Sign In')}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={handleToggleMode}
              >
                {showRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;