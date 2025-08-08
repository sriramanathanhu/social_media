import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Box,
  Alert,
  CircularProgress,
  Fab,
  Dialog,
  Chip,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Event as EventIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Launch as LaunchIcon,
  Publish as PublishIcon,
  EventAvailable as EventAvailableIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { accountsAPI } from '../services/api';
import { SocialAccount } from '../types';
import EventbriteConnectDialog from '../components/EventbriteConnectDialog';
import EventbriteCreateDialog from '../components/EventbriteCreateDialog';

interface EventbriteAccount extends SocialAccount {
  hasValidToken: boolean;
  tokenError?: string;
  eventbriteUserId?: string;
  eventbriteOrganizationId?: string;
  eventbriteEmail?: string;
  eventbriteName?: string;
}

interface EventbriteEvent {
  id: number;
  eventbrite_event_id: string;
  name: string;
  description?: string;
  start_datetime?: string;
  end_datetime?: string;
  url?: string;
  status: string;
  is_free: boolean;
  capacity?: number;
  online_event: boolean;
  listed: boolean;
  created_at: string;
  published_at?: string;
}

const EventbritePage: React.FC = () => {
  const [accounts, setAccounts] = useState<EventbriteAccount[]>([]);
  const [events, setEvents] = useState<{ [accountId: string]: EventbriteEvent[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<EventbriteAccount | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [loadingEvents, setLoadingEvents] = useState<{ [accountId: string]: boolean }>({});

  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (token) {
      fetchAccounts();
    }
  }, [token]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountsAPI.getAccounts();
      
      // Filter Eventbrite accounts only
      const eventbriteAccounts = response.data.accounts.filter(
        (account: any) => account.platform === 'eventbrite'
      ) as EventbriteAccount[];
      
      setAccounts(eventbriteAccounts);
      
      // Fetch events for each account
      eventbriteAccounts.forEach(account => {
        if (account.hasValidToken) {
          fetchAccountEvents(parseInt(account.id));
        }
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch Eventbrite accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountEvents = async (accountId: number) => {
    try {
      setLoadingEvents(prev => ({ ...prev, [accountId]: true }));
      const response = await fetch(`/api/eventbrite/accounts/${accountId}/events`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(prev => ({
          ...prev,
          [accountId]: data.events || []
        }));
      }
    } catch (err: any) {
      console.error(`Failed to fetch events for account ${accountId}:`, err);
    } finally {
      setLoadingEvents(prev => ({ ...prev, [accountId]: false }));
    }
  };

  const handleConnectAccount = () => {
    setConnectDialogOpen(true);
  };

  const handleAccountConnected = (newAccount: EventbriteAccount) => {
    setAccounts(prev => [newAccount, ...prev]);
    setConnectDialogOpen(false);
    if (newAccount.hasValidToken) {
      fetchAccountEvents(parseInt(newAccount.id));
    }
  };

  const handleCreateEvent = (account: EventbriteAccount) => {
    setSelectedAccount(account);
    setCreateDialogOpen(true);
  };

  const handleSyncEvents = async (account: EventbriteAccount) => {
    try {
      setSyncing(parseInt(account.id));
      const response = await fetch(`/api/eventbrite/accounts/${account.id}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await fetchAccountEvents(parseInt(account.id));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to sync events');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync events');
    } finally {
      setSyncing(null);
    }
  };

  const handleDeleteAccount = async (account: EventbriteAccount) => {
    if (!window.confirm(`Are you sure you want to disconnect Eventbrite account "${account.username}"?`)) {
      return;
    }

    try {
      await accountsAPI.deleteAccount(account.id.toString());
      setAccounts(prev => prev.filter(a => a.id !== account.id));
      setEvents(prev => {
        const newEvents = { ...prev };
        delete newEvents[parseInt(account.id)];
        return newEvents;
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disconnect account');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAccountEventCount = (accountId: string) => {
    return events[parseInt(accountId)]?.length || 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'success';
      case 'draft':
        return 'warning';
      case 'ended':
        return 'info';
      case 'canceled':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 12, pt: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 12, pt: 6, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <EventIcon sx={{ fontSize: 40, color: '#ff6600' }} />
          <Box>
            <Typography variant="h4" component="h1">
              Eventbrite Events
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create and manage events across your Eventbrite accounts
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleConnectAccount}
          sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e55a00' } }}
        >
          Connect Account
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <EventIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No Eventbrite Accounts Connected
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Connect your first Eventbrite account to start creating and managing events.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleConnectAccount}
              sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e55a00' } }}
            >
              Connect Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {accounts.map((account) => (
            <Grid item xs={12} md={6} lg={4} key={account.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <EventIcon sx={{ color: '#ff6600', fontSize: 32 }} />
                    <Chip
                      label={account.hasValidToken ? 'Connected' : 'Error'}
                      color={account.hasValidToken ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="h6" component="h2" gutterBottom noWrap>
                    {account.displayName || account.username}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {account.eventbriteEmail || account.username}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <EventAvailableIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {loadingEvents[parseInt(account.id)] ? (
                        <CircularProgress size={14} />
                      ) : (
                        `${getAccountEventCount(account.id)} events`
                      )}
                    </Typography>
                  </Box>
                  
                  <Typography variant="caption" display="block" color="text.secondary">
                    Connected: {formatDate(account.createdAt)}
                  </Typography>
                  
                  {account.lastUsed && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      Last used: {formatDate(account.lastUsed)}
                    </Typography>
                  )}

                  {!account.hasValidToken && account.tokenError && (
                    <Alert severity="error" sx={{ mt: 1, fontSize: '0.75rem' }}>
                      {account.tokenError}
                    </Alert>
                  )}

                  {/* Show some recent events if available */}
                  {events[parseInt(account.id)] && events[parseInt(account.id)].length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Recent Events:
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {events[parseInt(account.id)].slice(0, 2).map((event) => (
                          <Box key={event.id} sx={{ mb: 0.5 }}>
                            <Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>
                              {event.name}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Chip
                                label={event.status}
                                size="small"
                                color={getStatusColor(event.status)}
                                sx={{ fontSize: '0.6rem', height: 18 }}
                              />
                              {event.is_free && (
                                <Chip
                                  label="FREE"
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.6rem', height: 18 }}
                                />
                              )}
                              {event.online_event && (
                                <Chip
                                  label="ONLINE"
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.6rem', height: 18 }}
                                />
                              )}
                            </Box>
                          </Box>
                        ))}
                        {events[parseInt(account.id)].length > 2 && (
                          <Typography variant="caption" color="text.secondary">
                            +{events[parseInt(account.id)].length - 2} more events
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                </CardContent>
                
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => handleCreateEvent(account)}
                    disabled={!account.hasValidToken}
                    sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e55a00' } }}
                  >
                    Create Event
                  </Button>
                  
                  <Tooltip title="Sync events">
                    <IconButton
                      size="small"
                      onClick={() => handleSyncEvents(account)}
                      disabled={syncing === parseInt(account.id) || !account.hasValidToken}
                    >
                      {syncing === parseInt(account.id) ? (
                        <CircularProgress size={16} />
                      ) : (
                        <SyncIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Open Eventbrite profile">
                    <IconButton
                      size="small"
                      onClick={() => window.open(`https://www.eventbrite.com/o/${account.eventbriteOrganizationId}`, '_blank')}
                    >
                      <LaunchIcon />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Disconnect account">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteAccount(account)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Floating Action Button for Quick Create */}
      {accounts.length > 0 && accounts.some(acc => acc.hasValidToken) && (
        <Fab
          color="primary"
          aria-label="create event"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            bgcolor: '#ff6600',
            '&:hover': { bgcolor: '#e55a00' }
          }}
          onClick={() => {
            const validAccount = accounts.find(acc => acc.hasValidToken);
            if (validAccount) {
              handleCreateEvent(validAccount);
            }
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Dialogs */}
      <EventbriteConnectDialog
        open={connectDialogOpen}
        onClose={() => setConnectDialogOpen(false)}
        onAccountConnected={handleAccountConnected}
      />

      <EventbriteCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        account={selectedAccount}
        onEventCreated={() => {
          setCreateDialogOpen(false);
          if (selectedAccount) {
            fetchAccountEvents(parseInt(selectedAccount.id));
          }
        }}
      />
    </Container>
  );
};

export default EventbritePage;