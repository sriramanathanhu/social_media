import React, { useEffect, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider, useDispatch } from 'react-redux';
import { store } from './store';
import { Box, CircularProgress } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState, AppDispatch } from './store';
import Navigation from './components/Navigation';
import ErrorBoundary from './components/ErrorBoundary';
import { validateToken } from './store/slices/authSlice';

// Lazy load components for better performance
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const AccountsPage = React.lazy(() => import('./pages/AccountsPage'));
const ComposePage = React.lazy(() => import('./pages/ComposePage'));
const PostsPage = React.lazy(() => import('./pages/PostsPage'));
const WordPressPage = React.lazy(() => import('./pages/WordPressPage'));
const RedditPage = React.lazy(() => import('./pages/RedditPage'));
const LivePage = React.lazy(() => import('./pages/LivePage'));
const SystemMonitoring = React.lazy(() => import('./components/SystemMonitoring'));
const StreamAppsPage = React.lazy(() => import('./pages/StreamAppsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const XApiDashboard = React.lazy(() => import('./pages/XApiDashboard'));

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
      <ErrorBoundary>
        <Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Box sx={{ display: 'flex' }}>
        <ErrorBoundary>
          <Navigation />
        </ErrorBoundary>
        <Box component="main" sx={{ flexGrow: 1 }}>
          <ErrorBoundary>
            <Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh"><CircularProgress /></Box>}>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/compose" element={<ComposePage />} />
                <Route path="/posts" element={<PostsPage />} />
                <Route path="/wordpress" element={<WordPressPage />} />
                <Route path="/reddit" element={<RedditPage />} />
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
                <Route 
                  path="/admin/monitoring" 
                  element={
                    user?.role === 'admin' ? (
                      <SystemMonitoring />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  } 
                />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <AppContent />
          </Router>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;