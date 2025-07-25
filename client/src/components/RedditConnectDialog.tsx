import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Reddit as RedditIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { connectReddit, fetchAccounts } from '../store/slices/accountsSlice';

interface RedditConnectDialogProps {
  open: boolean;
  onClose: () => void;
  onAccountConnected: (account: any) => void;
}

const RedditConnectDialog: React.FC<RedditConnectDialogProps> = ({
  open,
  onClose,
  onAccountConnected,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { connectingReddit, error } = useSelector((state: RootState) => state.accounts);

  const handleConnect = async () => {
    try {
      const result = await dispatch(connectReddit());
      if (result.meta.requestStatus === 'fulfilled') {
        const { authUrl } = result.payload;
        // Use redirect approach like X (Twitter)
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Failed to connect Reddit:', error);
    }
  };

  const handleClose = () => {
    if (!connectingReddit) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <RedditIcon sx={{ color: '#ff4500', fontSize: 32 }} />
          <Typography variant="h6">Connect Reddit Account</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            Connect your Reddit account to publish content to your favorite subreddits.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You'll be redirected to Reddit to authorize this application.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ mb: 3 }}>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Submit Posts"
                secondary="Create text and link posts in your joined subreddits"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Access Subreddits"
                secondary="View and select from subreddits you're a member of"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Multiple Accounts"
                secondary="Connect multiple Reddit accounts for broader reach"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <InfoIcon color="info" />
              </ListItemIcon>
              <ListItemText
                primary="Rate Limits"
                secondary="Reddit has posting limits - up to 10 posts per day for new accounts"
              />
            </ListItem>
          </List>
        </Paper>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Required Permissions:</strong>
          </Typography>
          <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2 }}>
            <li>Read your Reddit username and profile information</li>
            <li>Submit posts to subreddits on your behalf</li>
            <li>Access your subreddit memberships</li>
          </Typography>
        </Alert>

        <Alert severity="warning">
          <Typography variant="body2">
            <strong>Important:</strong> Make sure you're logged into the correct Reddit account 
            before connecting. You can connect multiple accounts by repeating this process.
          </Typography>
        </Alert>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleClose} disabled={connectingReddit}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConnect}
          disabled={connectingReddit}
          startIcon={connectingReddit ? <CircularProgress size={16} /> : <RedditIcon />}
          sx={{ bgcolor: '#ff4500', '&:hover': { bgcolor: '#e03d00' } }}
        >
          {connectingReddit ? 'Connecting...' : 'Connect to Reddit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RedditConnectDialog;