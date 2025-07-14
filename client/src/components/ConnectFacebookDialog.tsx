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
import { connectFacebook } from '../store/slices/accountsSlice';

interface ConnectFacebookDialogProps {
  open: boolean;
  onClose: () => void;
}

const ConnectFacebookDialog: React.FC<ConnectFacebookDialogProps> = ({
  open,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { connectingFacebook, error } = useSelector((state: RootState) => state.accounts);

  const handleConnect = async () => {
    try {
      const result = await dispatch(connectFacebook());
      if (result.meta.requestStatus === 'fulfilled') {
        const { authUrl } = result.payload;
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Failed to connect Facebook:', error);
    }
  };

  const handleClose = () => {
    if (!connectingFacebook) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Connect Facebook Account</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Connect your Facebook account to manage and post to your Facebook Pages.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You'll be redirected to Facebook to authorize this application. Once authorized, you'll be able to:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              Post to your Facebook Pages
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Share text, images, and videos
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Schedule posts to your Pages
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Connect associated Instagram Business accounts
            </Typography>
          </Box>
          <Typography variant="body2" color="text.primary" sx={{ mt: 2, fontWeight: 500 }}>
            Note: This will connect your Facebook Pages, not your personal profile.
          </Typography>
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={connectingFacebook}>
          Cancel
        </Button>
        <Button
          onClick={handleConnect}
          variant="contained"
          disabled={connectingFacebook}
          startIcon={connectingFacebook ? <CircularProgress size={20} /> : null}
          sx={{ 
            backgroundColor: '#1877F2', 
            '&:hover': { backgroundColor: '#166FE5' }
          }}
        >
          {connectingFacebook ? 'Connecting...' : 'Connect Facebook'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConnectFacebookDialog;