import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider, useDispatch } from 'react-redux';
import { store } from './store';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AccountsPage from './pages/AccountsPage';
import ComposePage from './pages/ComposePage';
import PostsPage from './pages/PostsPage';
import WordPressPage from './pages/WordPressPage';
import LivePage from './pages/LivePage';
import StreamAppsPage from './pages/StreamAppsPage';
import SettingsPage from './pages/SettingsPage';
import UserManagement from './pages/UserManagement';
import XApiDashboard from './pages/XApiDashboard';
import { Box, CircularProgress } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState, AppDispatch } from './store';
import Navigation from './components/Navigation';
import { validateToken } from './store/slices/authSlice';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const AppContent: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { token, initialized, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Validate token on app startup
    dispatch(validateToken());
  }, [dispatch]);

  // Show loading spinner while initializing
  if (!initialized) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <Navigation />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/compose" element={<ComposePage />} />
          <Route path="/posts" element={<PostsPage />} />
          <Route path="/wordpress" element={<WordPressPage />} />
          <Route path="/live" element={<LivePage />} />
          <Route path="/stream-apps" element={<StreamAppsPage />} />
          <Route 
            path="/users" 
            element={
              user?.role === 'admin' ? (
                <UserManagement />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } 
          />
          <Route 
            path="/admin/x-api-dashboard" 
            element={
              user?.role === 'admin' ? (
                <XApiDashboard />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } 
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Box>
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </Provider>
  );
};

export default App;