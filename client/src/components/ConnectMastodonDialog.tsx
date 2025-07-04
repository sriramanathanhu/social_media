import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { connectMastodon } from '../store/slices/accountsSlice';

interface ConnectMastodonDialogProps {
  open: boolean;
  onClose: () => void;
}

const ConnectMastodonDialog: React.FC<ConnectMastodonDialogProps> = ({
  open,
  onClose,
}) => {
  const [instanceUrl, setInstanceUrl] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const { connectingMastodon, error } = useSelector((state: RootState) => state.accounts);

  const handleConnect = async () => {
    if (!instanceUrl.trim()) return;

    try {
      const result = await dispatch(connectMastodon(instanceUrl.trim()));
      if (result.meta.requestStatus === 'fulfilled') {
        const { authUrl } = result.payload;
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Failed to connect Mastodon:', error);
    }
  };

  const handleClose = () => {
    if (!connectingMastodon) {
      setInstanceUrl('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Connect Mastodon Account</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the URL of your Mastodon instance (e.g., mastodon.social, mastodon.online)
          </Typography>
          <TextField
            fullWidth
            label="Instance URL"
            value={instanceUrl}
            onChange={(e) => setInstanceUrl(e.target.value)}
            placeholder="mastodon.social"
            disabled={connectingMastodon}
            error={!!error}
            helperText={error}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={connectingMastodon}>
          Cancel
        </Button>
        <Button
          onClick={handleConnect}
          variant="contained"
          disabled={!instanceUrl.trim() || connectingMastodon}
          startIcon={connectingMastodon ? <CircularProgress size={20} /> : null}
        >
          {connectingMastodon ? 'Connecting...' : 'Connect'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConnectMastodonDialog;