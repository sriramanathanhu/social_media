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
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import { 
  Send as SendIcon, 
  Image as ImageIcon, 
  Close as CloseIcon,
  SelectAll as SelectAllIcon,
  Clear as DeselectAllIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchAccounts } from '../store/slices/accountsSlice';
import { createPost } from '../store/slices/postsSlice';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`platform-tabpanel-${index}`}
      aria-labelledby={`platform-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `platform-tab-${index}`,
    'aria-controls': `platform-tabpanel-${index}`,
  };
}

const ComposePost: React.FC = () => {
  const [content, setContent] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const dispatch = useDispatch<AppDispatch>();
  const { accounts, loading: accountsLoading } = useSelector((state: RootState) => state.accounts);
  const { publishing, error } = useSelector((state: RootState) => state.posts);

  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

  const activeAccounts = accounts.filter(account => account.status === 'active');
  const mastodonAccounts = activeAccounts.filter(account => account.platform === 'mastodon');
  const xAccounts = activeAccounts.filter(account => account.platform === 'x');
  const allSupportedAccounts = [...mastodonAccounts, ...xAccounts];

  const platforms = [
    { name: 'All', accounts: allSupportedAccounts, count: allSupportedAccounts.length },
    { name: 'Mastodon', accounts: mastodonAccounts, count: mastodonAccounts.length },
    { name: 'X', accounts: xAccounts, count: xAccounts.length }
  ];

  const currentPlatformAccounts = platforms[tabValue]?.accounts || [];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAccountChange = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSelectAll = () => {
    const currentAccountIds = currentPlatformAccounts.map(account => account.id);
    const allSelected = currentAccountIds.every(id => selectedAccounts.includes(id));
    
    if (allSelected) {
      // Deselect all current platform accounts
      setSelectedAccounts(prev => prev.filter(id => !currentAccountIds.includes(id)));
    } else {
      // Select all current platform accounts
      setSelectedAccounts(prev => {
        const newIds = currentAccountIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      });
    }
  };

  const areAllCurrentSelected = currentPlatformAccounts.length > 0 && 
    currentPlatformAccounts.every(account => selectedAccounts.includes(account.id));

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
    // If specific platforms are selected, use the most restrictive limit
    const selectedPlatforms = selectedAccounts.map(id => {
      const account = allSupportedAccounts.find(acc => acc.id === id);
      return account?.platform;
    }).filter(Boolean);

    if (selectedPlatforms.length === 0) {
      return 5000; // Default when no accounts selected
    }

    // Platform-specific limits
    const platformLimits: Record<string, number> = {
      'mastodon': 500,
      'x': 280,
      'twitter': 280  // legacy support
    };

    // Use the most restrictive limit among selected platforms
    const limits = selectedPlatforms.map(platform => platformLimits[platform as string] || 5000);
    return Math.min(...limits);
  };

  const getPlatformLimitInfo = () => {
    const selectedPlatforms = selectedAccounts.map(id => {
      const account = allSupportedAccounts.find(acc => acc.id === id);
      return account?.platform;
    }).filter(Boolean);

    if (selectedPlatforms.length === 0) {
      return 'Select accounts to see character limits';
    }

    const uniquePlatforms = Array.from(new Set(selectedPlatforms.filter(Boolean)));
    const platformLimits: Record<string, number> = {
      'mastodon': 500,
      'x': 280,
      'twitter': 280
    };

    const limitTexts = uniquePlatforms.map(platform => {
      if (!platform) return '';
      const limit = platformLimits[platform] || 5000;
      const platformName = platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1);
      return `${platformName}: ${limit}`;
    }).filter(Boolean);

    return `Character limits: ${limitTexts.join(', ')}`;
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
              : `${getCharacterCount()}/${getCharacterLimit()} - ${getPlatformLimitInfo()}`
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
          <Box sx={{ mb: 2 }}>
            <FormLabel component="legend" sx={{ mb: 1 }}>Select Accounts</FormLabel>
            
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="platform tabs">
              {platforms.map((platform, index) => (
                <Tab 
                  key={platform.name}
                  label={`${platform.name} (${platform.count})`}
                  {...a11yProps(index)}
                  disabled={platform.count === 0}
                />
              ))}
            </Tabs>

            {platforms.map((platform, index) => (
              <TabPanel key={platform.name} value={tabValue} index={index}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {selectedAccounts.filter(id => platform.accounts.some(acc => acc.id === id)).length} of {platform.count} selected
                  </Typography>
                  
                  {platform.count > 0 && (
                    <Button
                      size="small"
                      startIcon={areAllCurrentSelected ? <DeselectAllIcon /> : <SelectAllIcon />}
                      onClick={handleSelectAll}
                      variant="outlined"
                    >
                      {areAllCurrentSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </Box>

                <FormGroup>
                  {platform.accounts.map((account) => (
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
                            variant={tabValue === 0 ? "filled" : "outlined"}
                          />
                        </Box>
                      }
                    />
                  ))}
                </FormGroup>
              </TabPanel>
            ))}
          </Box>
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