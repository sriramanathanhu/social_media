import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Alert,
  Grid,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface NimbleStatusData {
  isMonitoring: boolean;
  nimbleStatsURL: string;
  intervalMs: number | null;
}

interface NimbleConfig {
  SyncResponse?: {
    RtmpSettings?: any;
    RtmpPublishSettings?: {
      settings: any[];
    };
    pub_count?: number;
  };
}

const NimbleStatus: React.FC = () => {
  const [status, setStatus] = useState<NimbleStatusData | null>(null);
  const [config, setConfig] = useState<NimbleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    nimbleHost: 'localhost',
    nimblePort: 1935,
    statsPort: 8082,
    monitoringEnabled: false,
    monitoringInterval: 30,
  });

  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    fetchNimbleStatus();
    fetchNimbleConfig();
    
    // Refresh status every 30 seconds
    const interval = setInterval(() => {
      fetchNimbleStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchNimbleStatus = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/live/nimble/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Nimble status');
      }

      const data = await response.json();
      setStatus(data.status);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  const fetchNimbleConfig = async () => {
    setConfigLoading(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/live/nimble/config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Nimble config');
      }

      const data = await response.json();
      setConfig(data.config);
    } catch (err: unknown) {
      console.error('Failed to fetch Nimble config:', err);
    } finally {
      setConfigLoading(false);
    }
  };

  const updateNimbleConfig = async () => {
    setUpdateLoading(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/live/nimble/config/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to update Nimble config');
      }

      await fetchNimbleConfig();
    } catch (err: unknown) {
      console.error('Failed to update Nimble config:', err);
    } finally {
      setUpdateLoading(false);
    }
  };

  const getStatusColor = () => {
    if (error) return 'error';
    if (!status) return 'warning';
    if (status.isMonitoring) return 'success';
    return 'warning';
  };

  const getStatusIcon = () => {
    if (error) return <ErrorIcon />;
    if (!status) return <Warning />;
    if (status.isMonitoring) return <CheckCircle />;
    return <Warning />;
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (!status) return 'Unknown';
    if (status.isMonitoring) return 'Active';
    return 'Inactive';
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinearProgress sx={{ flexGrow: 1 }} />
            <Typography variant="body2">Loading Nimble status...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              🎥 Nimble Streamer Status
              <Chip
                icon={getStatusIcon()}
                label={getStatusText()}
                color={getStatusColor()}
                size="small"
              />
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh Status">
                <IconButton onClick={fetchNimbleStatus} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Configuration Settings">
                <IconButton onClick={() => setConfigDialogOpen(true)}>
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {status && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Monitoring Status
                </Typography>
                <Typography variant="body1">
                  {status.isMonitoring ? 'Active' : 'Inactive'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Stats URL
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {status.nimbleStatsURL}
                </Typography>
              </Grid>

              {status.intervalMs && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Monitoring Interval
                  </Typography>
                  <Typography variant="body1">
                    {Math.round(status.intervalMs / 1000)}s
                  </Typography>
                </Grid>
              )}

              {config && config.SyncResponse && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Active Republishing
                  </Typography>
                  <Typography variant="body1">
                    {config.SyncResponse.pub_count || 0} destinations
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}

          {config && config.SyncResponse && config.SyncResponse.RtmpPublishSettings && 
           config.SyncResponse.RtmpPublishSettings.settings.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Active Republishing Destinations
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {config.SyncResponse.RtmpPublishSettings.settings.map((setting: any, index: number) => (
                  <Chip
                    key={index}
                    label={`${setting.src_stream} → ${setting.dest_addr}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {updateLoading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Updating Nimble configuration...
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={fetchNimbleConfig}
              disabled={configLoading}
            >
              Refresh Config
            </Button>
            
            <Button
              variant="contained"
              size="small"
              onClick={updateNimbleConfig}
              disabled={updateLoading}
            >
              Sync Config
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Nimble Streamer Configuration</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure your Nimble Streamer connection settings. These settings control how the system connects to and monitors your Nimble server.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nimble Host"
                value={configForm.nimbleHost}
                onChange={(e) => setConfigForm({ ...configForm, nimbleHost: e.target.value })}
                helperText="IP address or hostname of Nimble server"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="RTMP Port"
                value={configForm.nimblePort}
                onChange={(e) => setConfigForm({ ...configForm, nimblePort: parseInt(e.target.value) || 1935 })}
                helperText="RTMP streaming port (default: 1935)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Stats Port"
                value={configForm.statsPort}
                onChange={(e) => setConfigForm({ ...configForm, statsPort: parseInt(e.target.value) || 8082 })}
                helperText="Nimble stats API port (default: 8082)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Monitoring Interval (seconds)"
                value={configForm.monitoringInterval}
                onChange={(e) => setConfigForm({ ...configForm, monitoringInterval: parseInt(e.target.value) || 30 })}
                helperText="How often to check server status"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={configForm.monitoringEnabled}
                    onChange={(e) => setConfigForm({ ...configForm, monitoringEnabled: e.target.checked })}
                  />
                }
                label="Enable Real-time Monitoring"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Automatically monitor Nimble server status and stream health in real-time
              </Typography>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Note:</strong> Make sure Nimble Streamer is installed and running on the specified host. 
              The stats API should be enabled in Nimble configuration for monitoring to work properly.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setConfigDialogOpen(false)}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            console.log('Saving Nimble config:', configForm);
            // Here you would typically make an API call to save the configuration
            setConfigDialogOpen(false);
            updateNimbleConfig();
          }}
          disabled={updateLoading}
        >
          Save Configuration
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default NimbleStatus;