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
  Select,
  MenuItem,
  InputLabel,
  Chip,
  Box,
  Typography,
  Grid,
  Alert,
  Autocomplete,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  isActive: boolean;
}

interface CreateStreamDialogProps {
  open: boolean;
  onClose: () => void;
  onStreamCreated: () => void;
}

interface StreamFormData {
  title: string;
  description: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  autoPostEnabled: boolean;
  autoPostAccounts: string[];
  autoPostMessage: string;
  sourceType: 'rtmp_pull' | 'rtmp_push' | 'local_camera';
  sourceUrl?: string;
  sourceApp?: string;
  sourceStream?: string;
  qualitySettings: {
    resolution: string;
    bitrate: number;
    framerate: number;
    audio_bitrate: number;
  };
  republishingTargets: Array<{
    platform: string;
    streamKey: string;
    enabled: boolean;
  }>;
}

const CreateStreamDialog: React.FC<CreateStreamDialogProps> = ({
  open,
  onClose,
  onStreamCreated,
}) => {
  const [formData, setFormData] = useState<StreamFormData>({
    title: '',
    description: '',
    category: '',
    tags: [],
    isPublic: true,
    autoPostEnabled: false,
    autoPostAccounts: [],
    autoPostMessage: '',
    sourceType: 'rtmp_push',
    sourceUrl: '',
    sourceApp: 'live',
    sourceStream: '',
    qualitySettings: {
      resolution: '1920x1080',
      bitrate: 4000,
      framerate: 30,
      audio_bitrate: 128,
    },
    republishingTargets: [],
  });

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (open) {
      fetchAccounts();
    }
  }, [open, token]);

  const fetchAccounts = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }

      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Stream title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/live`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          // Ensure republishing targets are properly formatted for the backend
          republishingTargets: formData.republishingTargets.filter(target => 
            target.enabled && target.streamKey.trim()
          )
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create stream');
      }

      const data = await response.json();
      console.log('Stream created successfully:', data);
      
      onStreamCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create stream');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      tags: [],
      isPublic: true,
      autoPostEnabled: false,
      autoPostAccounts: [],
      autoPostMessage: '',
      sourceType: 'rtmp_push',
      sourceUrl: '',
      sourceApp: 'live',
      sourceStream: '',
      qualitySettings: {
        resolution: '1920x1080',
        bitrate: 4000,
        framerate: 30,
        audio_bitrate: 128,
      },
      republishingTargets: [],
    });
    setError(null);
    setTagInput('');
    onClose();
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddRepublishingTarget = (platform: string) => {
    if (!formData.republishingTargets.find(target => target.platform === platform)) {
      setFormData(prev => ({
        ...prev,
        republishingTargets: [...prev.republishingTargets, {
          platform,
          streamKey: '',
          enabled: true
        }]
      }));
    }
  };

  const handleUpdateRepublishingTarget = (platform: string, field: 'streamKey' | 'enabled', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      republishingTargets: prev.republishingTargets.map(target =>
        target.platform === platform ? { ...target, [field]: value } : target
      )
    }));
  };

  const handleRemoveRepublishingTarget = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      republishingTargets: prev.republishingTargets.filter(target => target.platform !== platform)
    }));
  };

  const qualityPresets = [
    { label: '1080p (Recommended)', resolution: '1920x1080', bitrate: 4000, framerate: 30 },
    { label: '720p', resolution: '1280x720', bitrate: 2500, framerate: 30 },
    { label: '480p', resolution: '854x480', bitrate: 1000, framerate: 30 },
    { label: 'Custom', resolution: 'custom', bitrate: 0, framerate: 0 },
  ];

  const categories = [
    'Gaming',
    'Just Chatting',
    'Music',
    'Art',
    'Technology',
    'Education',
    'Sports',
    'Cooking',
    'Travel',
    'Other',
  ];

  const availablePlatforms = [
    { id: 'youtube', name: 'YouTube Live', url: 'rtmp://a.rtmp.youtube.com/live2' },
    { id: 'twitch', name: 'Twitch', url: 'rtmp://live.twitch.tv/live' },
    { id: 'facebook', name: 'Facebook Live', url: 'rtmps://live-api-s.facebook.com:443/rtmp' },
    { id: 'twitter', name: 'Twitter/X Live', url: 'rtmp://ingest.pscp.tv:80/x' },
    { id: 'linkedin', name: 'LinkedIn Live', url: 'rtmps://live-api.linkedin.com/v1/broadcasts' },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>Create New Live Stream</DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Stream Title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              placeholder="Enter your stream title"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what your stream is about"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                />
              }
              label="Public Stream"
            />
          </Grid>

          {/* Tags */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              {formData.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Add tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button onClick={handleAddTag} disabled={!tagInput.trim()}>
                Add
              </Button>
            </Box>
          </Grid>

          {/* Stream Source Configuration */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Stream Source Configuration
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Source Type</InputLabel>
              <Select
                value={formData.sourceType}
                onChange={(e) => setFormData(prev => ({ ...prev, sourceType: e.target.value as any }))}
                label="Source Type"
              >
                <MenuItem value="rtmp_push">RTMP Push (Receive Stream)</MenuItem>
                <MenuItem value="rtmp_pull">RTMP Pull (Pull from URL)</MenuItem>
                <MenuItem value="local_camera">Local Camera/OBS</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Source App"
              value={formData.sourceApp}
              onChange={(e) => setFormData(prev => ({ ...prev, sourceApp: e.target.value }))}
              placeholder="live"
              helperText="RTMP application name (e.g., 'live', 'stream')"
            />
          </Grid>

          {formData.sourceType === 'rtmp_pull' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Source RTMP URL"
                value={formData.sourceUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
                placeholder="rtmp://source-server.com/live/streamkey"
                helperText="Enter the RTMP URL to pull the stream from"
              />
            </Grid>
          )}

          {formData.sourceType === 'rtmp_push' && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>RTMP Push URL:</strong> rtmp://your-server.com/{formData.sourceApp || 'live'}
                  <br />
                  <strong>Stream Key:</strong> Will be generated after creating the stream
                  <br />
                  Use this information in your streaming software (OBS, Streamlabs, etc.)
                </Typography>
              </Alert>
            </Grid>
          )}

          {formData.sourceType === 'local_camera' && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  Local camera streaming requires additional setup and browser permissions.
                  This feature is primarily for testing purposes.
                </Typography>
              </Alert>
            </Grid>
          )}

          {/* Republishing Destinations */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Republishing Destinations
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Configure which platforms you want to stream to simultaneously
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {availablePlatforms.map((platform) => (
                <Button
                  key={platform.id}
                  size="small"
                  variant={formData.republishingTargets.find(t => t.platform === platform.id) ? "contained" : "outlined"}
                  onClick={() => {
                    if (formData.republishingTargets.find(t => t.platform === platform.id)) {
                      handleRemoveRepublishingTarget(platform.id);
                    } else {
                      handleAddRepublishingTarget(platform.id);
                    }
                  }}
                >
                  {platform.name}
                </Button>
              ))}
            </Box>

            {formData.republishingTargets.map((target) => {
              const platform = availablePlatforms.find(p => p.id === target.platform);
              return (
                <Box key={target.platform} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2">{platform?.name}</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={target.enabled}
                          onChange={(e) => handleUpdateRepublishingTarget(target.platform, 'enabled', e.target.checked)}
                          size="small"
                        />
                      }
                      label="Enabled"
                    />
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    label="Stream Key"
                    value={target.streamKey}
                    onChange={(e) => handleUpdateRepublishingTarget(target.platform, 'streamKey', e.target.value)}
                    placeholder={`Enter ${platform?.name} stream key`}
                    type="password"
                    helperText={`Get your stream key from ${platform?.name} dashboard`}
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    RTMP URL: {platform?.url}
                  </Typography>
                </Box>
              );
            })}
          </Grid>

          {/* Quality Settings */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Quality Settings
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Quality Preset</InputLabel>
              <Select
                value={formData.qualitySettings.resolution}
                onChange={(e) => {
                  const preset = qualityPresets.find(p => p.resolution === e.target.value);
                  if (preset && preset.resolution !== 'custom') {
                    setFormData(prev => ({
                      ...prev,
                      qualitySettings: {
                        ...prev.qualitySettings,
                        resolution: preset.resolution,
                        bitrate: preset.bitrate,
                        framerate: preset.framerate,
                      }
                    }));
                  }
                }}
                label="Quality Preset"
              >
                {qualityPresets.map((preset) => (
                  <MenuItem key={preset.label} value={preset.resolution}>
                    {preset.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Video Bitrate (kbps)"
              type="number"
              value={formData.qualitySettings.bitrate}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                qualitySettings: {
                  ...prev.qualitySettings,
                  bitrate: parseInt(e.target.value) || 0
                }
              }))}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Frame Rate (fps)"
              type="number"
              value={formData.qualitySettings.framerate}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                qualitySettings: {
                  ...prev.qualitySettings,
                  framerate: parseInt(e.target.value) || 0
                }
              }))}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Audio Bitrate (kbps)"
              type="number"
              value={formData.qualitySettings.audio_bitrate}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                qualitySettings: {
                  ...prev.qualitySettings,
                  audio_bitrate: parseInt(e.target.value) || 0
                }
              }))}
            />
          </Grid>

          {/* Social Media Integration */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Social Media Integration
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.autoPostEnabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoPostEnabled: e.target.checked }))}
                />
              }
              label="Auto-post when stream goes live"
            />
          </Grid>

          {formData.autoPostEnabled && (
            <>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={accounts.filter(acc => acc.isActive)}
                  getOptionLabel={(option) => `${option.platform} - ${option.username}`}
                  value={accounts.filter(acc => formData.autoPostAccounts.includes(acc.id))}
                  onChange={(event, newValue) => {
                    setFormData(prev => ({
                      ...prev,
                      autoPostAccounts: newValue.map(acc => acc.id)
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Accounts for Auto-posting"
                      placeholder="Choose social media accounts"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={`${option.platform} - ${option.username}`}
                        {...getTagProps({ index })}
                        key={option.id}
                      />
                    ))
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Auto-post Message"
                  value={formData.autoPostMessage}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoPostMessage: e.target.value }))}
                  placeholder="🔴 Live now: {title}"
                  helperText="Use {title} to include the stream title in your message"
                />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.title.trim()}
        >
          {loading ? 'Creating...' : 'Create Stream'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateStreamDialog;