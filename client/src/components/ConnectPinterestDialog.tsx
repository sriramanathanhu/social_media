import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { connectPinterest } from '../store/slices/accountsSlice';

interface ConnectPinterestDialogProps {
  open: boolean;
  onClose: () => void;
}

const ConnectPinterestDialog: React.FC<ConnectPinterestDialogProps> = ({
  open,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { connectingPinterest, error } = useSelector((state: RootState) => state.accounts);

  const handleConnect = async () => {
    try {
      const result = await dispatch(connectPinterest());
      if (result.meta.requestStatus === 'fulfilled') {
        const { authUrl, success } = result.payload;
        
        // If direct access token is used (no authUrl), the account is already connected
        if (success && !authUrl) {
          // Account connected successfully with direct access token
          onClose();
          // Optionally refresh accounts list
          window.location.reload();
        } else if (authUrl) {
          // OAuth flow - redirect to Pinterest
          window.location.href = authUrl;
        }
      }
    } catch (error) {
      console.error('Failed to connect Pinterest:', error);
    }
  };

  const handleClose = () => {
    if (!connectingPinterest) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Connect Pinterest Account</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Connect your Pinterest account to schedule and publish pins to your boards.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You'll be redirected to Pinterest to authorize access to your account.
          </Typography>
          {error && (
            <Typography variant="body2" color="error" sx={{ mb: 2 }}>
              Error: {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={connectingPinterest}>
          Cancel
        </Button>
        <Button
          onClick={handleConnect}
          variant="contained"
          disabled={connectingPinterest}
          startIcon={connectingPinterest ? <CircularProgress size={20} /> : null}
        >
          {connectingPinterest ? 'Connecting...' : 'Connect Pinterest'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConnectPinterestDialog;