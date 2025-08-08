import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Chip,
  Autocomplete,
  Paper,
  RadioGroup,
  Radio,
  FormLabel,
  Divider,
} from '@mui/material';
import {
  Reddit as RedditIcon,
  Link as LinkIcon,
  Article as TextIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { redditAPI } from '../services/api';
import BasicWYSIWYGEditor from './BasicWYSIWYGEditor';
import TurndownService from 'turndown';

interface RedditAccount {
  id: string;
  username: string;
  platform: string;
  status: string;
  hasValidToken: boolean;
}

interface Subreddit {
  id: number;
  subreddit_name: string;
  display_name: string;
  title: string;
  description: string;
  subscribers: number;
  submission_type: string;
  can_submit: boolean;
  is_moderator: boolean;
  over_18: boolean;
  flair_enabled: boolean;
  flair_list: any[];
  rules: any[];
}

interface RedditPublishDialogProps {
  open: boolean;
  onClose: () => void;
  account: RedditAccount | null;
  subreddits: Subreddit[];
  onPublished: () => void;
}

const RedditPublishDialog: React.FC<RedditPublishDialogProps> = ({
  open,
  onClose,
  account,
  subreddits,
  onPublished,
}) => {
  const [postType, setPostType] = useState<'text' | 'link'>('text');
  const [contentMode, setContentMode] = useState<'rich' | 'markdown'>('rich');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [selectedSubreddit, setSelectedSubreddit] = useState<Subreddit | null>(null);
  const [flair, setFlair] = useState('');
  const [nsfw, setNsfw] = useState(false);
  const [spoiler, setSpoiler] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize Turndown service for HTML to Markdown conversion
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '*',
    strongDelimiter: '**'
  });

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setPostType('text');
      setContentMode('rich');
      setTitle('');
      setContent('');
      setUrl('');
      setSelectedSubreddit(null);
      setFlair('');
      setNsfw(false);
      setSpoiler(false);
      setScheduledFor('');
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  const getAvailableSubreddits = () => {
    return subreddits.filter(sub => 
      sub.can_submit && 
      (postType === 'text' ? 
        ['any', 'self'].includes(sub.submission_type) : 
        ['any', 'link'].includes(sub.submission_type)
      )
    );
  };

  const handleSubmit = async () => {
    if (!account || !selectedSubreddit || !title.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    // Check if there's actual text content based on content mode
    let hasTextContent = false;
    if (postType === 'text') {
      if (contentMode === 'rich') {
        // For rich text, check if there's actual text content (not just HTML tags)
        const textOnly = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        hasTextContent = textOnly.length > 0;
      } else {
        // For markdown, check if there's any non-whitespace content
        hasTextContent = content.trim().length > 0;
      }
    }
    
    if (postType === 'text' && !hasTextContent) {
      setError('Text posts require content');
      return;
    }

    if (postType === 'link' && !url.trim()) {
      setError('Link posts require a URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Process content based on content mode
      let processedContent: string | undefined;
      if (postType === 'text') {
        if (contentMode === 'rich') {
          // Convert HTML content to Markdown for Reddit
          const rawHtml = content.trim();
          const convertedMarkdown = turndownService.turndown(rawHtml);
          
          // Validate conversion result
          const finalContent = convertedMarkdown.trim();
          
          // If conversion resulted in empty content, try to extract plain text
          if (!finalContent || finalContent.length === 0) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawHtml;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            processedContent = plainText.trim();
            console.warn('Turndown conversion resulted in empty content, using plain text fallback:', plainText.substring(0, 100));
          } else {
            processedContent = finalContent;
          }
        } else {
          // Use markdown content directly
          processedContent = content.trim();
        }
      } else {
        processedContent = undefined;
      }
      
      // Enhanced debug logging
      console.log('=== FRONTEND REDDIT SUBMIT DEBUG ===');
      console.log('Input data:', {
        postType,
        contentMode,
        originalContentLength: content?.length || 0,
        originalContentPreview: content?.substring(0, 200) || 'NO_CONTENT',
        originalContentType: typeof content,
        hasOriginalContent: !!content
      });
      
      console.log('Processed data:', {
        processedContentLength: processedContent?.length || 0,
        processedContentPreview: processedContent?.substring(0, 200) || 'NO_PROCESSED_CONTENT',
        processedContentType: typeof processedContent,
        hasProcessedContent: !!processedContent,
        willIncludeContent: postType === 'text' && !!processedContent
      });
      
      console.log('Conversion details:', {
        contentMode,
        isRichTextMode: contentMode === 'rich',
        isMarkdownMode: contentMode === 'markdown',
        contentContainsHTML: content?.includes('<') || false,
        contentContainsTags: content?.match(/<[^>]+>/g)?.length || 0
      });
      
      console.log('Final validation:', {
        postTypeIsText: postType === 'text',
        hasValidContent: !!processedContent && processedContent.length > 0,
        contentWillBeSent: postType === 'text' && !!processedContent
      });
      console.log('=====================================');

      const postData = {
        accountId: parseInt(account.id),
        subreddit: selectedSubreddit.subreddit_name,
        title: title.trim(),
        type: postType,
        ...(postType === 'text' && { content: processedContent }),
        ...(postType === 'link' && { url: url.trim() }),
        ...(flair && { flair }),
        nsfw,
        spoiler,
        ...(scheduledFor && { scheduledFor }),
      };

      await redditAPI.submitPost(postData);
      setSuccess(scheduledFor ? 'Post scheduled successfully!' : 'Post submitted successfully!');
      
      setTimeout(() => {
        onPublished();
      }, 2000);
    } catch (err: any) {
      console.error('Reddit publish error:', err);
      setError(err.response?.data?.error || 'Failed to submit post');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const getSubredditSubmissionInfo = (subreddit: Subreddit) => {
    const info = [];
    if (subreddit.submission_type === 'self') info.push('Text only');
    if (subreddit.submission_type === 'link') info.push('Links only');
    if (subreddit.over_18) info.push('NSFW');
    if (subreddit.is_moderator) info.push('You moderate this');
    return info;
  };

  if (!account) {
    return null;
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <RedditIcon sx={{ color: '#ff4500', fontSize: 32 }} />
            <Box>
              <Typography variant="h6">
                Publish to Reddit
              </Typography>
              <Typography variant="body2" color="text.secondary">
                u/{account.username}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {/* Post Type Selection */}
          <Box sx={{ mb: 3 }}>
            <FormLabel component="legend" sx={{ mb: 2 }}>Post Type</FormLabel>
            <RadioGroup
              row
              value={postType}
              onChange={(e) => setPostType(e.target.value as 'text' | 'link')}
            >
              <FormControlLabel
                value="text"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextIcon />
                    <span>Text Post</span>
                  </Box>
                }
              />
              <FormControlLabel
                value="link"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon />
                    <span>Link Post</span>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>

          {/* Subreddit Selection */}
          <Autocomplete
            fullWidth
            options={getAvailableSubreddits()}
            getOptionLabel={(option) => `r/${option.subreddit_name}`}
            value={selectedSubreddit}
            onChange={(_, newValue) => setSelectedSubreddit(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Subreddit *"
                placeholder="Select a subreddit"
                helperText={selectedSubreddit ? 
                  `${selectedSubreddit.subscribers.toLocaleString()} members` : 
                  'Choose from your joined subreddits'
                }
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="body1">
                    r/{option.subreddit_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {option.title} • {option.subscribers.toLocaleString()} members
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                    {getSubredditSubmissionInfo(option).map((info, index) => (
                      <Chip key={index} label={info} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              </li>
            )}
            sx={{ mb: 3 }}
          />

          {/* Title */}
          <TextField
            fullWidth
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your post title"
            helperText={`${title.length}/300 characters`}
            inputProps={{ maxLength: 300 }}
            sx={{ mb: 3 }}
          />

          {/* Content based on post type */}
          {postType === 'text' ? (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  Content *
                </Typography>
                <RadioGroup
                  row
                  value={contentMode}
                  onChange={(e) => setContentMode(e.target.value as 'rich' | 'markdown')}
                  sx={{ gap: 1 }}
                >
                  <FormControlLabel
                    value="rich"
                    control={<Radio size="small" />}
                    label="Rich Text"
                    sx={{ 
                      '& .MuiFormControlLabel-label': { fontSize: '0.875rem' },
                      '& .MuiRadio-root': { padding: '4px' }
                    }}
                  />
                  <FormControlLabel
                    value="markdown"
                    control={<Radio size="small" />}
                    label="Markdown"
                    sx={{ 
                      '& .MuiFormControlLabel-label': { fontSize: '0.875rem' },
                      '& .MuiRadio-root': { padding: '4px' }
                    }}
                  />
                </RadioGroup>
              </Box>
              
              {contentMode === 'rich' ? (
                <BasicWYSIWYGEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Write your post content here..."
                  height={250}
                />
              ) : (
                <TextField
                  fullWidth
                  multiline
                  rows={12}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your post content in Markdown format...

**Bold text**
*Italic text*
[Link text](https://example.com)
`Code`
```
Code block
```

- List item
- List item"
                  sx={{ 
                    '& .MuiInputBase-input': { 
                      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                      fontSize: '0.875rem'
                    }
                  }}
                />
              )}
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {contentMode === 'rich' 
                  ? `${content.replace(/<[^>]*>/g, '').length}/40000 characters • Rich text will be converted to Reddit Markdown`
                  : `${content.length}/40000 characters • Direct Markdown format`
                }
              </Typography>
            </Box>
          ) : (
            <TextField
              fullWidth
              label="URL *"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              type="url"
              sx={{ mb: 3 }}
            />
          )}

          {/* Flair Selection */}
          {selectedSubreddit?.flair_enabled && selectedSubreddit.flair_list?.length > 0 && (
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Flair (Optional)</InputLabel>
              <Select
                value={flair}
                onChange={(e) => setFlair(e.target.value)}
                label="Flair (Optional)"
              >
                <MenuItem value="">
                  <em>No flair</em>
                </MenuItem>
                {selectedSubreddit.flair_list.map((flairOption: any, index: number) => (
                  <MenuItem key={index} value={flairOption.text || flairOption}>
                    {flairOption.text || flairOption}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Post Options */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Post Options
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={nsfw}
                  onChange={(e) => setNsfw(e.target.checked)}
                />
              }
              label="Mark as NSFW"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={spoiler}
                  onChange={(e) => setSpoiler(e.target.checked)}
                />
              }
              label="Mark as Spoiler"
            />
          </Box>

          {/* Scheduling */}
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.checked ? new Date().toISOString().slice(0, 16) : '')}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon />
                  <span>Schedule for later</span>
                </Box>
              }
            />
            {scheduledFor && (
              <TextField
                fullWidth
                type="datetime-local"
                label="Scheduled Date & Time"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                sx={{ mt: 2 }}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: new Date().toISOString().slice(0, 16)
                }}
              />
            )}
          </Box>

          {/* Subreddit Rules Info */}
          {selectedSubreddit && selectedSubreddit.rules?.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                <WarningIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 1 }} />
                Subreddit Rules
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please review r/{selectedSubreddit.subreddit_name}'s rules before posting.
                {selectedSubreddit.rules.slice(0, 3).map((rule: any, index: number) => (
                  <Box key={index} component="span" sx={{ display: 'block', mt: 0.5 }}>
                    • {rule.short_name || rule.violation_reason || `Rule ${index + 1}`}
                  </Box>
                ))}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !selectedSubreddit || 
              (postType === 'text' && (
                contentMode === 'rich' 
                  ? !content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
                  : !content.trim()
              )) || 
              (postType === 'link' && !url.trim())}
            startIcon={loading ? <CircularProgress size={16} /> : <RedditIcon />}
            sx={{ bgcolor: '#ff4500', '&:hover': { bgcolor: '#e03d00' } }}
          >
            {loading ? 'Publishing...' : (scheduledFor ? 'Schedule Post' : 'Publish Now')}
          </Button>
        </DialogActions>
      </Dialog>
  );
};

export default RedditPublishDialog;