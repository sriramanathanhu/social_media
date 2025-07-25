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
  Reddit as RedditIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Launch as LaunchIcon,
  Publish as PublishIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { accountsAPI, redditAPI } from '../services/api';
import { SocialAccount } from '../types';
import RedditConnectDialog from '../components/RedditConnectDialog';
import RedditPublishDialog from '../components/RedditPublishDialog';

interface RedditAccount extends SocialAccount {
  hasValidToken: boolean;
  tokenError?: string;
}

interface Subreddit {
  id: number;
  subreddit_name: string;
  display_name: string;
  title: string;
  description: string;
  subscribers: number;
  submission_type: string;
  can_submit: boolean;
  is_moderator: boolean;
  over_18: boolean;
  flair_enabled: boolean;
  flair_list: any[];
  rules: any[];
  created_utc: number;
  last_synced: string;
}

const RedditPage: React.FC = () => {
  const [accounts, setAccounts] = useState<RedditAccount[]>([]);
  const [subreddits, setSubreddits] = useState<{ [accountId: string]: Subreddit[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<RedditAccount | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [loadingSubreddits, setLoadingSubreddits] = useState<{ [accountId: string]: boolean }>({});

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
      
      // Filter Reddit accounts only
      const redditAccounts = response.data.accounts.filter(
        (account: any) => account.platform === 'reddit'
      ) as RedditAccount[];
      
      setAccounts(redditAccounts);
      
      // Fetch subreddits for each account
      redditAccounts.forEach(account => {
        if (account.hasValidToken) {
          fetchAccountSubreddits(parseInt(account.id));
        }
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch Reddit accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountSubreddits = async (accountId: number) => {
    try {
      setLoadingSubreddits(prev => ({ ...prev, [accountId]: true }));
      const response = await redditAPI.getAccountSubreddits(accountId.toString());
      setSubreddits(prev => ({
        ...prev,
        [accountId]: response.data.subreddits || []
      }));
    } catch (err: any) {
      console.error(`Failed to fetch subreddits for account ${accountId}:`, err);
    } finally {
      setLoadingSubreddits(prev => ({ ...prev, [accountId]: false }));
    }
  };

  const handleConnectAccount = () => {
    setConnectDialogOpen(true);
  };

  const handleAccountConnected = (newAccount: RedditAccount) => {
    setAccounts(prev => [newAccount, ...prev]);
    setConnectDialogOpen(false);
    if (newAccount.hasValidToken) {
      fetchAccountSubreddits(parseInt(newAccount.id));
    }
  };

  const handlePublishToAccount = (account: RedditAccount) => {
    setSelectedAccount(account);
    setPublishDialogOpen(true);
  };

  const handleSyncSubreddits = async (account: RedditAccount) => {
    try {
      setSyncing(parseInt(account.id));
      await redditAPI.syncAccountSubreddits(account.id.toString());
      await fetchAccountSubreddits(parseInt(account.id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync subreddits');
    } finally {
      setSyncing(null);
    }
  };

  const handleDeleteAccount = async (account: RedditAccount) => {
    if (!window.confirm(`Are you sure you want to disconnect Reddit account "${account.username}"?`)) {
      return;
    }

    try {
      await accountsAPI.deleteAccount(account.id.toString());
      setAccounts(prev => prev.filter(a => a.id !== account.id));
      setSubreddits(prev => {
        const newSubreddits = { ...prev };
        delete newSubreddits[parseInt(account.id)];
        return newSubreddits;
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

  const getAccountSubredditCount = (accountId: string) => {
    return subreddits[parseInt(accountId)]?.length || 0;
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
          <RedditIcon sx={{ fontSize: 40, color: '#ff4500' }} />
          <Box>
            <Typography variant="h4" component="h1">
              Reddit Publishing
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage and publish to your Reddit accounts and subreddits
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleConnectAccount}
          sx={{ bgcolor: '#ff4500', '&:hover': { bgcolor: '#e03d00' } }}
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
            <RedditIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No Reddit Accounts Connected
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Connect your first Reddit account to start publishing content to subreddits.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleConnectAccount}
              sx={{ bgcolor: '#ff4500', '&:hover': { bgcolor: '#e03d00' } }}
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
                    <RedditIcon sx={{ color: '#ff4500', fontSize: 32 }} />
                    <Chip
                      label={account.hasValidToken ? 'Connected' : 'Error'}
                      color={account.hasValidToken ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="h6" component="h2" gutterBottom noWrap>
                    u/{account.username}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {loadingSubreddits[parseInt(account.id)] ? (
                        <CircularProgress size={14} />
                      ) : (
                        `${getAccountSubredditCount(account.id)} subreddits`
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

                  {/* Show some subreddits if available */}
                  {subreddits[parseInt(account.id)] && subreddits[parseInt(account.id)].length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Recent Subreddits:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {subreddits[parseInt(account.id)].slice(0, 3).map((subreddit) => (
                          <Chip
                            key={subreddit.id}
                            label={`r/${subreddit.subreddit_name}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        ))}
                        {subreddits[parseInt(account.id)].length > 3 && (
                          <Chip
                            label={`+${subreddits[parseInt(account.id)].length - 3} more`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
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
                    onClick={() => handlePublishToAccount(account)}
                    disabled={!account.hasValidToken}
                    sx={{ bgcolor: '#ff4500', '&:hover': { bgcolor: '#e03d00' } }}
                  >
                    Publish
                  </Button>
                  
                  <Tooltip title="Sync subreddits">
                    <IconButton
                      size="small"
                      onClick={() => handleSyncSubreddits(account)}
                      disabled={syncing === parseInt(account.id) || !account.hasValidToken}
                    >
                      {syncing === parseInt(account.id) ? (
                        <CircularProgress size={16} />
                      ) : (
                        <SyncIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Open Reddit profile">
                    <IconButton
                      size="small"
                      onClick={() => window.open(`https://reddit.com/user/${account.username}`, '_blank')}
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

      {/* Floating Action Button for Quick Publish */}
      {accounts.length > 0 && accounts.some(acc => acc.hasValidToken) && (
        <Fab
          color="primary"
          aria-label="quick publish"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            bgcolor: '#ff4500',
            '&:hover': { bgcolor: '#e03d00' }
          }}
          onClick={() => {
            const validAccount = accounts.find(acc => acc.hasValidToken);
            if (validAccount) {
              handlePublishToAccount(validAccount);
            }
          }}
        >
          <EditIcon />
        </Fab>
      )}

      {/* Dialogs */}
      <RedditConnectDialog
        open={connectDialogOpen}
        onClose={() => setConnectDialogOpen(false)}
        onAccountConnected={handleAccountConnected}
      />

      <RedditPublishDialog
        open={publishDialogOpen}
        onClose={() => setPublishDialogOpen(false)}
        account={selectedAccount}
        subreddits={selectedAccount ? subreddits[parseInt(selectedAccount.id)] || [] : []}
        onPublished={() => {
          setPublishDialogOpen(false);
          // Optionally refresh data or show success message
        }}
      />
    </Container>
  );
};

export default RedditPage;