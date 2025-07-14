import React, { useState, useEffect } from 'react';
import { compressImageForBluesky, needsCompressionForBluesky, getCompressionInfo } from '../utils/imageCompression';
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

// Removed TabPanel interface and functions - using compact grid now

const ComposePost: React.FC = () => {
  const [content, setContent] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
  // Removed tabValue since we're using a grid instead of tabs
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [postType, setPostType] = useState<'text' | 'image' | 'video' | 'reel'>('text');
  const [groupAccounts, setGroupAccounts] = useState<any[]>([]);
  // Pinterest-specific fields
  const [pinterestTitle, setPinterestTitle] = useState('');
  const [pinterestDescription, setPinterestDescription] = useState('');
  const [pinterestBoard, setPinterestBoard] = useState('');
  const [pinterestDestinationUrl, setPinterestDestinationUrl] = useState('');
  const [pinterestBoards, setPinterestBoards] = useState<any[]>([]);
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
  const blueskyAccounts = activeAccounts.filter(account => account.platform === 'bluesky');
  const facebookAccounts = activeAccounts.filter(account => account.platform === 'facebook');
  const instagramAccounts = activeAccounts.filter(account => account.platform === 'instagram');
  const allSupportedAccounts = [...mastodonAccounts, ...xAccounts, ...pinterestAccounts, ...blueskyAccounts, ...facebookAccounts, ...instagramAccounts];

  // Removed old tab-based platform selection logic

  const handleAccountChange = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  // Removed old select all logic - now handled per platform in the grid

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const processedFiles: File[] = [];
      
      // Check if any Bluesky accounts are selected
      const hasBlueskySelected = selectedAccounts.some(accountId => 
        blueskyAccounts.some(acc => acc.id.toString() === accountId)
      );
      
      for (const file of files) {
        let processedFile = file;
        
        // Compress for Bluesky if needed
        if (hasBlueskySelected && needsCompressionForBluesky(file)) {
          try {
            console.log(`Compressing ${file.name} for Bluesky (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
            processedFile = await compressImageForBluesky(file);
            const info = getCompressionInfo(file.size, processedFile.size);
            console.log(`Compression completed: ${info.message}`);
            
            // Optionally show a toast notification to user
            // You could dispatch a notification here
          } catch (error) {
            console.error('Failed to compress image:', error);
            // Keep original file if compression fails
            processedFile = file;
          }
        }
        
        processedFiles.push(processedFile);
      }
      
      setSelectedImages(prev => [...prev, ...processedFiles].slice(0, 4)); // Limit to 4 images
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
      if (!pinterestBoard) {
        alert('Please select a Pinterest board for your pin');
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
      pinterestDescription: hasPinterestAccounts ? pinterestDescription.trim() : undefined,
      pinterestBoard: hasPinterestAccounts ? pinterestBoard : undefined,
      pinterestDestinationUrl: hasPinterestAccounts ? pinterestDestinationUrl.trim() : undefined
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
      setPinterestBoard('');
      setPinterestDestinationUrl('');
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
      'pinterest': 500,  // Pinterest pin descriptions
      'bluesky': 300  // Bluesky character limit
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
      'pinterest': 500,
      'bluesky': 300
    };

    const limitTexts = uniquePlatforms.map(platform => {
      if (!platform) return '';
      const limit = platformLimits[platform] || 5000;
      const platformName = platform === 'x' ? 'X' : 
                          platform === 'pinterest' ? 'Pinterest' :
                          platform === 'bluesky' ? 'Bluesky' :
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
            <Box sx={{ mb: 2, p: 3, border: '2px solid #BD081C', borderRadius: 2, bgcolor: '#fff8f8' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#BD081C', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                📌 Pinterest Pin Details
              </Typography>
              
              {/* Board Selection */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Board for Pins</InputLabel>
                <Select
                  value={pinterestBoard}
                  onChange={(e) => setPinterestBoard(e.target.value)}
                  label="Select Board for Pins"
                  placeholder="Select Board"
                >
                  <MenuItem value="">
                    <em>Select Board</em>
                  </MenuItem>
                  <MenuItem value="default-board">My First Board</MenuItem>
                  <MenuItem value="ideas">Ideas</MenuItem>
                  <MenuItem value="inspiration">Inspiration</MenuItem>
                  <MenuItem value="recipes">Recipes</MenuItem>
                </Select>
              </FormControl>

              {/* Pin Title */}
              <TextField
                fullWidth
                variant="outlined"
                label="Pin Title (Required)"
                placeholder="Write title here"
                value={pinterestTitle}
                onChange={(e) => setPinterestTitle(e.target.value)}
                sx={{ mb: 2 }}
                required
                error={pinterestAccounts.some(account => selectedAccounts.includes(account.id.toString())) && !pinterestTitle.trim()}
                helperText={
                  pinterestAccounts.some(account => selectedAccounts.includes(account.id.toString())) && !pinterestTitle.trim()
                    ? "Title is required for Pinterest pins"
                    : "This will be the title of your Pinterest pin (100 characters max)"
                }
                inputProps={{ maxLength: 100 }}
              />

              {/* Pin Description */}
              <TextField
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                label="Pin Description (Required)"
                placeholder="Write description here"
                value={pinterestDescription}
                onChange={(e) => setPinterestDescription(e.target.value)}
                sx={{ mb: 2 }}
                required
                error={pinterestAccounts.some(account => selectedAccounts.includes(account.id.toString())) && !pinterestDescription.trim()}
                helperText={
                  pinterestAccounts.some(account => selectedAccounts.includes(account.id.toString())) && !pinterestDescription.trim()
                    ? "Description is required for Pinterest pins"
                    : `${pinterestDescription.length}/500 characters - Describe your pin to help people find it`
                }
                inputProps={{ maxLength: 500 }}
              />

              {/* Destination URL */}
              <TextField
                fullWidth
                variant="outlined"
                label="Destination URL (Optional)"
                placeholder="Enter URL"
                value={pinterestDestinationUrl}
                onChange={(e) => setPinterestDestinationUrl(e.target.value)}
                sx={{ mb: 2 }}
                helperText="Where should people go when they click your pin? (Optional)"
                type="url"
              />

              {/* Image Upload Requirement Notice */}
              <Box sx={{ p: 2, bgcolor: '#f0f0f0', borderRadius: 1, border: '1px dashed #ccc' }}>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  📷 <strong>Image Required</strong><br />
                  Pinterest pins require an image. Please add an image using the media upload section below.
                </Typography>
              </Box>
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
                  {/* File size indicator */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 2,
                      left: 2,
                      bgcolor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      px: 0.5,
                      py: 0.25,
                      borderRadius: 0.5,
                      fontSize: '0.7rem'
                    }}
                  >
                    {(file.size / 1024 / 1024).toFixed(1)}MB
                  </Box>
                  
                  {/* Bluesky compatibility indicator */}
                  {selectedAccounts.some(accountId => 
                    blueskyAccounts.some(acc => acc.id.toString() === accountId)
                  ) && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 2,
                        left: 2,
                        bgcolor: file.size <= 1000000 ? 'success.main' : 'warning.main',
                        color: 'white',
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        fontSize: '0.6rem'
                      }}
                    >
                      {file.size <= 1000000 ? '✓' : '⚠'}
                    </Box>
                  )}
                  
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
            <FormLabel component="legend" sx={{ mb: 2 }}>🎯 Select Platforms</FormLabel>
            
            {/* Compact Platform Grid */}
            <Grid container spacing={1} sx={{ mb: 3 }}>
              {/* Facebook */}
              {facebookAccounts.length > 0 && (
                <Grid item xs={6} sm={4} md={2}>
                  <Card 
                    sx={{ 
                      p: 1, 
                      cursor: 'pointer',
                      border: facebookAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? 2 : 1,
                      borderColor: facebookAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? '#1877F2' : 'divider',
                      backgroundColor: facebookAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? 'rgba(24, 119, 242, 0.1)' : 'background.paper',
                      '&:hover': { backgroundColor: 'rgba(24, 119, 242, 0.05)' }
                    }}
                    onClick={() => {
                      const fbAccountIds = facebookAccounts.map(acc => acc.id.toString());
                      const allSelected = fbAccountIds.every(id => selectedAccounts.includes(id));
                      if (allSelected) {
                        setSelectedAccounts(prev => prev.filter(id => !fbAccountIds.includes(id)));
                      } else {
                        setSelectedAccounts(prev => Array.from(new Set([...prev, ...fbAccountIds])));
                      }
                    }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ color: '#1877F2', mb: 0.5 }}>📘</Typography>
                      <Typography variant="caption" fontWeight={500}>Facebook</Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {facebookAccounts.length} account{facebookAccounts.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              )}

              {/* Instagram */}
              {instagramAccounts.length > 0 && (
                <Grid item xs={6} sm={4} md={2}>
                  <Card 
                    sx={{ 
                      p: 1, 
                      cursor: 'pointer',
                      border: instagramAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? 2 : 1,
                      borderColor: instagramAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? '#E4405F' : 'divider',
                      backgroundColor: instagramAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? 'rgba(228, 64, 95, 0.1)' : 'background.paper',
                      '&:hover': { backgroundColor: 'rgba(228, 64, 95, 0.05)' }
                    }}
                    onClick={() => {
                      const igAccountIds = instagramAccounts.map(acc => acc.id.toString());
                      const allSelected = igAccountIds.every(id => selectedAccounts.includes(id));
                      if (allSelected) {
                        setSelectedAccounts(prev => prev.filter(id => !igAccountIds.includes(id)));
                      } else {
                        setSelectedAccounts(prev => Array.from(new Set([...prev, ...igAccountIds])));
                      }
                    }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ color: '#E4405F', mb: 0.5 }}>📷</Typography>
                      <Typography variant="caption" fontWeight={500}>Instagram</Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {instagramAccounts.length} account{instagramAccounts.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              )}

              {/* X (Twitter) */}
              {xAccounts.length > 0 && (
                <Grid item xs={6} sm={4} md={2}>
                  <Card 
                    sx={{ 
                      p: 1, 
                      cursor: 'pointer',
                      border: xAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? 2 : 1,
                      borderColor: xAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? '#000000' : 'divider',
                      backgroundColor: xAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? 'rgba(0, 0, 0, 0.1)' : 'background.paper',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.05)' }
                    }}
                    onClick={() => {
                      const xAccountIds = xAccounts.map(acc => acc.id.toString());
                      const allSelected = xAccountIds.every(id => selectedAccounts.includes(id));
                      if (allSelected) {
                        setSelectedAccounts(prev => prev.filter(id => !xAccountIds.includes(id)));
                      } else {
                        setSelectedAccounts(prev => Array.from(new Set([...prev, ...xAccountIds])));
                      }
                    }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ color: '#000000', mb: 0.5 }}>🐦</Typography>
                      <Typography variant="caption" fontWeight={500}>X</Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {xAccounts.length} account{xAccounts.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              )}

              {/* Bluesky */}
              {blueskyAccounts.length > 0 && (
                <Grid item xs={6} sm={4} md={2}>
                  <Card 
                    sx={{ 
                      p: 1, 
                      cursor: 'pointer',
                      border: blueskyAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? 2 : 1,
                      borderColor: blueskyAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? '#0085ff' : 'divider',
                      backgroundColor: blueskyAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? 'rgba(0, 133, 255, 0.1)' : 'background.paper',
                      '&:hover': { backgroundColor: 'rgba(0, 133, 255, 0.05)' }
                    }}
                    onClick={() => {
                      const bskyAccountIds = blueskyAccounts.map(acc => acc.id.toString());
                      const allSelected = bskyAccountIds.every(id => selectedAccounts.includes(id));
                      if (allSelected) {
                        setSelectedAccounts(prev => prev.filter(id => !bskyAccountIds.includes(id)));
                      } else {
                        setSelectedAccounts(prev => Array.from(new Set([...prev, ...bskyAccountIds])));
                      }
                    }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ color: '#0085ff', mb: 0.5 }}>🟦</Typography>
                      <Typography variant="caption" fontWeight={500}>Bluesky</Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {blueskyAccounts.length} account{blueskyAccounts.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              )}

              {/* Mastodon */}
              {mastodonAccounts.length > 0 && (
                <Grid item xs={6} sm={4} md={2}>
                  <Card 
                    sx={{ 
                      p: 1, 
                      cursor: 'pointer',
                      border: mastodonAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? 2 : 1,
                      borderColor: mastodonAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? '#6364FF' : 'divider',
                      backgroundColor: mastodonAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? 'rgba(99, 100, 255, 0.1)' : 'background.paper',
                      '&:hover': { backgroundColor: 'rgba(99, 100, 255, 0.05)' }
                    }}
                    onClick={() => {
                      const mastoAccountIds = mastodonAccounts.map(acc => acc.id.toString());
                      const allSelected = mastoAccountIds.every(id => selectedAccounts.includes(id));
                      if (allSelected) {
                        setSelectedAccounts(prev => prev.filter(id => !mastoAccountIds.includes(id)));
                      } else {
                        setSelectedAccounts(prev => Array.from(new Set([...prev, ...mastoAccountIds])));
                      }
                    }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ color: '#6364FF', mb: 0.5 }}>🐘</Typography>
                      <Typography variant="caption" fontWeight={500}>Mastodon</Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {mastodonAccounts.length} account{mastodonAccounts.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              )}

              {/* Pinterest */}
              {pinterestAccounts.length > 0 && (
                <Grid item xs={6} sm={4} md={2}>
                  <Card 
                    sx={{ 
                      p: 1, 
                      cursor: 'pointer',
                      border: pinterestAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? 2 : 1,
                      borderColor: pinterestAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? '#BD081C' : 'divider',
                      backgroundColor: pinterestAccounts.some(acc => selectedAccounts.includes(acc.id.toString())) ? 'rgba(189, 8, 28, 0.1)' : 'background.paper',
                      '&:hover': { backgroundColor: 'rgba(189, 8, 28, 0.05)' }
                    }}
                    onClick={() => {
                      const pinterestAccountIds = pinterestAccounts.map(acc => acc.id.toString());
                      const allSelected = pinterestAccountIds.every(id => selectedAccounts.includes(id));
                      if (allSelected) {
                        setSelectedAccounts(prev => prev.filter(id => !pinterestAccountIds.includes(id)));
                      } else {
                        setSelectedAccounts(prev => Array.from(new Set([...prev, ...pinterestAccountIds])));
                      }
                    }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ color: '#BD081C', mb: 0.5 }}>📌</Typography>
                      <Typography variant="caption" fontWeight={500}>Pinterest</Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {pinterestAccounts.length} account{pinterestAccounts.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              )}
            </Grid>

            {/* Selected Accounts Summary */}
            {selectedAccounts.length > 0 && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1, border: 1, borderColor: 'primary.200' }}>
                <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                  📤 Publishing to {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {allSupportedAccounts
                    .filter(account => selectedAccounts.includes(account.id.toString()))
                    .map(account => (
                      <Chip
                        key={account.id}
                        size="small"
                        label={`${account.displayName || account.username} (${account.platform})`}
                        onDelete={() => handleAccountChange(account.id.toString())}
                        avatar={<Avatar sx={{ width: 16, height: 16 }}>{(account.displayName || account.username).charAt(0)}</Avatar>}
                      />
                    ))
                  }
                </Box>
              </Box>
            )}
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