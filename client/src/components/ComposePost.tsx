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
  IconButton,
  Stack,
} from '@mui/material';
import { 
  Send as SendIcon, 
  Image as ImageIcon, 
  Close as CloseIcon 
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchAccounts } from '../store/slices/accountsSlice';
import { createPost } from '../store/slices/postsSlice';

const ComposePost: React.FC = () => {
  const [content, setContent] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const dispatch = useDispatch<AppDispatch>();
  const { accounts, loading: accountsLoading } = useSelector((state: RootState) => state.accounts);
  const { publishing, error } = useSelector((state: RootState) => state.posts);

  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

  const activeAccounts = accounts.filter(account => account.status === 'active');
  const supportedAccounts = activeAccounts.filter(account => 
    account.platform === 'mastodon' || account.platform === 'x'
  );

  const handleAccountChange = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      setSelectedImages(prev => [...prev, ...files].slice(0, 4)); // Limit to 4 images
    }
  };

  const handleImageRemove = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || selectedAccounts.length === 0) return;

    const result = await dispatch(createPost({
      content: content.trim(),
      targetAccountIds: selectedAccounts,
      mediaFiles: selectedImages
    }));

    if (result.meta.requestStatus === 'fulfilled') {
      setContent('');
      setSelectedAccounts([]);
      setSelectedImages([]);
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

        {/* Image Upload Section */}
        <Box sx={{ mb: 2 }}>
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="image-upload"
            multiple
            type="file"
            onChange={handleImageSelect}
          />
          <label htmlFor="image-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<ImageIcon />}
              disabled={selectedImages.length >= 4}
              sx={{ mb: 1 }}
            >
              Add Images ({selectedImages.length}/4)
            </Button>
          </label>

          {selectedImages.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
              {selectedImages.map((file, index) => (
                <Box
                  key={index}
                  sx={{
                    position: 'relative',
                    width: 80,
                    height: 80,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    mb: 1
                  }}
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleImageRemove(index)}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(0,0,0,0.8)'
                      }
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {activeAccounts.length > 0 && (
          <FormControl sx={{ mb: 2 }} component="fieldset">
            <FormLabel component="legend">Select Accounts</FormLabel>
            <FormGroup>
              {supportedAccounts.map((account) => (
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
                        label={account.platform === 'mastodon' ? 'Mastodon' : 'X'}
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