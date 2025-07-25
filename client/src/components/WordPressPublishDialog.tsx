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
} from '@mui/material';
import {
  Close as CloseIcon,
  Web as WordPressIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
  Save as SaveIcon,
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
  description: string;
}

interface WordPressPublishDialogProps {
  open: boolean;
  onClose: () => void;
  site: WordPressSite | null;
  onPublished: () => void;
}

const WordPressPublishDialog: React.FC<WordPressPublishDialogProps> = ({
  open,
  onClose,
  site,
  onPublished,
}) => {
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  
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
    if (open && site) {
      fetchCategoriesAndTags();
    }
  }, [open, site]);

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
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
      setError(null);
      setCategories([]);
      setTags([]);
    }
  }, [open]);

  const fetchCategoriesAndTags = async () => {
    if (!site) return;

    try {
      setCategoriesLoading(true);
      setTagsLoading(true);
      
      const [categoriesResponse, tagsResponse] = await Promise.all([
        wordpressAPI.getCategories(site.id.toString()),
        wordpressAPI.getTags(site.id.toString())
      ]);

      setCategories(categoriesResponse.data.categories || []);
      setTags(tagsResponse.data.tags || []);
    } catch (err: any) {
      setError(err.response?.data?.details || 'Failed to load site data');
    } finally {
      setCategoriesLoading(false);
      setTagsLoading(false);
    }
  };

  const handleSyncData = async () => {
    if (!site) return;

    try {
      setCategoriesLoading(true);
      setTagsLoading(true);
      await wordpressAPI.syncSiteData(site.id.toString());
      await fetchCategoriesAndTags();
    } catch (err: any) {
      setError(err.response?.data?.details || 'Failed to sync site data');
    }
  };

  const handlePublish = async () => {
    if (!site || !formData.title || !formData.content) {
      setError('Title and content are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let publishStatus = formData.status;
      let scheduledFor = undefined;

      if (formData.isScheduled && formData.scheduledFor) {
        publishStatus = 'future';
        scheduledFor = formData.scheduledFor.toISOString();
      }

      const postData = {
        siteId: site.id,
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt,
        status: publishStatus,
        categories: formData.selectedCategories,
        tags: formData.selectedTags,
        scheduledFor,
      };

      const response = await wordpressAPI.publishPost(postData);

      if (response.data.success) {
        onPublished();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.details || 'Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  const handleTagInputChange = (event: any, newValue: string) => {
    // Handle tag creation by name
    const existingTag = tags.find(tag => tag.name.toLowerCase() === newValue.toLowerCase());
    if (existingTag && !formData.selectedTags.includes(existingTag.id)) {
      setFormData({
        ...formData,
        selectedTags: [...formData.selectedTags, existingTag.id]
      });
    }
  };

  if (!site) {
    return null;
  }

  return (
    <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        disableEscapeKeyDown={loading}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WordPressIcon sx={{ color: '#21759b' }} />
              <Box>
                <Typography variant="h6">Publish to WordPress</Typography>
                <Typography variant="body2" color="text.secondary">
                  {site.siteTitle}
                </Typography>
              </Box>
            </Box>
            <Button onClick={onClose} disabled={loading}>
              <CloseIcon />
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Post Content */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Post Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              margin="normal"
              required
              placeholder="Enter your post title"
            />

            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                Post Content *
              </Typography>
              <BasicWYSIWYGEditor
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                readOnly={loading}
                placeholder="Write your post content here..."
              />
            </Box>

            <TextField
              fullWidth
              label="Excerpt (Optional)"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              margin="normal"
              multiline
              rows={2}
              placeholder="Brief description or excerpt for your post"
              helperText="This will be used as the post excerpt and meta description"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Categories and Tags */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Categories & Tags</Typography>
              <Button
                size="small"
                onClick={handleSyncData}
                disabled={categoriesLoading || tagsLoading}
                startIcon={categoriesLoading || tagsLoading ? <CircularProgress size={16} /> : null}
              >
                Sync Data
              </Button>
            </Box>

            {/* Categories */}
            <FormControl fullWidth margin="normal">
              <InputLabel>Categories</InputLabel>
              <Select
                multiple
                value={formData.selectedCategories}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  selectedCategories: e.target.value as number[] 
                })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const category = categories.find(cat => cat.id === value);
                      return (
                        <Chip 
                          key={value} 
                          label={category?.name || value} 
                          size="small" 
                        />
                      );
                    })}
                  </Box>
                )}
                disabled={categoriesLoading}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                    {category.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        - {category.description}
                      </Typography>
                    )}
                  </MenuItem>
                ))}
              </Select>
              {categoriesLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Loading categories...
                  </Typography>
                </Box>
              )}
            </FormControl>

            {/* Tags */}
            <Autocomplete
              multiple
              options={tags}
              getOptionLabel={(option) => option.name}
              value={tags.filter(tag => formData.selectedTags.includes(tag.id))}
              onChange={(event, newValue) => {
                setFormData({
                  ...formData,
                  selectedTags: newValue.map(tag => tag.id)
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Select or type tags"
                  margin="normal"
                  helperText="Start typing to search existing tags"
                />
              )}
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
              disabled={tagsLoading}
            />
            {tagsLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Loading tags...
                </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Publishing Options */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Publishing Options
            </Typography>

            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={formData.isScheduled}
              >
                <MenuItem value="publish">Publish Immediately</MenuItem>
                <MenuItem value="draft">Save as Draft</MenuItem>
                <MenuItem value="private">Private</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isScheduled}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    isScheduled: e.target.checked,
                    status: e.target.checked ? 'future' : 'publish'
                  })}
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
              />
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          
          {formData.status === 'draft' ? (
            <Button
              variant="contained"
              onClick={handlePublish}
              disabled={loading || !formData.title || !formData.content}
              startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
              sx={{ bgcolor: '#666', '&:hover': { bgcolor: '#555' } }}
            >
              {loading ? 'Saving...' : 'Save Draft'}
            </Button>
          ) : formData.isScheduled ? (
            <Button
              variant="contained"
              onClick={handlePublish}
              disabled={loading || !formData.title || !formData.content || !formData.scheduledFor}
              startIcon={loading ? <CircularProgress size={16} /> : <ScheduleIcon />}
              sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#ef6c00' } }}
            >
              {loading ? 'Scheduling...' : 'Schedule Post'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handlePublish}
              disabled={loading || !formData.title || !formData.content}
              startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
              sx={{ bgcolor: '#21759b', '&:hover': { bgcolor: '#1e6ba8' } }}
            >
              {loading ? 'Publishing...' : 'Publish Now'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
  );
};

export default WordPressPublishDialog;