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
  Alert,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Divider,
  Card,
  CardContent,
  RadioGroup,
  Radio,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Apps as AppsIcon,
  Key as KeyIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface CreateStreamDialogV2Props {
  open: boolean;
  onClose: () => void;
  onStreamCreated: () => void;
}

interface StreamApp {
  id: string;
  app_name: string;
  description?: string;
  rtmp_app_path: string;
  status: string;
  key_count: number;
  active_key_count: number;
}

interface StreamAppKey {
  id: string;
  key_name: string;
  stream_key: string;
  description: string;
  is_active: boolean;
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  isActive: boolean;
}

const steps = ['Choose App', 'Stream Details', 'Auto-posting'];

const CreateStreamDialogV2: React.FC<CreateStreamDialogV2Props> = ({
  open,
  onClose,
  onStreamCreated,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [apps, setApps] = useState<StreamApp[]>([]);
  const [appKeys, setAppKeys] = useState<StreamAppKey[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [autoPostEnabled, setAutoPostEnabled] = useState(false);
  const [autoPostAccounts, setAutoPostAccounts] = useState<string[]>([]);
  const [autoPostMessage, setAutoPostMessage] = useState('');

  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (open) {
      fetchApps();
      fetchAccounts();
    }
  }, [open, token]);

  useEffect(() => {
    if (selectedAppId) {
      fetchAppKeys(selectedAppId);
    }
  }, [selectedAppId]);

  const fetchApps = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
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
      console.error('Failed to fetch apps:', err);
    }
  };

  const fetchAppKeys = async (appId: string) => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/stream-apps/${appId}/keys`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch app keys');
      }

      const data = await response.json();
      setAppKeys(data.keys || []);
    } catch (err) {
      console.error('Failed to fetch app keys:', err);
    }
  };

  const fetchAccounts = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
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
    if (!selectedAppId || !selectedKeyId || !title.trim()) {
      setError('Please complete all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/live`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          app_id: selectedAppId,
          app_key_id: selectedKeyId,
          isPublic,
          autoPostEnabled,
          autoPostAccounts,
          autoPostMessage: autoPostMessage.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create stream');
      }

      onStreamCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create stream');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setSelectedAppId('');
    setSelectedKeyId('');
    setTitle('');
    setDescription('');
    setIsPublic(true);
    setAutoPostEnabled(false);
    setAutoPostAccounts([]);
    setAutoPostMessage('');
    setError(null);
    onClose();
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const getSelectedApp = () => {
    return apps.find(app => app.id === selectedAppId);
  };

  const getSelectedKey = () => {
    return appKeys.find(key => key.id === selectedKeyId);
  };

  const canProceedFromStep = (step: number) => {
    switch (step) {
      case 0:
        return selectedAppId && selectedKeyId;
      case 1:
        return title.trim();
      case 2:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose Your Streaming App
            </Typography>
            
            {apps.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  No streaming apps found. Create a streaming app first to configure your RTMP endpoints and keys.
                </Typography>
              </Alert>
            ) : (
              <>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Select App</InputLabel>
                  <Select
                    value={selectedAppId}
                    onChange={(e) => {
                      setSelectedAppId(e.target.value);
                      setSelectedKeyId(''); // Reset key selection
                    }}
                    label="Select App"
                  >
                    {apps.filter(app => app.status === 'active').map((app) => (
                      <MenuItem key={app.id} value={app.id}>
                        <Box>
                          <Typography variant="body1">{app.app_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            /{app.rtmp_app_path} • {app.active_key_count} active keys
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedAppId && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Choose Stream Key
                    </Typography>
                    
                    {appKeys.filter(key => key.is_active).length === 0 ? (
                      <Alert severity="warning">
                        <Typography variant="body2">
                          No active keys found for this app. Please add some keys first.
                        </Typography>
                      </Alert>
                    ) : (
                      <FormControl component="fieldset">
                        <RadioGroup
                          value={selectedKeyId}
                          onChange={(e) => setSelectedKeyId(e.target.value)}
                        >
                          {appKeys.filter(key => key.is_active).map((key) => (
                            <FormControlLabel
                              key={key.id}
                              value={key.id}
                              control={<Radio />}
                              label={
                                <Box>
                                  <Typography variant="body2">{key.key_name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {key.description || 'No description'}
                                  </Typography>
                                </Box>
                              }
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    )}

                    {selectedAppId && selectedKeyId && (
                      <Card sx={{ mt: 2 }}>
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>
                            <InfoIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                            Your RTMP Configuration
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Server:</strong> rtmp://37.27.201.26:1935/{getSelectedApp()?.rtmp_app_path}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Stream Key:</strong> {getSelectedKey()?.key_name} (Use in OBS)
                          </Typography>
                        </CardContent>
                      </Card>
                    )}
                  </Box>
                )}
              </>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Stream Details
            </Typography>

            <TextField
              fullWidth
              label="Stream Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              margin="normal"
              required
              placeholder="Enter a descriptive title for your stream"
            />

            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
              multiline
              rows={3}
              placeholder="Optional description of your stream content"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
              }
              label="Public Stream"
              sx={{ mt: 2 }}
            />
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Auto-posting Settings
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={autoPostEnabled}
                  onChange={(e) => setAutoPostEnabled(e.target.checked)}
                />
              }
              label="Auto-post when stream goes live"
              sx={{ mb: 2 }}
            />

            {autoPostEnabled && (
              <>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Select Accounts</InputLabel>
                  <Select
                    multiple
                    value={autoPostAccounts}
                    onChange={(e) => setAutoPostAccounts(e.target.value as string[])}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const account = accounts.find(acc => acc.id === value);
                          return (
                            <Chip
                              key={value}
                              label={account ? `${account.platform}: ${account.username}` : value}
                              size="small"
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {accounts.filter(acc => acc.isActive).map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.platform}: {account.username}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Auto-post Message"
                  value={autoPostMessage}
                  onChange={(e) => setAutoPostMessage(e.target.value)}
                  margin="normal"
                  placeholder="🔴 Live now! Check out my stream"
                  helperText="This message will be posted to your selected accounts when the stream starts"
                />
              </>
            )}
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Create New Stream</Typography>
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

        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          sx={{ mr: 1 }}
        >
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !canProceedFromStep(activeStep)}
          >
            {loading ? 'Creating...' : 'Create Stream'}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={!canProceedFromStep(activeStep)}
          >
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateStreamDialogV2;