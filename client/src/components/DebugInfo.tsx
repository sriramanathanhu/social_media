import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Bug as BugIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';

const DebugInfo: React.FC = () => {
  const [apiTests, setApiTests] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const { user, token, loading: authLoading, initialized } = useSelector((state: RootState) => state.auth);
  const { accounts } = useSelector((state: RootState) => state.accounts);

  const testEndpoint = async (name: string, url: string, requiresAuth = true) => {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (requiresAuth && token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });
      const data = await response.json();
      
      return {
        status: response.status,
        ok: response.ok,
        data: response.ok ? data : { error: data },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        ok: false,
        data: { error: error.message },
        timestamp: new Date().toISOString()
      };
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    const tests = {};

    // Test backend health
    tests['Backend Health'] = await testEndpoint('health', 'https://socialmedia-p3ln.onrender.com/health', false);
    
    // Test API root
    tests['API Root'] = await testEndpoint('api-root', 'https://socialmedia-p3ln.onrender.com/api', false);
    
    if (token) {
      // Test authenticated endpoints
      tests['Profile'] = await testEndpoint('profile', 'https://socialmedia-p3ln.onrender.com/api/auth/profile');
      tests['Accounts'] = await testEndpoint('accounts', 'https://socialmedia-p3ln.onrender.com/api/accounts');
      tests['X API Status'] = await testEndpoint('x-api-status', 'https://socialmedia-p3ln.onrender.com/api/auth/x-api-status');
      tests['Admin Users'] = await testEndpoint('admin-users', 'https://socialmedia-p3ln.onrender.com/api/admin/users');
    }

    setApiTests(tests);
    setLoading(false);
  };

  useEffect(() => {
    runAllTests();
  }, [token]);

  const getStatusColor = (test: any) => {
    if (!test) return 'default';
    if (test.status === 'ERROR') return 'error';
    if (test.ok) return 'success';
    if (test.status === 401) return 'warning'; // Unauthorized is expected for some
    return 'error';
  };

  return (
    <Card>
      <CardHeader 
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <BugIcon />
            <Typography variant="h6">Debug Information</Typography>
          </Box>
        }
        action={
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={runAllTests}
            disabled={loading}
          >
            Refresh Tests
          </Button>
        }
      />
      <CardContent>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Authentication State</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Chip 
                  label={`Initialized: ${initialized}`} 
                  color={initialized ? 'success' : 'error'} 
                />
                <Chip 
                  label={`Has Token: ${!!token}`} 
                  color={token ? 'success' : 'error'} 
                />
                <Chip 
                  label={`Loading: ${authLoading}`} 
                  color={authLoading ? 'warning' : 'default'} 
                />
                <Chip 
                  label={`User Role: ${user?.role || 'None'}`} 
                  color={user?.role === 'admin' ? 'primary' : 'default'} 
                />
              </Box>
              
              <Typography variant="body2" component="pre" sx={{ 
                bgcolor: 'grey.100', 
                p: 1, 
                borderRadius: 1,
                fontSize: '0.75rem',
                overflow: 'auto'
              }}>
                {JSON.stringify({ user, token: token ? token.substring(0, 20) + '...' : null }, null, 2)}
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Accounts State</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" component="pre" sx={{ 
              bgcolor: 'grey.100', 
              p: 1, 
              borderRadius: 1,
              fontSize: '0.75rem',
              overflow: 'auto'
            }}>
              {JSON.stringify(accounts.map(acc => ({ 
                id: acc.id, 
                platform: acc.platform, 
                username: acc.username, 
                status: acc.status 
              })), null, 2)}
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">API Endpoint Tests</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="flex" flexDirection="column" gap={2}>
              {Object.entries(apiTests).map(([name, test]: [string, any]) => (
                <Box key={name}>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Typography variant="body1" fontWeight="medium">{name}</Typography>
                    <Chip 
                      label={test?.status || 'Loading...'} 
                      color={getStatusColor(test)}
                      size="small"
                    />
                  </Box>
                  
                  {test && (
                    <Typography variant="body2" component="pre" sx={{ 
                      bgcolor: test.ok ? 'success.light' : 'error.light', 
                      color: test.ok ? 'success.contrastText' : 'error.contrastText',
                      p: 1, 
                      borderRadius: 1,
                      fontSize: '0.7rem',
                      overflow: 'auto',
                      opacity: 0.9
                    }}>
                      {JSON.stringify(test, null, 2)}
                    </Typography>
                  )}
                  
                  <Divider sx={{ mt: 1 }} />
                </Box>
              ))}
              
              {loading && (
                <Alert severity="info">Running API tests...</Alert>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Browser Environment</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" component="pre" sx={{ 
              bgcolor: 'grey.100', 
              p: 1, 
              borderRadius: 1,
              fontSize: '0.75rem',
              overflow: 'auto'
            }}>
              {JSON.stringify({
                url: window.location.href,
                userAgent: navigator.userAgent.substring(0, 100) + '...',
                localStorage: {
                  token: localStorage.getItem('token') ? 'present' : 'missing',
                  tokenLength: localStorage.getItem('token')?.length || 0
                },
                apiBaseUrl: process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api'
              }, null, 2)}
            </Typography>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default DebugInfo;