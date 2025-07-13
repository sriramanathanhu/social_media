import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Fab,
  Dialog,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Key as KeyIcon,
  Code as CodeIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import CreateStreamAppDialog from '../components/CreateStreamAppDialog';
import StreamAppSettingsDialog from '../components/StreamAppSettingsDialog';
import StreamAppKeysDialog from '../components/StreamAppKeysDialog';

interface StreamApp {
  id: string;
  app_name: string;
  description?: string;
  rtmp_app_path: string;
  default_stream_key?: string;
  status: 'active' | 'inactive' | 'deleted';
  settings: any;
  key_count: number;
  active_key_count: number;
  created_at: string;
  updated_at: string;
}

const StreamAppsPage: React.FC = () => {
  const [apps, setApps] = useState<StreamApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [keysDialogOpen, setKeysDialogOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    fetchApps();
  }, [token]);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/stream-apps`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch apps');
      }

      const data = await response.json();
      setApps(data.apps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch apps');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApp = async (appId: string) => {
    if (!window.confirm('Are you sure you want to delete this app? This action cannot be undone and will affect all associated streams.')) {
      return;
    }

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/stream-apps/${appId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete app');
      }

      fetchApps(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete app');
    }
  };

  const handleShowSettings = (appId: string) => {
    setSelectedAppId(appId);
    setSettingsDialogOpen(true);
  };

  const handleShowKeys = (appId: string) => {
    setSelectedAppId(appId);
    setKeysDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 8, mb: 4, pt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 8, mb: 4, pt: 4, position: 'relative', zIndex: 1 }}>
      <Box sx={{ mb: 4, mt: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3,
          py: 2
        }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Stream Apps
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create and manage independent streaming applications with custom keys
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ minWidth: 140 }}
          >
            Create App
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {apps.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <CodeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No streaming apps created yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create your first streaming app to manage custom RTMP endpoints and stream keys
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              🚀 One app, multiple keys: Use OBS once to stream to multiple platforms
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Your First App
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {apps.map((app) => (
            <Grid item xs={12} md={6} lg={4} key={app.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h3" noWrap>
                      {app.app_name}
                    </Typography>
                    <Chip
                      label={app.status.toUpperCase()}
                      color={getStatusColor(app.status)}
                      size="small"
                    />
                  </Box>

                  {app.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {app.description}
                    </Typography>
                  )}

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" display="block">
                      RTMP Path: /{app.rtmp_app_path}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Created: {new Date(app.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Chip
                      icon={<KeyIcon />}
                      label={`${app.active_key_count}/${app.key_count} keys active`}
                      size="small"
                      color={app.active_key_count > 0 ? 'primary' : 'default'}
                      variant="outlined"
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button 
                      size="small" 
                      startIcon={<KeyIcon />}
                      onClick={() => handleShowKeys(app.id)}
                      variant="outlined"
                    >
                      Manage Keys
                    </Button>
                    <Button 
                      size="small" 
                      startIcon={<SettingsIcon />}
                      onClick={() => handleShowSettings(app.id)}
                    >
                      Settings
                    </Button>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDeleteApp(app.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create App Dialog */}
      <CreateStreamAppDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onAppCreated={fetchApps}
      />

      {/* App Settings Dialog */}
      {selectedAppId && (
        <StreamAppSettingsDialog
          open={settingsDialogOpen}
          onClose={() => {
            setSettingsDialogOpen(false);
            setSelectedAppId(null);
          }}
          appId={selectedAppId}
          onAppUpdated={fetchApps}
          onAppDeleted={() => {
            fetchApps();
            setSettingsDialogOpen(false);
            setSelectedAppId(null);
          }}
        />
      )}

      {/* App Keys Dialog */}
      {selectedAppId && (
        <StreamAppKeysDialog
          open={keysDialogOpen}
          onClose={() => {
            setKeysDialogOpen(false);
            setSelectedAppId(null);
          }}
          appId={selectedAppId}
        />
      )}
    </Container>
  );
};

export default StreamAppsPage;