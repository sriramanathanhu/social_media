import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  FormLabel,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Alert,
  IconButton,
  Divider,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface StreamAppSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  appId: string;
  onAppUpdated: () => void;
  onAppDeleted: () => void;
}

interface StreamAppData {
  id: string;
  app_name: string;
  description: string;
  rtmp_app_path: string;
  default_stream_key: string;
  status: string;
  settings: any;
  key_count: number;
  active_key_count: number;
  created_at: string;
  updated_at: string;
}

const StreamAppSettingsDialog: React.FC<StreamAppSettingsDialogProps> = ({
  open,
  onClose,
  appId,
  onAppUpdated,
  onAppDeleted,
}) => {
  const [appData, setAppData] = useState<StreamAppData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (open && appId) {
      fetchAppData();
    }
  }, [open, appId]);

  const fetchAppData = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/stream-apps/${appId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch app data');
      }

      const data = await response.json();
      setAppData(data.app);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch app data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateApp = async () => {
    if (!appData) return;

    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/stream-apps/${appId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appName: appData.app_name,
          description: appData.description,
          rtmpAppPath: appData.rtmp_app_path,
          defaultStreamKey: appData.default_stream_key,
          status: appData.status,
          settings: appData.settings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update app');
      }

      onAppUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update app');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApp = async () => {
    if (!window.confirm('Are you sure you want to delete this app? This action cannot be undone and will affect all associated streams.')) {
      return;
    }

    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
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

      onAppDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete app');
    } finally {
      setLoading(false);
    }
  };

  if (!appData) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">App Settings: {appData.app_name}</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Basic Settings */}
        <Typography variant="h6" gutterBottom>
          Basic Information
        </Typography>
        
        <TextField
          fullWidth
          label="App Name"
          value={appData.app_name}
          onChange={(e) => setAppData({ ...appData, app_name: e.target.value })}
          margin="normal"
          required
        />

        <TextField
          fullWidth
          label="Description"
          value={appData.description || ''}
          onChange={(e) => setAppData({ ...appData, description: e.target.value })}
          margin="normal"
          multiline
          rows={2}
        />

        <TextField
          fullWidth
          label="RTMP App Path"
          value={appData.rtmp_app_path}
          onChange={(e) => setAppData({ ...appData, rtmp_app_path: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
          margin="normal"
          required
          helperText="Changing this will affect your RTMP URL"
        />

        <FormControl fullWidth margin="normal">
          <TextField
            select
            label="Status"
            value={appData.status}
            onChange={(e) => setAppData({ ...appData, status: e.target.value })}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </FormControl>

        <Divider sx={{ my: 3 }} />

        {/* RTMP Information */}
        <Typography variant="h6" gutterBottom>
          RTMP Information
        </Typography>

        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
          <Typography variant="body2">
            Use this information in OBS Studio or other streaming software
          </Typography>
        </Alert>

        <TextField
          fullWidth
          label="RTMP URL"
          value={`rtmp://37.27.201.26:1935/${appData.rtmp_app_path}`}
          margin="normal"
          InputProps={{ readOnly: true }}
          helperText="Use this URL as your 'Server' in OBS"
        />

        <TextField
          fullWidth
          label="Default Stream Key"
          value={appData.default_stream_key || 'No default key set'}
          margin="normal"
          InputProps={{ readOnly: true }}
          helperText="Use any of your app's stream keys here"
        />

        <Divider sx={{ my: 3 }} />

        {/* Statistics */}
        <Typography variant="h6" gutterBottom>
          Statistics
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Chip 
            label={`${appData.key_count} Total Keys`} 
            variant="outlined" 
          />
          <Chip 
            label={`${appData.active_key_count} Active Keys`} 
            color={appData.active_key_count > 0 ? 'primary' : 'default'}
            variant="outlined" 
          />
        </Box>

        <Typography variant="body2" color="text.secondary">
          Created: {new Date(appData.created_at).toLocaleString()}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Last Updated: {new Date(appData.updated_at).toLocaleString()}
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Danger Zone */}
        <Typography variant="h6" gutterBottom color="error">
          Danger Zone
        </Typography>

        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Deleting this app will remove all associated stream keys and may affect active streams.
          </Typography>
        </Alert>

        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDeleteApp}
          disabled={loading}
        >
          Delete App
        </Button>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpdateApp}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StreamAppSettingsDialog;