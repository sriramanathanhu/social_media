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
  MenuItem,
  Select,
  InputLabel,
  Switch,
  Grid,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { 
  Send as SendIcon, 
  Image as ImageIcon, 
  Close as CloseIcon,
  SelectAll as SelectAllIcon,
  Clear as DeselectAllIcon,
  VideoFile as VideoIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
  ExpandMore as ExpandMoreIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchAccounts } from '../store/slices/accountsSlice';
import { createPost } from '../store/slices/postsSlice';
import { groupsAPI } from '../services/api';

interface AccountGroup {
  id: number;
  name: string;
  description: string;
  color: string;
  accounts?: any[];
}

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
  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [postType, setPostType] = useState<'text' | 'image' | 'video' | 'reel'>('text');
  const [groupAccounts, setGroupAccounts] = useState<any[]>([]);
  // Pinterest-specific fields
  const [pinterestTitle, setPinterestTitle] = useState('');
  const [pinterestDescription, setPinterestDescription] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const { accounts, loading: accountsLoading } = useSelector((state: RootState) => state.accounts);
  const { publishing, error } = useSelector((state: RootState) => state.posts);

  useEffect(() => {
    dispatch(fetchAccounts());
    fetchGroups();
  }, [dispatch]);

  const fetchGroups = async () => {
    try {
      const response = await groupsAPI.getGroups();
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  useEffect(() => {
    if (selectedGroupId && groups.length > 0) {
      const group = groups.find(g => g.id.toString() === selectedGroupId);
      if (group?.accounts) {
        setGroupAccounts(group.accounts);
        // Auto-select all accounts in the group
        const groupAccountIds = group.accounts.map(acc => acc.id.toString());
        setSelectedAccounts(groupAccountIds);
      }
    } else {
      setGroupAccounts([]);
    }
  }, [selectedGroupId, groups]);

  const activeAccounts = accounts.filter(account => account.status === 'active');
  const mastodonAccounts = activeAccounts.filter(account => account.platform === 'mastodon');
  const xAccounts = activeAccounts.filter(account => account.platform === 'x');
  const pinterestAccounts = activeAccounts.filter(account => account.platform === 'pinterest');
  const allSupportedAccounts = [...mastodonAccounts, ...xAccounts, ...pinterestAccounts];

  const platforms = [
    { name: 'All', accounts: allSupportedAccounts, count: allSupportedAccounts.length },
    { name: 'Mastodon', accounts: mastodonAccounts, count: mastodonAccounts.length },
    { name: 'X', accounts: xAccounts, count: xAccounts.length },
    { name: 'Pinterest', accounts: pinterestAccounts, count: pinterestAccounts.length }
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
      setPostType('image');
    }
  };

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      setSelectedVideos(prev => [...prev, ...files].slice(0, 1)); // Limit to 1 video
      setPostType(postType === 'reel' ? 'reel' : 'video');
    }
  };

  const handleImageRemove = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    if (selectedImages.length === 1) {
      setPostType('text');
    }
  };

  const handleVideoRemove = (index: number) => {
    setSelectedVideos(prev => prev.filter((_, i) => i !== index));
    if (selectedVideos.length === 1) {
      setPostType('text');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || selectedAccounts.length === 0) return;

    // Validate Pinterest-specific fields if Pinterest accounts are selected
    const hasPinterestAccounts = pinterestAccounts.some(account => 
      selectedAccounts.includes(account.id.toString())
    );
    
    if (hasPinterestAccounts) {
      if (!pinterestTitle.trim()) {
        alert('Pinterest title is required when posting to Pinterest accounts');
        return;
      }
      if (!pinterestDescription.trim()) {
        alert('Pinterest description is required when posting to Pinterest accounts');
        return;
      }
    }

    const mediaFiles = [...selectedImages, ...selectedVideos];
    // Keep the local timezone for scheduling
    const scheduledFor = isScheduled && scheduledDate ? 
      new Date(scheduledDate.getTime() - (scheduledDate.getTimezoneOffset() * 60000)).toISOString() : 
      undefined;

    const result = await dispatch(createPost({
      content: content.trim(),
      targetAccountIds: selectedAccounts,
      mediaFiles,
      scheduledFor,
      postType,
      // Pinterest-specific data
      pinterestTitle: hasPinterestAccounts ? pinterestTitle.trim() : undefined,
      pinterestDescription: hasPinterestAccounts ? pinterestDescription.trim() : undefined
    }));

    if (result.meta.requestStatus === 'fulfilled') {
      setContent('');
      setSelectedAccounts([]);
      setSelectedImages([]);
      setSelectedVideos([]);
      setSelectedGroupId('');
      setIsScheduled(false);
      setScheduledDate(null);
      setPostType('text');
      setPinterestTitle('');
      setPinterestDescription('');
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
      'twitter': 280,  // legacy support
      'pinterest': 500  // Pinterest pin descriptions
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
      'twitter': 280,
      'pinterest': 500
    };

    const limitTexts = uniquePlatforms.map(platform => {
      if (!platform) return '';
      const limit = platformLimits[platform] || 5000;
      const platformName = platform === 'x' ? 'X' : 
                          platform === 'pinterest' ? 'Pinterest' :
                          platform.charAt(0).toUpperCase() + platform.slice(1);
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

          {/* Pinterest-specific fields */}
          {pinterestAccounts.some(account => selectedAccounts.includes(account.id.toString())) && (
            <Box sx={{ mb: 2, p: 2, border: '1px solid #BD081C', borderRadius: 1, bgcolor: '#fafafa' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#BD081C', fontWeight: 'bold' }}>
                Pinterest Pin Details
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                label="Pin Title (Required)"
                placeholder="Enter a catchy title for your pin"
                value={pinterestTitle}
                onChange={(e) => setPinterestTitle(e.target.value)}
                sx={{ mb: 2 }}
                required
                error={pinterestAccounts.some(account => selectedAccounts.includes(account.id.toString())) && !pinterestTitle.trim()}
                helperText={
                  pinterestAccounts.some(account => selectedAccounts.includes(account.id.toString())) && !pinterestTitle.trim()
                    ? "Title is required for Pinterest pins"
                    : "This will be the title of your Pinterest pin"
                }
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                label="Pin Description (Required)"
                placeholder="Describe your pin to help people find it"
                value={pinterestDescription}
                onChange={(e) => setPinterestDescription(e.target.value)}
                required
                error={pinterestAccounts.some(account => selectedAccounts.includes(account.id.toString())) && !pinterestDescription.trim()}
                helperText={
                  pinterestAccounts.some(account => selectedAccounts.includes(account.id.toString())) && !pinterestDescription.trim()
                    ? "Description is required for Pinterest pins"
                    : `${pinterestDescription.length}/500 characters - This will be the description of your Pinterest pin`
                }
                inputProps={{ maxLength: 500 }}
              />
            </Box>
          )}

          {/* Advanced Options */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                <ScheduleIcon />
                <Typography>Advanced Options</Typography>
                {(isScheduled || selectedGroupId) && (
                  <Chip 
                    size="small" 
                    label={`${isScheduled ? 'Scheduled' : ''}${isScheduled && selectedGroupId ? ' + ' : ''}${selectedGroupId ? 'Group' : ''}`}
                    color="primary"
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {/* Group Selection */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Select Group (Optional)</InputLabel>
                    <Select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      label="Select Group (Optional)"
                    >
                      <MenuItem value="">
                        <em>No Group - Manual Selection</em>
                      </MenuItem>
                      {groups.map((group) => (
                        <MenuItem key={group.id} value={group.id.toString()}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                backgroundColor: group.color,
                                borderRadius: '50%',
                              }}
                            />
                            {group.name} ({group.accounts?.length || 0} accounts)
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Post Type Selection */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Post Type</InputLabel>
                    <Select
                      value={postType}
                      onChange={(e) => setPostType(e.target.value as any)}
                      label="Post Type"
                    >
                      <MenuItem value="text">Text Post</MenuItem>
                      <MenuItem value="image">Image Post</MenuItem>
                      <MenuItem value="video">Video Post</MenuItem>
                      <MenuItem value="reel">Reel/Short Video</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Scheduling */}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isScheduled}
                        onChange={(e) => setIsScheduled(e.target.checked)}
                      />
                    }
                    label="Schedule for later"
                  />
                  
                  {isScheduled && (
                    <Box sx={{ mt: 2 }}>
                      <TextField
                        label="Schedule Date & Time"
                        type="datetime-local"
                        value={scheduledDate ? 
                          new Date(scheduledDate.getTime() - (scheduledDate.getTimezoneOffset() * 60000))
                            .toISOString().slice(0, 16) : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            // Parse as local time, not UTC
                            const localDate = new Date(e.target.value + ':00');
                            setScheduledDate(localDate);
                          } else {
                            setScheduledDate(null);
                          }
                        }}
                        fullWidth
                        required={isScheduled}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        inputProps={{
                          min: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000))
                            .toISOString().slice(0, 16)
                        }}
                      />
                    </Box>
                  )}
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

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

        {/* Video Upload Section */}
        <Box sx={{ mb: 2 }}>
          <input
            accept="video/*"
            style={{ display: 'none' }}
            id="video-upload"
            type="file"
            onChange={handleVideoSelect}
          />
          <label htmlFor="video-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<VideoIcon />}
              disabled={selectedVideos.length >= 1}
              sx={{ mb: 1 }}
            >
              Add Video ({selectedVideos.length}/1)
            </Button>
          </label>

          {selectedVideos.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
              {selectedVideos.map((file, index) => (
                <Box
                  key={index}
                  sx={{
                    position: 'relative',
                    width: 120,
                    height: 80,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'grey.100'
                  }}
                >
                  <VideoIcon sx={{ fontSize: 40, color: 'grey.500' }} />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      position: 'absolute', 
                      bottom: 4, 
                      left: 4, 
                      right: 4,
                      bgcolor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      px: 1,
                      borderRadius: 0.5,
                      fontSize: '0.7rem'
                    }}
                  >
                    {file.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleVideoRemove(index)}
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

        {/* Group Accounts Display */}
        {selectedGroupId && groupAccounts.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Card sx={{ bgcolor: 'primary.50', border: 1, borderColor: 'primary.200' }}>
              <CardContent sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <GroupIcon color="primary" />
                  <Typography variant="subtitle2" color="primary">
                    Selected Group: {groups.find(g => g.id.toString() === selectedGroupId)?.name}
                  </Typography>
                </Box>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {groupAccounts.map((account) => (
                    <Chip
                      key={account.id}
                      avatar={<Avatar src={account.avatar} sx={{ width: 20, height: 20 }} />}
                      label={`${account.displayName || account.username} (${account.platform})`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

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
                            label={account.platform === 'mastodon' ? 'Mastodon' : 
                                  account.platform === 'x' ? 'X' : 
                                  account.platform === 'pinterest' ? 'Pinterest' : 
                                  account.platform}
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

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {isScheduled && scheduledDate && (
            <Box display="flex" alignItems="center" gap={1}>
              <AccessTimeIcon color="primary" />
              <Typography variant="body2" color="primary">
                Scheduled for: {scheduledDate.toLocaleString()}
              </Typography>
            </Box>
          )}
          
          <Button
            type="submit"
            variant="contained"
            startIcon={publishing ? <CircularProgress size={20} /> : (isScheduled ? <ScheduleIcon /> : <SendIcon />)}
            disabled={
              !content.trim() || 
              selectedAccounts.length === 0 || 
              publishing || 
              isOverLimit ||
              activeAccounts.length === 0 ||
              (isScheduled && !scheduledDate)
            }
          >
            {publishing ? 'Processing...' : (isScheduled ? 'Schedule Post' : 'Publish Now')}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default ComposePost;