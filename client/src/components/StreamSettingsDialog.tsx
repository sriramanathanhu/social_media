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
  Divider,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface StreamSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  streamId: string;
  onStreamUpdated: () => void;
  onStreamDeleted: () => void;
}

interface StreamData {
  id: string;
  title: string;
  description: string;
  auto_post_enabled: boolean;
  auto_post_message: string;
  is_public: boolean;
  status: string;
  stream_key: string;
  rtmp_url: string;
  created_at: string;
}

interface RepublishingTarget {
  id?: string;
  platform: string;
  streamKey: string;
  enabled: boolean;
  destination_name: string;
  destination_url: string;
}

const StreamSettingsDialog: React.FC<StreamSettingsDialogProps> = ({
  open,
  onClose,
  streamId,
  onStreamUpdated,
  onStreamDeleted,
}) => {
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [republishingTargets, setRepublishingTargets] = useState<RepublishingTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTarget, setNewTarget] = useState({
    platform: '',
    streamKey: '',
    destination_url: '',
  });

  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (open && streamId) {
      fetchStreamData();
      fetchRepublishingTargets();
    }
  }, [open, streamId]);

  const fetchStreamData = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/live/${streamId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stream data');
      }

      const data = await response.json();
      setStreamData(data.stream);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stream data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepublishingTargets = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/live/${streamId}/republishing`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch republishing targets');
      }

      const data = await response.json();
      setRepublishingTargets(data.targets || []);
    } catch (err) {
      console.error('Failed to fetch republishing targets:', err);
    }
  };

  const handleUpdateStream = async () => {
    if (!streamData) return;

    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/live/${streamId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: streamData.title,
          description: streamData.description,
          auto_post_enabled: streamData.auto_post_enabled,
          auto_post_message: streamData.auto_post_message,
          is_public: streamData.is_public,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update stream');
      }

      onStreamUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stream');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStream = async () => {
    if (!window.confirm('Are you sure you want to delete this stream? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/live/${streamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete stream');
      }

      onStreamDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete stream');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRepublishingTarget = async () => {
    if (!newTarget.platform || !newTarget.streamKey) {
      setError('Platform and stream key are required');
      return;
    }

    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/live/${streamId}/republishing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination_name: newTarget.platform,
          destination_url: newTarget.destination_url || getPlatformURL(newTarget.platform),
          destination_stream: newTarget.streamKey,
          destination_key: newTarget.streamKey,
          enabled: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add republishing target');
      }

      setNewTarget({ platform: '', streamKey: '', destination_url: '' });
      fetchRepublishingTargets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add republishing target');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRepublishingTarget = async (targetId: string) => {
    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/live/republishing/${targetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove republishing target');
      }

      fetchRepublishingTargets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove republishing target');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformURL = (platform: string): string => {
    const platformURLs: Record<string, string> = {
      'YouTube': 'rtmp://a.rtmp.youtube.com/live2',
      'Twitch': 'rtmp://live.twitch.tv/live',
      'Facebook': 'rtmps://live-api-s.facebook.com:443/rtmp',
      'Twitter': 'rtmp://ingest.pscp.tv:80/x',
      'Kick': 'rtmp://ingest.kick.com/live',
      'Rumble': 'rtmp://live.rumble.com/live',
    };
    return platformURLs[platform] || '';
  };

  if (!streamData) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Stream Settings</Typography>
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
          label="Stream Title"
          value={streamData.title}
          onChange={(e) => setStreamData({ ...streamData, title: e.target.value })}
          margin="normal"
        />

        <TextField
          fullWidth
          label="Description"
          value={streamData.description}
          onChange={(e) => setStreamData({ ...streamData, description: e.target.value })}
          margin="normal"
          multiline
          rows={3}
        />

        <FormControlLabel
          control={
            <Switch
              checked={streamData.is_public}
              onChange={(e) => setStreamData({ ...streamData, is_public: e.target.checked })}
            />
          }
          label="Public Stream"
          sx={{ mt: 2 }}
        />

        <Divider sx={{ my: 3 }} />

        {/* RTMP Information */}
        <Typography variant="h6" gutterBottom>
          RTMP Information
        </Typography>

        <TextField
          fullWidth
          label="RTMP URL"
          value={streamData.rtmp_url}
          margin="normal"
          InputProps={{ readOnly: true }}
          helperText="This URL is used for streaming with OBS or other RTMP clients"
        />

        <TextField
          fullWidth
          label="Stream Key"
          value={streamData.stream_key}
          margin="normal"
          InputProps={{ readOnly: true }}
          helperText="Keep this private - anyone with your stream key can stream to your channel"
        />

        <Divider sx={{ my: 3 }} />

        {/* Republishing Targets */}
        <Typography variant="h6" gutterBottom>
          Republishing Destinations
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Add your social media platform stream keys to automatically republish your stream
        </Typography>

        {republishingTargets.map((target) => (
          <Box key={target.id} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TextField
              label="Platform"
              value={target.destination_name}
              size="small"
              sx={{ mr: 1, minWidth: 120 }}
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Stream Key"
              value={target.streamKey}
              type="password"
              size="small"
              sx={{ flexGrow: 1, mr: 1 }}
              InputProps={{ readOnly: true }}
            />
            <IconButton
              color="error"
              onClick={() => target.id && handleRemoveRepublishingTarget(target.id)}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}

        {/* Add New Target */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Add New Destination
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TextField
              label="Platform"
              value={newTarget.platform}
              onChange={(e) => setNewTarget({ ...newTarget, platform: e.target.value })}
              size="small"
              sx={{ mr: 1, minWidth: 120 }}
              placeholder="e.g., YouTube, Twitch"
            />
            <TextField
              label="Stream Key"
              value={newTarget.streamKey}
              onChange={(e) => setNewTarget({ ...newTarget, streamKey: e.target.value })}
              size="small"
              sx={{ flexGrow: 1, mr: 1 }}
              placeholder="Paste your platform stream key"
            />
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddRepublishingTarget}
              disabled={!newTarget.platform || !newTarget.streamKey}
            >
              Add
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Auto-posting */}
        <Typography variant="h6" gutterBottom>
          Social Media Auto-posting
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={streamData.auto_post_enabled}
              onChange={(e) => setStreamData({ ...streamData, auto_post_enabled: e.target.checked })}
            />
          }
          label="Auto-post when stream goes live"
        />

        {streamData.auto_post_enabled && (
          <TextField
            fullWidth
            label="Auto-post Message"
            value={streamData.auto_post_message}
            onChange={(e) => setStreamData({ ...streamData, auto_post_message: e.target.value })}
            margin="normal"
            placeholder="🔴 Live now: Check out my stream!"
            helperText="This message will be posted to your connected social media accounts when the stream starts"
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleDeleteStream}
          color="error"
          startIcon={<DeleteIcon />}
          disabled={loading}
        >
          Delete Stream
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpdateStream}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StreamSettingsDialog;