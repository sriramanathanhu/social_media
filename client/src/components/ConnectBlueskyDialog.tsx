import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  TextField,
  Alert,
  Link,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { connectBluesky, clearError } from '../store/slices/accountsSlice';

interface ConnectBlueskyDialogProps {
  open: boolean;
  onClose: () => void;
}

const ConnectBlueskyDialog: React.FC<ConnectBlueskyDialogProps> = ({
  open,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { connectingBluesky, error } = useSelector((state: RootState) => state.accounts);
  const [handle, setHandle] = useState('');
  const [appPassword, setAppPassword] = useState('');

  // Clear error when dialog opens
  useEffect(() => {
    if (open) {
      dispatch(clearError());
    }
  }, [open, dispatch]);

  const handleConnect = async () => {
    if (!handle.trim() || !appPassword.trim()) {
      return;
    }

    try {
      const result = await dispatch(connectBluesky({ handle: handle.trim(), appPassword: appPassword.trim() }));
      if (result.meta.requestStatus === 'fulfilled') {
        // Account connected successfully
        onClose();
        setHandle('');
        setAppPassword('');
        // Optionally refresh accounts list
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to connect Bluesky:', error);
    }
  };

  const handleClose = () => {
    if (!connectingBluesky) {
      dispatch(clearError());
      onClose();
      setHandle('');
      setAppPassword('');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Connect Bluesky Account</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Connect your Bluesky account to schedule and publish posts to your timeline.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              You'll need to generate an <strong>App Password</strong> from your Bluesky settings. 
              Go to Settings → Privacy & Security → App Passwords → Add App Password.
            </Typography>
          </Alert>

          <TextField
            fullWidth
            label="Bluesky Handle"
            placeholder="yourname.bsky.social"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            sx={{ mb: 2 }}
            helperText="Your full Bluesky handle (e.g., yourname.bsky.social)"
          />

          <TextField
            fullWidth
            label="App Password"
            type="password"
            placeholder="xxxx-xxxx-xxxx-xxxx"
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            sx={{ mb: 2 }}
            helperText="Generate this from your Bluesky Settings → Privacy & Security → App Passwords"
          />

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Need help? <Link href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener">
              Create an App Password on Bluesky
            </Link>
          </Typography>

          {error && (
            <Typography variant="body2" color="error" sx={{ mb: 2 }}>
              Error: {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={connectingBluesky}>
          Cancel
        </Button>
        <Button
          onClick={handleConnect}
          variant="contained"
          disabled={connectingBluesky || !handle.trim() || !appPassword.trim()}
          startIcon={connectingBluesky ? <CircularProgress size={20} /> : null}
        >
          {connectingBluesky ? 'Connecting...' : 'Connect Bluesky'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConnectBlueskyDialog;