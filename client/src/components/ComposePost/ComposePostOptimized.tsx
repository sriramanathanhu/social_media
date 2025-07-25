import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Send as SendIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchAccounts } from '../../store/slices/accountsSlice';
import { createPost } from '../../store/slices/postsSlice';
import { groupsAPI } from '../../services/api';

// Custom hooks
import useAccountSelection, { AccountGroup } from '../../hooks/useAccountSelection';
import useMediaUpload from '../../hooks/useMediaUpload';
import usePinterestFields from '../../hooks/usePinterestFields';
import usePostScheduling from '../../hooks/usePostScheduling';

// Optimized components
import PlatformSelector from './PlatformSelector';
import MediaUploadSection from './MediaUploadSection';
import CharacterLimitDisplay from './CharacterLimitDisplay';
import PinterestFieldsSection from './PinterestFieldsSection';
import SchedulingSection from './SchedulingSection';

import logger from '../../utils/logger';

const ComposePostOptimized: React.FC = () => {
  // Basic form state
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'text' | 'image' | 'video' | 'reel'>('text');
  const [groups, setGroups] = useState<AccountGroup[]>([]);

  // Redux state
  const dispatch = useDispatch<AppDispatch>();
  const { accounts, loading: accountsLoading } = useSelector((state: RootState) => state.accounts);
  const { publishing, error } = useSelector((state: RootState) => state.posts);

  // Custom hooks for complex logic
  const accountSelection = useAccountSelection();
  const mediaUpload = useMediaUpload();
  const pinterestFields = usePinterestFields();
  const scheduling = usePostScheduling();

  // Memoized selected platforms for optimization
  const selectedPlatforms = useMemo(() => {
    return accountSelection.selectedAccountsData.map(acc => acc.platform);
  }, [accountSelection.selectedAccountsData]);

  // Fetch initial data
  useEffect(() => {
    dispatch(fetchAccounts());
    fetchGroups();
  }, [dispatch]);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await groupsAPI.getGroups();
      setGroups(response.data.groups || []);
    } catch (error) {
      logger.error('Failed to fetch groups:', error);
    }
  }, []);

  // Memoized validation
  const formValidation = useMemo(() => {
    const errors: string[] = [];

    if (!content.trim()) {
      errors.push('Post content is required');
    }

    if (accountSelection.selectedAccounts.length === 0) {
      errors.push('Please select at least one account');
    }

    // Pinterest validation
    if (accountSelection.hasSelectedPlatforms.pinterest) {
      const pinterestValidation = pinterestFields.validateFields();
      if (!pinterestValidation.isValid) {
        errors.push(...pinterestValidation.errors);
      }
    }

    // Scheduling validation
    if (!scheduling.schedulingValidation.isValid) {
      errors.push(scheduling.schedulingValidation.error!);
    }

    // Media validation
    const totalMediaSize = mediaUpload.getTotalMediaSize();
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    if (totalMediaSize > maxSizeBytes) {
      errors.push(`Total media size (${(totalMediaSize / 1024 / 1024).toFixed(1)}MB) exceeds 50MB limit`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [
    content,
    accountSelection.selectedAccounts.length,
    accountSelection.hasSelectedPlatforms.pinterest,
    pinterestFields,
    scheduling.schedulingValidation,
    mediaUpload
  ]);

  // Handle media upload with Bluesky optimization
  const handleImageUpload = useCallback(async (files: FileList | File[]) => {
    await mediaUpload.handleImageUpload(files, accountSelection.hasSelectedPlatforms.bluesky);
  }, [mediaUpload, accountSelection.hasSelectedPlatforms.bluesky]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!formValidation.isValid) {
      return;
    }

    try {
      const postData = {
        content,
        targetAccountIds: accountSelection.selectedAccounts,
        mediaFiles: [...mediaUpload.selectedImages, ...mediaUpload.selectedVideos],
        scheduleFor: scheduling.isScheduled ? scheduling.scheduledDate?.toISOString() : undefined,
        postType,
        ...(accountSelection.hasSelectedPlatforms.pinterest && {
          pinterestData: pinterestFields.getPinterestData()
        })
      };

      await dispatch(createPost(postData)).unwrap();
      
      // Reset form on success
      setContent('');
      accountSelection.deselectAll();
      mediaUpload.clearAllMedia();
      pinterestFields.resetFields();
      scheduling.clearScheduling();
      
    } catch (error) {
      logger.error('Failed to create post:', error);
    }
  }, [
    formValidation.isValid,
    content,
    accountSelection,
    mediaUpload,
    scheduling,
    postType,
    pinterestFields,
    dispatch
  ]);

  const isSubmitting = publishing;
  const canSubmit = formValidation.isValid && !isSubmitting && !mediaUpload.mediaProcessing;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Create Post
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {formValidation.errors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Please fix the following issues:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {formValidation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Content Input */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            variant="outlined"
            disabled={isSubmitting}
          />
          <CharacterLimitDisplay
            content={content}
            selectedPlatforms={selectedPlatforms}
          />
        </Grid>

        {/* Platform Selection */}
        <Grid item xs={12} md={6}>
          <PlatformSelector
            selectedAccounts={accountSelection.selectedAccounts}
            groups={groups}
            selectedGroupId={accountSelection.selectedGroupId}
            onAccountToggle={accountSelection.toggleAccount}
            onSelectAll={accountSelection.selectAll}
            onDeselectAll={accountSelection.deselectAll}
            onGroupSelect={accountSelection.selectGroup}
            onGroupClear={accountSelection.clearGroupSelection}
          />
        </Grid>

        {/* Media Upload */}
        <Grid item xs={12} md={6}>
          <MediaUploadSection
            selectedImages={mediaUpload.selectedImages}
            selectedVideos={mediaUpload.selectedVideos}
            mediaProcessing={mediaUpload.mediaProcessing}
            hasBluesky={accountSelection.hasSelectedPlatforms.bluesky}
            onImageUpload={handleImageUpload}
            onVideoUpload={mediaUpload.handleVideoUpload}
            onRemoveImage={mediaUpload.removeImage}
            onRemoveVideo={mediaUpload.removeVideo}
          />
        </Grid>

        {/* Platform-specific fields */}
        {accountSelection.hasSelectedPlatforms.pinterest && (
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Pinterest Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <PinterestFieldsSection
                  title={pinterestFields.pinterestTitle}
                  description={pinterestFields.pinterestDescription}
                  board={pinterestFields.pinterestBoard}
                  destinationUrl={pinterestFields.pinterestDestinationUrl}
                  boards={pinterestFields.pinterestBoards}
                  onFieldUpdate={pinterestFields.updateField}
                />
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Scheduling */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Scheduling {scheduling.isScheduled && '(Enabled)'}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <SchedulingSection
                isScheduled={scheduling.isScheduled}
                scheduledDate={scheduling.scheduledDate}
                onToggleScheduling={scheduling.toggleScheduling}
                onDateChange={scheduling.updateScheduledDate}
                validation={scheduling.schedulingValidation}
              />
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Submit Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : scheduling.isScheduled ? (
                  <ScheduleIcon />
                ) : (
                  <SendIcon />
                )
              }
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting
                ? 'Publishing...'
                : scheduling.isScheduled
                ? 'Schedule Post'
                : 'Publish Now'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default React.memo(ComposePostOptimized);