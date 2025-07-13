import React, { useState } from 'react';
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
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface CreateStreamAppDialogProps {
  open: boolean;
  onClose: () => void;
  onAppCreated: () => void;
}

const CreateStreamAppDialog: React.FC<CreateStreamAppDialogProps> = ({
  open,
  onClose,
  onAppCreated,
}) => {
  const [appName, setAppName] = useState('');
  const [description, setDescription] = useState('');
  const [rtmpAppPath, setRtmpAppPath] = useState('');
  const [defaultStreamKey, setDefaultStreamKey] = useState('');
  const [createPrimaryKey, setCreatePrimaryKey] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { token } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async () => {
    if (!appName.trim() || !rtmpAppPath.trim()) {
      setError('App name and RTMP path are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/stream-apps`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appName: appName.trim(),
          description: description.trim(),
          rtmpAppPath: rtmpAppPath.trim(),
          defaultStreamKey: createPrimaryKey ? defaultStreamKey.trim() : undefined,
          settings: {}
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create app');
      }

      onAppCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create app');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAppName('');
    setDescription('');
    setRtmpAppPath('');
    setDefaultStreamKey('');
    setCreatePrimaryKey(true);
    setError(null);
    onClose();
  };

  const generateRandomKey = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setDefaultStreamKey(result);
  };

  const handleAppNameChange = (value: string) => {
    setAppName(value);
    // Auto-generate RTMP path based on app name
    if (!rtmpAppPath || rtmpAppPath === appName.toLowerCase().replace(/[^a-z0-9]/g, '')) {
      setRtmpAppPath(value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Create New Streaming App</Typography>
          <IconButton onClick={handleClose}>
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

        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>What are Stream Apps?</strong><br />
            Apps let you create custom RTMP endpoints with multiple stream keys. 
            Use one OBS instance to stream to your app, then republish to multiple platforms automatically.
          </Typography>
        </Alert>

        {/* Basic App Information */}
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          App Information
        </Typography>

        <TextField
          fullWidth
          label="App Name"
          value={appName}
          onChange={(e) => handleAppNameChange(e.target.value)}
          margin="normal"
          required
          placeholder="e.g., My Live Stream, Gaming Stream, Podcast"
          helperText="A friendly name for your streaming app"
        />

        <TextField
          fullWidth
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          margin="normal"
          multiline
          rows={2}
          placeholder="Optional description of what this app is used for"
        />

        <TextField
          fullWidth
          label="RTMP App Path"
          value={rtmpAppPath}
          onChange={(e) => setRtmpAppPath(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
          margin="normal"
          required
          placeholder="e.g., live, stream, broadcast"
          helperText="This creates the RTMP URL: rtmp://37.27.201.26:1935/[your-path]"
          InputProps={{
            startAdornment: <Typography variant="body2" color="text.secondary">rtmp://37.27.201.26:1935/</Typography>
          }}
        />

        <Divider sx={{ my: 3 }} />

        {/* Stream Key Configuration */}
        <Typography variant="h6" gutterBottom>
          Initial Stream Key
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={createPrimaryKey}
              onChange={(e) => setCreatePrimaryKey(e.target.checked)}
            />
          }
          label="Create a primary stream key now"
          sx={{ mb: 2 }}
        />

        {createPrimaryKey && (
          <Box>
            <TextField
              fullWidth
              label="Primary Stream Key"
              value={defaultStreamKey}
              onChange={(e) => setDefaultStreamKey(e.target.value)}
              margin="normal"
              placeholder="Enter your stream key or generate a random one"
              helperText="You can add more keys later, including keys from social media platforms"
              InputProps={{
                endAdornment: (
                  <Button size="small" onClick={generateRandomKey}>
                    Generate
                  </Button>
                )
              }}
            />
            
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Keep your stream keys secure!</strong><br />
                Anyone with your stream key can stream to your app. You can add platform-specific keys later.
              </Typography>
            </Alert>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* How it Works */}
        <Typography variant="h6" gutterBottom>
          How it Works
        </Typography>
        
        <Box sx={{ pl: 2 }}>
          <Typography variant="body2" gutterBottom>
            1. <strong>Create your app</strong> - This creates a custom RTMP endpoint
          </Typography>
          <Typography variant="body2" gutterBottom>
            2. <strong>Add stream keys</strong> - Add keys from YouTube, Twitch, etc.
          </Typography>
          <Typography variant="body2" gutterBottom>
            3. <strong>Configure OBS</strong> - Point OBS to your app's RTMP URL
          </Typography>
          <Typography variant="body2" gutterBottom>
            4. <strong>Stream once, reach everywhere</strong> - Your stream automatically republishes to all platforms
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !appName.trim() || !rtmpAppPath.trim()}
        >
          {loading ? 'Creating...' : 'Create App'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateStreamAppDialog;