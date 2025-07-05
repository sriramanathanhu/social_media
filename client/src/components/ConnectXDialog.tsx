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
import { connectX } from '../store/slices/accountsSlice';

interface ConnectXDialogProps {
  open: boolean;
  onClose: () => void;
}

const ConnectXDialog: React.FC<ConnectXDialogProps> = ({
  open,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { connectingX, error } = useSelector((state: RootState) => state.accounts);

  const handleConnect = async () => {
    try {
      const result = await dispatch(connectX());
      if (result.meta.requestStatus === 'fulfilled') {
        const { authUrl } = result.payload;
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Failed to connect X:', error);
    }
  };

  const handleClose = () => {
    if (!connectingX) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Connect X (Twitter) Account</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Connect your X (formerly Twitter) account to post tweets and manage your presence on X.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You'll be redirected to X to authorize this application. Once authorized, you'll be able to:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              Post tweets with text and media
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Schedule posts to your timeline
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Manage multiple X accounts
            </Typography>
          </Box>
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={connectingX}>
          Cancel
        </Button>
        <Button
          onClick={handleConnect}
          variant="contained"
          disabled={connectingX}
          startIcon={connectingX ? <CircularProgress size={20} /> : null}
        >
          {connectingX ? 'Connecting...' : 'Connect X Account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConnectXDialog;