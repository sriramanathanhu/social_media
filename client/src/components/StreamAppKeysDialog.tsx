import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Chip,
  InputAdornment,
  MenuItem,
  Collapse,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Key as KeyIcon,
  YouTube as YouTubeIcon,
  Facebook as FacebookIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface StreamAppKeysDialogProps {
  open: boolean;
  onClose: () => void;
  appId: string;
}

interface StreamKey {
  id: string;
  key_name: string;
  stream_key: string;
  description: string;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

const StreamAppKeysDialog: React.FC<StreamAppKeysDialogProps> = ({
  open,
  onClose,
  appId,
}) => {
  const [keys, setKeys] = useState<StreamKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Add form state
  const [newKey, setNewKey] = useState({
    keyName: '',
    streamKey: '',
    description: '',
    isActive: true,
  });

  // Edit form state
  const [editKey, setEditKey] = useState<Partial<StreamKey>>({});

  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (open && appId) {
      fetchKeys();
    }
  }, [open, appId]);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/stream-apps/${appId}/keys`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch keys');
      }

      const data = await response.json();
      setKeys(data.keys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch keys');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKey.keyName.trim() || !newKey.streamKey.trim()) {
      setError('Key name and stream key are required');
      return;
    }

    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/stream-apps/${appId}/keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyName: newKey.keyName.trim(),
          streamKey: newKey.streamKey.trim(),
          description: newKey.description.trim(),
          isActive: newKey.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add key');
      }

      setNewKey({ keyName: '', streamKey: '', description: '', isActive: true });
      setShowAddForm(false);
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add key');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateKey = async (keyId: string) => {
    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/stream-apps/keys/${keyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editKey),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update key');
      }

      setEditingKeyId(null);
      setEditKey({});
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update key');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to delete this stream key?')) {
      return;
    }

    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/stream-apps/keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete key');
      }

      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete key');
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const startEditing = (key: StreamKey) => {
    setEditingKeyId(key.id);
    setEditKey({
      key_name: key.key_name,
      stream_key: key.stream_key,
      description: key.description,
      is_active: key.is_active,
    });
  };

  const cancelEditing = () => {
    setEditingKeyId(null);
    setEditKey({});
  };

  const generateRandomKey = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setNewKey({ ...newKey, streamKey: result });
  };

  const addPlatformKey = (platform: string) => {
    const platformNames = {
      youtube: 'YouTube',
      twitch: 'Twitch',
      facebook: 'Facebook',
      twitter: 'Twitter/X',
      kick: 'Kick',
      rumble: 'Rumble',
    };
    setNewKey({
      ...newKey,
      keyName: platformNames[platform as keyof typeof platformNames] || platform,
      description: `Stream key for ${platformNames[platform as keyof typeof platformNames] || platform}`,
    });
    setShowAddForm(true);
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••••••' + key.substring(key.length - 4);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Manage Stream Keys</Typography>
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

        {/* Quick Add Platform Keys */}
        <Typography variant="h6" gutterBottom>
          Quick Add Platform Keys
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
          <Button size="small" onClick={() => addPlatformKey('youtube')} startIcon={<YouTubeIcon />}>
            YouTube
          </Button>
          <Button size="small" onClick={() => addPlatformKey('twitch')}>
            Twitch
          </Button>
          <Button size="small" onClick={() => addPlatformKey('facebook')} startIcon={<FacebookIcon />}>
            Facebook
          </Button>
          <Button size="small" onClick={() => addPlatformKey('twitter')}>
            Twitter/X
          </Button>
          <Button size="small" onClick={() => addPlatformKey('kick')}>
            Kick
          </Button>
          <Button size="small" onClick={() => addPlatformKey('rumble')}>
            Rumble
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Current Keys */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Current Keys ({keys.length})
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={() => setShowAddForm(!showAddForm)}
            variant="outlined"
            size="small"
          >
            Add Custom Key
          </Button>
        </Box>

        {/* Add Key Form */}
        <Collapse in={showAddForm}>
          <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Add New Stream Key
            </Typography>
            
            <TextField
              fullWidth
              label="Key Name"
              value={newKey.keyName}
              onChange={(e) => setNewKey({ ...newKey, keyName: e.target.value })}
              margin="normal"
              size="small"
              placeholder="e.g., YouTube, Twitch, Primary"
            />

            <TextField
              fullWidth
              label="Stream Key"
              value={newKey.streamKey}
              onChange={(e) => setNewKey({ ...newKey, streamKey: e.target.value })}
              margin="normal"
              size="small"
              placeholder="Paste your platform's stream key here"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button size="small" onClick={generateRandomKey}>
                      Generate
                    </Button>
                  </InputAdornment>
                )
              }}
            />

            <TextField
              fullWidth
              label="Description"
              value={newKey.description}
              onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
              margin="normal"
              size="small"
              placeholder="Optional description"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={newKey.isActive}
                  onChange={(e) => setNewKey({ ...newKey, isActive: e.target.checked })}
                />
              }
              label="Active"
              sx={{ mt: 1 }}
            />

            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                onClick={handleAddKey}
                variant="contained"
                size="small"
                disabled={loading || !newKey.keyName.trim() || !newKey.streamKey.trim()}
              >
                Add Key
              </Button>
              <Button
                onClick={() => setShowAddForm(false)}
                size="small"
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </Collapse>

        {/* Keys List */}
        {keys.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <KeyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No stream keys yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add your first stream key to start using this app
            </Typography>
          </Box>
        ) : (
          <List>
            {keys.map((key) => (
              <ListItem key={key.id} divider>
                <Box sx={{ width: '100%' }}>
                  {editingKeyId === key.id ? (
                    // Edit mode
                    <Box>
                      <TextField
                        fullWidth
                        label="Key Name"
                        value={editKey.key_name || ''}
                        onChange={(e) => setEditKey({ ...editKey, key_name: e.target.value })}
                        margin="normal"
                        size="small"
                      />
                      <TextField
                        fullWidth
                        label="Stream Key"
                        value={editKey.stream_key || ''}
                        onChange={(e) => setEditKey({ ...editKey, stream_key: e.target.value })}
                        margin="normal"
                        size="small"
                      />
                      <TextField
                        fullWidth
                        label="Description"
                        value={editKey.description || ''}
                        onChange={(e) => setEditKey({ ...editKey, description: e.target.value })}
                        margin="normal"
                        size="small"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={editKey.is_active || false}
                            onChange={(e) => setEditKey({ ...editKey, is_active: e.target.checked })}
                          />
                        }
                        label="Active"
                        sx={{ mt: 1 }}
                      />
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          onClick={() => handleUpdateKey(key.id)}
                          startIcon={<SaveIcon />}
                          size="small"
                          variant="contained"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={cancelEditing}
                          startIcon={<CancelIcon />}
                          size="small"
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    // View mode
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {key.key_name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            label={key.is_active ? 'Active' : 'Inactive'}
                            color={key.is_active ? 'success' : 'default'}
                            size="small"
                          />
                          <IconButton
                            size="small"
                            onClick={() => toggleKeyVisibility(key.id)}
                          >
                            {visibleKeys.has(key.id) ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => startEditing(key)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteKey(key.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {key.description || 'No description'}
                      </Typography>

                      <Typography variant="caption" display="block">
                        Stream Key: {visibleKeys.has(key.id) ? key.stream_key : maskKey(key.stream_key)}
                      </Typography>

                      <Typography variant="caption" display="block" color="text.secondary">
                        Used {key.usage_count} times
                        {key.last_used_at && ` • Last used: ${new Date(key.last_used_at).toLocaleDateString()}`}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StreamAppKeysDialog;