import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  AccountCircle as MastodonIcon,
  Twitter as XIcon,
  Pinterest as PinterestIcon,
  Group as GroupIcon,
  Cloud as BlueskyIcon,
  Reddit as RedditIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchAccounts, deleteAccount, verifyAccount } from '../store/slices/accountsSlice';
import AccountCard from '../components/AccountCard';
import ConnectMastodonDialog from '../components/ConnectMastodonDialog';
import ConnectXDialog from '../components/ConnectXDialog';
import ConnectPinterestDialog from '../components/ConnectPinterestDialog';
import ConnectBlueskyDialog from '../components/ConnectBlueskyDialog';
import ConnectRedditDialog from '../components/ConnectRedditDialog';
import AccountGroups from '../components/AccountGroups';

const AccountsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { accounts, loading, error } = useSelector((state: RootState) => state.accounts);
  const { token, initialized } = useSelector((state: RootState) => state.auth);
  const [connectMastodonDialogOpen, setConnectMastodonDialogOpen] = useState(false);
  const [connectXDialogOpen, setConnectXDialogOpen] = useState(false);
  const [connectPinterestDialogOpen, setConnectPinterestDialogOpen] = useState(false);
  const [connectBlueskyDialogOpen, setConnectBlueskyDialogOpen] = useState(false);
  const [connectRedditDialogOpen, setConnectRedditDialogOpen] = useState(false);
  const [fabMenuAnchor, setFabMenuAnchor] = useState<null | HTMLElement>(null);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    if (initialized && token) {
      dispatch(fetchAccounts());
    }
  }, [dispatch, initialized, token]);

  const handleDeleteAccount = (accountId: string) => {
    if (window.confirm('Are you sure you want to disconnect this account?')) {
      dispatch(deleteAccount(accountId));
    }
  };

  const handleVerifyAccount = (accountId: string) => {
    dispatch(verifyAccount(accountId));
  };

  const handleFabClick = (event: React.MouseEvent<HTMLElement>) => {
    setFabMenuAnchor(event.currentTarget);
  };

  const handleFabMenuClose = () => {
    setFabMenuAnchor(null);
  };

  const handleConnectMastodon = () => {
    setConnectMastodonDialogOpen(true);
    handleFabMenuClose();
  };

  const handleConnectX = () => {
    setConnectXDialogOpen(true);
    handleFabMenuClose();
  };

  const handleConnectPinterest = () => {
    setConnectPinterestDialogOpen(true);
    handleFabMenuClose();
  };

  const handleConnectBluesky = () => {
    setConnectBlueskyDialogOpen(true);
    handleFabMenuClose();
  };

  const handleConnectReddit = () => {
    setConnectRedditDialogOpen(true);
    handleFabMenuClose();
  };

  const mastodonAccounts = accounts.filter(account => account.platform === 'mastodon');
  const xAccounts = accounts.filter(account => account.platform === 'x');
  const pinterestAccounts = accounts.filter(account => account.platform === 'pinterest');
  const blueskyAccounts = accounts.filter(account => account.platform === 'bluesky');
  const redditAccounts = accounts.filter(account => account.platform === 'reddit');

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Toolbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Social Media Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your connected accounts and organize them into groups
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab label="Accounts" />
          <Tab label="Groups" />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {currentTab === 0 && (
        <>
          {loading && accounts.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Mastodon Accounts */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <MastodonIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">Mastodon Accounts</Typography>
                  </Box>
                  
                  {mastodonAccounts.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        No Mastodon accounts connected
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleConnectMastodon}
                      >
                        Connect Mastodon Account
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      {mastodonAccounts.map((account) => (
                        <AccountCard
                          key={account.id}
                          account={account}
                          onDelete={handleDeleteAccount}
                          onVerify={handleVerifyAccount}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* X (Twitter) Accounts */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <XIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">X (Twitter) Accounts</Typography>
                  </Box>
                  
                  {xAccounts.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        No X accounts connected
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleConnectX}
                      >
                        Connect X Account
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      {xAccounts.map((account) => (
                        <AccountCard
                          key={account.id}
                          account={account}
                          onDelete={handleDeleteAccount}
                          onVerify={handleVerifyAccount}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Pinterest Accounts */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PinterestIcon sx={{ mr: 1, color: '#BD081C' }} />
                    <Typography variant="h6">Pinterest Accounts</Typography>
                  </Box>
                  
                  {pinterestAccounts.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        No Pinterest accounts connected
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleConnectPinterest}
                        sx={{ borderColor: '#BD081C', color: '#BD081C', '&:hover': { borderColor: '#BD081C', backgroundColor: 'rgba(189, 8, 28, 0.04)' } }}
                      >
                        Connect Pinterest Account
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      {pinterestAccounts.map((account) => (
                        <AccountCard
                          key={account.id}
                          account={account}
                          onDelete={handleDeleteAccount}
                          onVerify={handleVerifyAccount}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Bluesky Accounts */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BlueskyIcon sx={{ mr: 1, color: '#00A8E8' }} />
                    <Typography variant="h6">Bluesky Accounts</Typography>
                  </Box>
                  
                  {blueskyAccounts.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        No Bluesky accounts connected
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleConnectBluesky}
                        sx={{ borderColor: '#00A8E8', color: '#00A8E8', '&:hover': { borderColor: '#00A8E8', backgroundColor: 'rgba(0, 168, 232, 0.04)' } }}
                      >
                        Connect Bluesky Account
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      {blueskyAccounts.map((account) => (
                        <AccountCard
                          key={account.id}
                          account={account}
                          onDelete={handleDeleteAccount}
                          onVerify={handleVerifyAccount}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Reddit Accounts */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <RedditIcon sx={{ mr: 1, color: '#ff4500' }} />
                    <Typography variant="h6">Reddit Accounts</Typography>
                  </Box>
                  
                  {redditAccounts.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        No Reddit accounts connected
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleConnectReddit}
                        sx={{ borderColor: '#ff4500', color: '#ff4500', '&:hover': { borderColor: '#ff4500', backgroundColor: 'rgba(255, 69, 0, 0.04)' } }}
                      >
                        Connect Reddit Account
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      {redditAccounts.map((account) => (
                        <AccountCard
                          key={account.id}
                          account={account}
                          onDelete={handleDeleteAccount}
                          onVerify={handleVerifyAccount}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Other Platforms (Coming Soon) */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    More Platforms Coming Soon
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    We're working on adding support for SoundCloud, Substack, Telegram, and DeviantArt.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </>
      )}

      {currentTab === 1 && (
        <AccountGroups />
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add account"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleFabClick}
      >
        <AddIcon />
      </Fab>

      {/* FAB Menu */}
      <Menu
        anchorEl={fabMenuAnchor}
        open={Boolean(fabMenuAnchor)}
        onClose={handleFabMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <MenuItem onClick={handleConnectMastodon}>
          <ListItemIcon>
            <MastodonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Connect Mastodon</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleConnectX}>
          <ListItemIcon>
            <XIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Connect X (Twitter)</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleConnectPinterest}>
          <ListItemIcon>
            <PinterestIcon fontSize="small" sx={{ color: '#BD081C' }} />
          </ListItemIcon>
          <ListItemText>Connect Pinterest</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleConnectBluesky}>
          <ListItemIcon>
            <BlueskyIcon fontSize="small" sx={{ color: '#00A8E8' }} />
          </ListItemIcon>
          <ListItemText>Connect Bluesky</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleConnectReddit}>
          <ListItemIcon>
            <RedditIcon fontSize="small" sx={{ color: '#ff4500' }} />
          </ListItemIcon>
          <ListItemText>Connect Reddit</ListItemText>
        </MenuItem>
      </Menu>

      {/* Connect Mastodon Dialog */}
      <ConnectMastodonDialog
        open={connectMastodonDialogOpen}
        onClose={() => setConnectMastodonDialogOpen(false)}
      />

      {/* Connect X Dialog */}
      <ConnectXDialog
        open={connectXDialogOpen}
        onClose={() => setConnectXDialogOpen(false)}
      />

      {/* Connect Pinterest Dialog */}
      <ConnectPinterestDialog
        open={connectPinterestDialogOpen}
        onClose={() => setConnectPinterestDialogOpen(false)}
      />

      {/* Connect Bluesky Dialog */}
      <ConnectBlueskyDialog
        open={connectBlueskyDialogOpen}
        onClose={() => setConnectBlueskyDialogOpen(false)}
      />

      {/* Connect Reddit Dialog */}
      <ConnectRedditDialog
        open={connectRedditDialogOpen}
        onClose={() => setConnectRedditDialogOpen(false)}
        onAccountConnected={() => {
          setConnectRedditDialogOpen(false);
          dispatch(fetchAccounts());
        }}
      />
      </Container>
    </Box>
  );
};

export default AccountsPage;