import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  Chip,
  Alert,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { connectInstagram } from '../store/slices/accountsSlice';

interface ConnectInstagramDialogProps {
  open: boolean;
  onClose: () => void;
}

interface InstagramAccount {
  id: string;
  username: string;
  name: string;
  followers_count: number;
  account_type: string;
  page_id: string;
  page_name: string;
}

const ConnectInstagramDialog: React.FC<ConnectInstagramDialogProps> = ({
  open,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { accounts, connectingInstagram, error } = useSelector((state: RootState) => state.accounts);
  
  const [selectedFacebookAccount, setSelectedFacebookAccount] = useState<string>('');
  const [availableInstagramAccounts, setAvailableInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [selectedInstagramAccount, setSelectedInstagramAccount] = useState<string>('');
  const [loadingInstagramAccounts, setLoadingInstagramAccounts] = useState(false);
  const [step, setStep] = useState<'select-facebook' | 'select-instagram'>('select-facebook');

  // Filter Facebook accounts
  const facebookAccounts = accounts.filter(account => account.platform === 'facebook' && account.status === 'active');

  useEffect(() => {
    if (open && facebookAccounts.length === 1) {
      // Auto-select if only one Facebook account
      setSelectedFacebookAccount(facebookAccounts[0].id.toString());
    }
  }, [open, facebookAccounts]);

  const handleFacebookAccountChange = async (accountId: string) => {
    setSelectedFacebookAccount(accountId);
    setSelectedInstagramAccount('');
    setAvailableInstagramAccounts([]);
    
    if (accountId) {
      setLoadingInstagramAccounts(true);
      try {
        // Call API to get Instagram accounts for this Facebook account
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/auth/instagram/connect`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ facebookAccountId: accountId }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch Instagram accounts');
        }

        const data = await response.json();
        setAvailableInstagramAccounts(data.instagramAccounts || []);
        setStep('select-instagram');
      } catch (error) {
        console.error('Failed to fetch Instagram accounts:', error);
      } finally {
        setLoadingInstagramAccounts(false);
      }
    }
  };

  const handleConnect = async () => {
    if (!selectedFacebookAccount || !selectedInstagramAccount) {
      return;
    }

    try {
      const result = await dispatch(connectInstagram({
        facebookAccountId: selectedFacebookAccount,
        instagramAccountId: selectedInstagramAccount,
      }));
      
      if (result.meta.requestStatus === 'fulfilled') {
        handleClose();
      }
    } catch (error) {
      console.error('Failed to connect Instagram:', error);
    }
  };

  const handleClose = () => {
    if (!connectingInstagram && !loadingInstagramAccounts) {
      setStep('select-facebook');
      setSelectedFacebookAccount('');
      setSelectedInstagramAccount('');
      setAvailableInstagramAccounts([]);
      onClose();
    }
  };

  const handleBack = () => {
    setStep('select-facebook');
    setSelectedInstagramAccount('');
    setAvailableInstagramAccounts([]);
  };

  if (facebookAccounts.length === 0) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Connect Instagram Account</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 2 }}>
            You need to connect a Facebook account first. Instagram Business accounts are connected through Facebook Pages.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Please connect your Facebook account first, then return here to connect your Instagram Business account.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Connect Instagram Business Account</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {step === 'select-facebook' && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Instagram Business accounts are connected through Facebook Pages. Select your Facebook account to see available Instagram accounts.
              </Typography>
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Facebook Account</InputLabel>
                <Select
                  value={selectedFacebookAccount}
                  onChange={(e) => handleFacebookAccountChange(e.target.value)}
                  label="Facebook Account"
                  disabled={loadingInstagramAccounts}
                >
                  {facebookAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id.toString()}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24 }}>
                          {account.displayName?.charAt(0) || 'F'}
                        </Avatar>
                        {account.displayName || account.username}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {loadingInstagramAccounts && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    Loading Instagram accounts...
                  </Typography>
                </Box>
              )}
            </>
          )}

          {step === 'select-instagram' && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select the Instagram Business account you want to connect:
              </Typography>
              
              {availableInstagramAccounts.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No Instagram Business accounts found for this Facebook account. Make sure you have:
                  <ul>
                    <li>Connected an Instagram Business account to your Facebook Page</li>
                    <li>Switched your Instagram account to Business or Creator mode</li>
                  </ul>
                </Alert>
              ) : (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Instagram Business Account</InputLabel>
                  <Select
                    value={selectedInstagramAccount}
                    onChange={(e) => setSelectedInstagramAccount(e.target.value)}
                    label="Instagram Business Account"
                  >
                    {availableInstagramAccounts.map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            @
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={500}>
                              @{account.username}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {account.name} • {account.followers_count?.toLocaleString()} followers
                            </Typography>
                            <br />
                            <Chip 
                              label={account.account_type} 
                              size="small" 
                              variant="outlined"
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </>
          )}

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {step === 'select-instagram' && (
          <Button onClick={handleBack} disabled={connectingInstagram}>
            Back
          </Button>
        )}
        <Button onClick={handleClose} disabled={connectingInstagram || loadingInstagramAccounts}>
          Cancel
        </Button>
        {step === 'select-instagram' && availableInstagramAccounts.length > 0 && (
          <Button
            onClick={handleConnect}
            variant="contained"
            disabled={!selectedInstagramAccount || connectingInstagram}
            startIcon={connectingInstagram ? <CircularProgress size={20} /> : null}
            sx={{ 
              background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)',
              '&:hover': { 
                background: 'linear-gradient(45deg, #E1741F, #C91F6B, #6B2A9E, #4149C4)' 
              }
            }}
          >
            {connectingInstagram ? 'Connecting...' : 'Connect Instagram'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ConnectInstagramDialog;