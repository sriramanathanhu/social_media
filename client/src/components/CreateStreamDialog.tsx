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
  qualitySettings: {
    resolution: string;
    bitrate: number;
    framerate: number;
    audio_bitrate: number;
  };
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
    qualitySettings: {
      resolution: '1920x1080',
      bitrate: 4000,
      framerate: 30,
      audio_bitrate: 128,
    },
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
      const response = await fetch('/api/accounts', {
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
      const response = await fetch('/api/live', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
      qualitySettings: {
        resolution: '1920x1080',
        bitrate: 4000,
        framerate: 30,
        audio_bitrate: 128,
      },
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