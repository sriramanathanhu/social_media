import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Paper,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface StreamRTMPInfoProps {
  open: boolean;
  onClose: () => void;
  streamId: string;
}

interface RTMPInfo {
  server: string;
  stream_key: string;
  full_url: string;
  obs_settings: {
    server: string;
    stream_key: string;
  };
}

const StreamRTMPInfo: React.FC<StreamRTMPInfoProps> = ({
  open,
  onClose,
  streamId,
}) => {
  const [rtmpInfo, setRtmpInfo] = useState<RTMPInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (open && streamId) {
      fetchRTMPInfo();
    }
  }, [open, streamId]);

  const fetchRTMPInfo = async () => {
    if (!streamId) return;

    setLoading(true);
    setError(null);

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/live/${streamId}/rtmp-info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch RTMP information');
      }

      const data = await response.json();
      setRtmpInfo(data.rtmp_info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch RTMP info');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const maskStreamKey = (key: string) => {
    if (!key) return '';
    if (showStreamKey) return key;
    return key.slice(0, 8) + '••••••••••••••••' + key.slice(-4);
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Typography>Loading RTMP information...</Typography>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !rtmpInfo) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Alert severity="error">
            {error || 'No RTMP information available'}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          RTMP Streaming Information
          <Chip label="OBS Ready" color="primary" size="small" />
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {copySuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {copySuccess} copied to clipboard!
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* OBS Studio Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom color="primary">
                📺 OBS Studio Settings
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Server URL:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    fullWidth
                    value={rtmpInfo.obs_settings.server}
                    InputProps={{ readOnly: true }}
                    size="small"
                  />
                  <Tooltip title="Copy Server URL">
                    <IconButton 
                      onClick={() => copyToClipboard(rtmpInfo.obs_settings.server, 'Server URL')}
                      color="primary"
                    >
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Stream Key:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    fullWidth
                    value={maskStreamKey(rtmpInfo.obs_settings.stream_key)}
                    InputProps={{ readOnly: true }}
                    size="small"
                    type={showStreamKey ? 'text' : 'password'}
                  />
                  <Tooltip title={showStreamKey ? 'Hide Stream Key' : 'Show Stream Key'}>
                    <IconButton 
                      onClick={() => setShowStreamKey(!showStreamKey)}
                      color="primary"
                    >
                      {showStreamKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Copy Stream Key">
                    <IconButton 
                      onClick={() => copyToClipboard(rtmpInfo.obs_settings.stream_key, 'Stream Key')}
                      color="primary"
                    >
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>OBS Setup Instructions:</strong><br />
                  1. Open OBS Studio<br />
                  2. Go to Settings → Stream<br />
                  3. Select "Custom..." as Service<br />
                  4. Copy the Server URL and Stream Key above<br />
                  5. Click "OK" and start streaming!
                </Typography>
              </Alert>
            </Paper>
          </Grid>

          {/* Technical Details */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              🔧 Technical Details
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Full RTMP URL:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  fullWidth
                  value={rtmpInfo.full_url}
                  InputProps={{ readOnly: true }}
                  size="small"
                />
                <Tooltip title="Copy Full URL">
                  <IconButton 
                    onClick={() => copyToClipboard(rtmpInfo.full_url, 'Full RTMP URL')}
                    color="primary"
                  >
                    <CopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Nimble Streamer:
              </Typography>
              <Typography variant="body2" color="text.primary">
                Server: {rtmpInfo.server.replace('rtmp://', '').replace('/live', '')}<br />
                Protocol: RTMP<br />
                Application: live
              </Typography>
            </Box>
          </Grid>

          {/* Streaming Guidelines */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
              <Typography variant="h6" gutterBottom color="warning.dark">
                🎯 Streaming Guidelines
              </Typography>
              
              <Typography variant="body2" color="text.primary">
                • <strong>Resolution:</strong> 1920x1080 (1080p) recommended<br />
                • <strong>Bitrate:</strong> 3000-6000 kbps for 1080p<br />
                • <strong>Frame Rate:</strong> 30 FPS (or 60 FPS for gaming)<br />
                • <strong>Audio:</strong> 128-320 kbps<br />
                • <strong>Encoder:</strong> x264 or hardware encoder (NVENC/AMF)<br />
                • <strong>Keyframe Interval:</strong> 2 seconds<br />
              </Typography>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Security Note:</strong> Keep your stream key private! 
                  Anyone with your stream key can stream to your channel.
                </Typography>
              </Alert>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Got it!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StreamRTMPInfo;