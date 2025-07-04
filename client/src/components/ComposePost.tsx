import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchAccounts } from '../store/slices/accountsSlice';
import { createPost } from '../store/slices/postsSlice';

const ComposePost: React.FC = () => {
  const [content, setContent] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const dispatch = useDispatch<AppDispatch>();
  const { accounts, loading: accountsLoading } = useSelector((state: RootState) => state.accounts);
  const { publishing, error } = useSelector((state: RootState) => state.posts);

  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

  const activeAccounts = accounts.filter(account => account.status === 'active');
  const mastodonAccounts = activeAccounts.filter(account => account.platform === 'mastodon');

  const handleAccountChange = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || selectedAccounts.length === 0) return;

    const result = await dispatch(createPost({
      content: content.trim(),
      targetAccountIds: selectedAccounts
    }));

    if (result.meta.requestStatus === 'fulfilled') {
      setContent('');
      setSelectedAccounts([]);
    }
  };

  const getCharacterCount = () => {
    return content.length;
  };

  const getCharacterLimit = () => {
    return 5000;
  };

  const isOverLimit = getCharacterCount() > getCharacterLimit();

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Compose Post
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          placeholder="What's happening?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          sx={{ mb: 2 }}
          error={isOverLimit}
          helperText={
            isOverLimit
              ? `Character limit exceeded (${getCharacterCount()}/${getCharacterLimit()})`
              : `${getCharacterCount()}/${getCharacterLimit()}`
          }
        />

        {activeAccounts.length > 0 && (
          <FormControl sx={{ mb: 2 }} component="fieldset">
            <FormLabel component="legend">Select Accounts</FormLabel>
            <FormGroup>
              {mastodonAccounts.map((account) => (
                <FormControlLabel
                  key={account.id}
                  control={
                    <Checkbox
                      checked={selectedAccounts.includes(account.id)}
                      onChange={() => handleAccountChange(account.id)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        src={account.avatar}
                        alt={account.displayName || account.username}
                        sx={{ width: 24, height: 24, mr: 1 }}
                      >
                        {(account.displayName || account.username).charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">
                          {account.displayName || account.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          @{account.username}
                        </Typography>
                      </Box>
                      <Chip
                        label="Mastodon"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </FormControl>
        )}

        {activeAccounts.length === 0 && !accountsLoading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No active accounts available. Please connect an account first.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={publishing ? <CircularProgress size={20} /> : <SendIcon />}
            disabled={
              !content.trim() || 
              selectedAccounts.length === 0 || 
              publishing || 
              isOverLimit ||
              activeAccounts.length === 0
            }
          >
            {publishing ? 'Publishing...' : 'Publish'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default ComposePost;