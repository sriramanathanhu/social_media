import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Event as EventIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface EventbriteConnectDialogProps {
  open: boolean;
  onClose: () => void;
  onAccountConnected: (account: any) => void;
}

const EventbriteConnectDialog: React.FC<EventbriteConnectDialogProps> = ({
  open,
  onClose,
  onAccountConnected,
}) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { token } = useSelector((state: RootState) => state.auth);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      const response = await fetch('/api/auth/eventbrite/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect to Eventbrite');
      }

      const data = await response.json();
      
      // Redirect to Eventbrite OAuth
      window.location.href = data.authUrl;
    } catch (err: any) {
      console.error('Eventbrite connection error:', err);
      setError(err.message || 'Failed to connect to Eventbrite');
      setConnecting(false);
    }
  };

  const handleClose = () => {
    if (!connecting) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <EventIcon sx={{ color: '#ff6600', fontSize: 32 }} />
          <Typography variant="h6">Connect Eventbrite Account</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <DialogContentText sx={{ mb: 3 }}>
          Connect your Eventbrite account to create and manage events directly from your social media scheduler.
        </DialogContentText>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#ff6600' }}>
            What you can do with Eventbrite integration:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Create Events" 
                secondary="Create new events with full details and settings"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Manage Tickets" 
                secondary="Add ticket classes and pricing options"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Publish Events" 
                secondary="Publish draft events to make them live"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Cross-Platform Promotion" 
                secondary="Share event links across all your social media platforms"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Event Management" 
                secondary="View and sync your existing events"
              />
            </ListItem>
          </List>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            You'll be redirected to Eventbrite to authorize this application. 
            Make sure you have an Eventbrite account and are logged in.
          </Typography>
        </Alert>

        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <InfoIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
            This integration allows you to create and manage events, but you'll still need to 
            handle attendee communication and event marketing through Eventbrite's platform.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} disabled={connecting}>
          Cancel
        </Button>
        <Button
          onClick={handleConnect}
          variant="contained"
          disabled={connecting}
          sx={{
            bgcolor: '#ff6600',
            '&:hover': { bgcolor: '#e55a00' },
            minWidth: 120
          }}
          startIcon={connecting ? <CircularProgress size={20} /> : <EventIcon />}
        >
          {connecting ? 'Connecting...' : 'Connect to Eventbrite'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventbriteConnectDialog;