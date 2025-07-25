import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
  Switch,
  FormControlLabel,
  Divider,
  Checkbox,
  FormGroup,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Card,
  CardContent,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Close as CloseIcon,
  Web as WordPressIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
  Save as SaveIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  SelectAll as SelectAllIcon,
} from '@mui/icons-material';
import { wordpressAPI } from '../services/api';
import BasicWYSIWYGEditor from './BasicWYSIWYGEditor';

interface WordPressSite {
  id: number;
  siteUrl: string;
  username: string;
  displayName: string;
  siteTitle: string;
  status: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
}

interface PublishResult {
  siteId: number;
  siteName: string;
  success: boolean;
  error?: string;
  postId?: number;
  postUrl?: string;
}

interface WordPressMultiSitePublishDialogProps {
  open: boolean;
  onClose: () => void;
  sites: WordPressSite[];
  onPublished: () => void;
}

const WordPressMultiSitePublishDialog: React.FC<WordPressMultiSitePublishDialogProps> = ({
  open,
  onClose,
  sites,
  onPublished,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const [selectedSites, setSelectedSites] = useState<Set<number>>(new Set());
  const [commonCategories, setCommonCategories] = useState<Category[]>([]);
  const [commonTags, setCommonTags] = useState<Tag[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [expandSiteSelection, setExpandSiteSelection] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    status: 'publish',
    selectedCategories: [] as number[],
    selectedTags: [] as number[],
    isScheduled: false,
    scheduledFor: null as Date | null,
  });

  useEffect(() => {
    if (open) {
      setSelectedSites(new Set());
      setPublishResults([]);
      setShowResults(false);
      setExpandSiteSelection(true);
      // Reset form
      setFormData({
        title: '',
        content: '',
        excerpt: '',
        status: 'publish',
        selectedCategories: [],
        selectedTags: [],
        isScheduled: false,
        scheduledFor: null,
      });
    }
  }, [open]);

  useEffect(() => {
    if (selectedSites.size > 0) {
      fetchCommonCategoriesAndTags();
    } else {
      setCommonCategories([]);
      setCommonTags([]);
    }
  }, [selectedSites]);

  const fetchCommonCategoriesAndTags = async () => {
    setCategoriesLoading(true);
    try {
      const siteIds = Array.from(selectedSites);
      
      // Fetch categories and tags for all selected sites
      const categoriesPromises = siteIds.map(siteId => 
        wordpressAPI.getCategories(siteId.toString()).then(response => response.data.categories || [])
      );
      const tagsPromises = siteIds.map(siteId => 
        wordpressAPI.getTags(siteId.toString()).then(response => response.data.tags || [])
      );

      const [allCategories, allTags] = await Promise.all([
        Promise.all(categoriesPromises),
        Promise.all(tagsPromises)
      ]);

      // Find common categories (categories that exist in ALL selected sites)
      const commonCats = allCategories[0].filter((cat: Category) => 
        allCategories.every((siteCats: Category[]) => 
          siteCats.some((siteCat: Category) => siteCat.name.toLowerCase() === cat.name.toLowerCase())
        )
      );

      // Find common tags (tags that exist in ALL selected sites)
      const commonTagsList = allTags[0].filter((tag: Tag) => 
        allTags.every((siteTags: Tag[]) => 
          siteTags.some((siteTag: Tag) => siteTag.name.toLowerCase() === tag.name.toLowerCase())
        )
      );

      setCommonCategories(commonCats);
      setCommonTags(commonTagsList);
    } catch (error) {
      console.error('Failed to fetch common categories and tags:', error);
      setError('Failed to load categories and tags for selected sites');
    }
    setCategoriesLoading(false);
  };

  const handleSiteToggle = (siteId: number) => {
    const newSelected = new Set(selectedSites);
    if (newSelected.has(siteId)) {
      newSelected.delete(siteId);
    } else {
      newSelected.add(siteId);
    }
    setSelectedSites(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSites.size === sites.length) {
      setSelectedSites(new Set());
    } else {
      setSelectedSites(new Set(sites.map(site => site.id)));
    }
  };

  const handlePublish = async () => {
    if (selectedSites.size === 0) {
      setError('Please select at least one WordPress site');
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Please fill in title and content');
      return;
    }

    setPublishing(true);
    setError(null);
    setPublishResults([]);
    setShowResults(true);
    setExpandSiteSelection(false);

    const results: PublishResult[] = [];
    const siteIds = Array.from(selectedSites);

    try {
      // Use bulk publishing API
      const response = await wordpressAPI.publishPostBulk({
        siteIds: siteIds,
        title: formData.title,
        content: formData.content,
        status: formData.status,
        categories: formData.selectedCategories,
        tags: formData.selectedTags,
        excerpt: formData.excerpt,
        scheduledFor: formData.scheduledFor?.toISOString(),
      });

      // Transform API response to match our result format
      const apiResults = response.data.results || [];
      const transformedResults = apiResults.map((result: any) => {
        const site = sites.find(s => s.id === result.siteId);
        return {
          siteId: result.siteId,
          siteName: result.siteName || site?.siteTitle || `Site ${result.siteId}`,
          success: result.success,
          error: result.error,
          postId: result.post?.wpPostId,
          postUrl: result.post?.url,
        };
      });

      setPublishResults(transformedResults);

      // Check if all publications were successful
      const allSuccessful = transformedResults.every((result: any) => result.success);
      if (allSuccessful) {
        onPublished();
      }

    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to publish posts');
    }

    setPublishing(false);
  };

  const getSuccessCount = () => publishResults.filter(r => r.success).length;
  const getFailureCount = () => publishResults.filter(r => !r.success).length;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WordPressIcon sx={{ color: '#21759b' }} />
          <Typography variant="h6">
            Publish to Multiple WordPress Sites
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Site Selection Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ pb: '16px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Select WordPress Sites ({selectedSites.size}/{sites.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  startIcon={<SelectAllIcon />}
                  onClick={handleSelectAll}
                  variant="outlined"
                >
                  {selectedSites.size === sites.length ? 'Deselect All' : 'Select All'}
                </Button>
                <IconButton 
                  size="small" 
                  onClick={() => setExpandSiteSelection(!expandSiteSelection)}
                >
                  {expandSiteSelection ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
            </Box>
            
            <Collapse in={expandSiteSelection}>
              <FormGroup>
                {sites.map((site) => (
                  <FormControlLabel
                    key={site.id}
                    control={
                      <Checkbox
                        checked={selectedSites.has(site.id)}
                        onChange={() => handleSiteToggle(site.id)}
                        name={`site-${site.id}`}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {site.siteTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {site.siteUrl}
                        </Typography>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </Collapse>
          </CardContent>
        </Card>

        {/* Publishing Form */}
        {selectedSites.size > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Post Content
            </Typography>
            
            <TextField
              fullWidth
              label="Title *"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              margin="normal"
              disabled={publishing}
            />

            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                Content *
              </Typography>
              <BasicWYSIWYGEditor
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                readOnly={publishing}
                placeholder="Write your blog post content here..."
              />
            </Box>

            <TextField
              fullWidth
              label="Excerpt"
              multiline
              rows={3}
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              margin="normal"
              helperText="Optional short description"
              disabled={publishing}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  disabled={publishing}
                >
                  <MenuItem value="publish">Publish</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="private">Private</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {categoriesLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2 }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Loading common categories and tags...</Typography>
              </Box>
            ) : (
              <>
                {commonCategories.length > 0 && (
                  <Autocomplete
                    multiple
                    options={commonCategories}
                    getOptionLabel={(option) => option.name}
                    value={commonCategories.filter(cat => formData.selectedCategories.includes(cat.id))}
                    onChange={(_, newValue) => {
                      setFormData({
                        ...formData,
                        selectedCategories: newValue.map(cat => cat.id)
                      });
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={option.name}
                          {...getTagProps({ index })}
                          key={option.id}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Categories (Common to all selected sites)"
                        margin="normal"
                        helperText={`${commonCategories.length} categories available across all selected sites`}
                      />
                    )}
                    disabled={publishing}
                  />
                )}

                {commonTags.length > 0 && (
                  <Autocomplete
                    multiple
                    options={commonTags}
                    getOptionLabel={(option) => option.name}
                    value={commonTags.filter(tag => formData.selectedTags.includes(tag.id))}
                    onChange={(_, newValue) => {
                      setFormData({
                        ...formData,
                        selectedTags: newValue.map(tag => tag.id)
                      });
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={option.name}
                          {...getTagProps({ index })}
                          key={option.id}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Tags (Common to all selected sites)"
                        margin="normal"
                        helperText={`${commonTags.length} tags available across all selected sites`}
                      />
                    )}
                    disabled={publishing}
                  />
                )}

                {selectedSites.size > 0 && commonCategories.length === 0 && commonTags.length === 0 && !categoriesLoading && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    No common categories or tags found across the selected sites. 
                    Posts will be published without categories or tags.
                  </Alert>
                )}
              </>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isScheduled}
                  onChange={(e) => setFormData({ ...formData, isScheduled: e.target.checked })}
                  disabled={publishing}
                />
              }
              label="Schedule for later"
              sx={{ mt: 2 }}
            />

            {formData.isScheduled && (
              <TextField
                fullWidth
                label="Scheduled Date & Time"
                type="datetime-local"
                value={formData.scheduledFor ? new Date(formData.scheduledFor.getTime() - formData.scheduledFor.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value ? new Date(e.target.value) : null })}
                margin="normal"
                helperText="Select when you want this post to be published"
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: new Date().toISOString().slice(0, 16),
                }}
                disabled={publishing}
              />
            )}
          </Box>
        )}

        {/* Publishing Progress and Results */}
        {showResults && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Publishing Progress
              </Typography>
              
              {publishing && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Publishing to {selectedSites.size} sites... ({publishResults.length}/{selectedSites.size} completed)
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(publishResults.length / selectedSites.size) * 100} 
                  />
                </Box>
              )}

              {!publishing && publishResults.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Published to {getSuccessCount()} of {selectedSites.size} sites
                    {getFailureCount() > 0 && ` (${getFailureCount()} failed)`}
                  </Typography>
                </Box>
              )}

              <List dense>
                {publishResults.map((result, index) => (
                  <ListItem key={index} divider>
                    <ListItemIcon>
                      {result.success ? (
                        <SuccessIcon color="success" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={result.siteName}
                      secondary={
                        result.success 
                          ? `Published successfully${result.postUrl ? ` - View post` : ''}`
                          : `Failed: ${result.error}`
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={publishing}>
          {publishResults.length > 0 ? 'Close' : 'Cancel'}
        </Button>
        
        {!showResults ? (
          <Button
            variant="contained"
            startIcon={publishing ? <CircularProgress size={20} /> : <SendIcon />}
            onClick={handlePublish}
            disabled={publishing || selectedSites.size === 0 || !formData.title.trim() || !formData.content.trim()}
            sx={{ 
              bgcolor: '#21759b', 
              '&:hover': { bgcolor: '#1e6ba8' },
              '&:disabled': { bgcolor: 'grey.300' }
            }}
          >
            {publishing ? `Publishing... (${publishResults.length}/${selectedSites.size})` : `Publish to ${selectedSites.size} Sites`}
          </Button>
        ) : (
          publishResults.length > 0 && getFailureCount() > 0 && (
            <Button
              variant="outlined"
              startIcon={<SendIcon />}
              onClick={() => {
                // Reset and allow retry of failed publications
                const failedSites = publishResults.filter(r => !r.success).map(r => r.siteId);
                setSelectedSites(new Set(failedSites));
                setShowResults(false);
                setPublishResults([]);
                setExpandSiteSelection(true);
              }}
              color="error"
            >
              Retry Failed ({getFailureCount()})
            </Button>
          )
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WordPressMultiSitePublishDialog;