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
} from '@mui/material';
import {
  Add as AddIcon,
  AccountCircle as MastodonIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchAccounts, deleteAccount, verifyAccount } from '../store/slices/accountsSlice';
import AccountCard from '../components/AccountCard';
import ConnectMastodonDialog from '../components/ConnectMastodonDialog';

const AccountsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { accounts, loading, error } = useSelector((state: RootState) => state.accounts);
  const { token, initialized } = useSelector((state: RootState) => state.auth);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [fabMenuAnchor, setFabMenuAnchor] = useState<null | HTMLElement>(null);

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
    setConnectDialogOpen(true);
    handleFabMenuClose();
  };

  const mastodonAccounts = accounts.filter(account => account.platform === 'mastodon');

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Toolbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Connected Accounts
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your connected social media accounts
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

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

          {/* Other Platforms (Coming Soon) */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                More Platforms Coming Soon
              </Typography>
              <Typography variant="body2" color="text.secondary">
                We're working on adding support for Twitter, Pinterest, SoundCloud, Substack, Telegram, and DeviantArt.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
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
      </Menu>

      {/* Connect Mastodon Dialog */}
      <ConnectMastodonDialog
        open={connectDialogOpen}
        onClose={() => setConnectDialogOpen(false)}
      />
      </Container>
    </Box>
  );
};

export default AccountsPage;