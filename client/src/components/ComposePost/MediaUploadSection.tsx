import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Image as ImageIcon,
  VideoFile as VideoIcon,
  Close as CloseIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';

interface MediaUploadSectionProps {
  selectedImages: File[];
  selectedVideos: File[];
  mediaProcessing: boolean;
  hasBluesky: boolean;
  onImageUpload: (files: FileList | File[]) => Promise<void>;
  onVideoUpload: (files: FileList | File[]) => void;
  onRemoveImage: (index: number) => void;
  onRemoveVideo: (index: number) => void;
}

const MediaUploadSection: React.FC<MediaUploadSectionProps> = React.memo(({
  selectedImages,
  selectedVideos,
  mediaProcessing,
  hasBluesky,
  onImageUpload,
  onVideoUpload,
  onRemoveImage,
  onRemoveVideo
}) => {
  const handleImageInputChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      try {
        await onImageUpload(files);
      } catch (error) {
        console.error('Failed to upload images:', error);
      }
      // Reset input
      event.target.value = '';
    }
  }, [onImageUpload]);

  const handleVideoInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onVideoUpload(files);
      // Reset input
      event.target.value = '';
    }
  }, [onVideoUpload]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }, []);

  const totalMediaCount = selectedImages.length + selectedVideos.length;
  const hasMedia = totalMediaCount > 0;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Media Upload {hasMedia && `(${totalMediaCount} files)`}
      </Typography>

      {hasBluesky && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Images will be automatically compressed for Bluesky (max 1MB per image)
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          component="label"
          startIcon={<ImageIcon />}
          disabled={mediaProcessing}
        >
          Add Images
          <input
            type="file"
            hidden
            multiple
            accept="image/*"
            onChange={handleImageInputChange}
          />
        </Button>

        <Button
          variant="outlined"
          component="label"
          startIcon={<VideoIcon />}
          disabled={mediaProcessing}
        >
          Add Videos
          <input
            type="file"
            hidden
            multiple
            accept="video/*"
            onChange={handleVideoInputChange}
          />
        </Button>
      </Box>

      {mediaProcessing && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Processing images...
          </Typography>
          <LinearProgress />
        </Box>
      )}

      {/* Selected Images */}
      {selectedImages.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Images ({selectedImages.length})
          </Typography>
          <Grid container spacing={2}>
            {selectedImages.map((file, index) => (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <MediaPreviewCard
                  file={file}
                  type="image"
                  onRemove={() => onRemoveImage(index)}
                  formatFileSize={formatFileSize}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Selected Videos */}
      {selectedVideos.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Videos ({selectedVideos.length})
          </Typography>
          <Grid container spacing={2}>
            {selectedVideos.map((file, index) => (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <MediaPreviewCard
                  file={file}
                  type="video"
                  onRemove={() => onRemoveVideo(index)}
                  formatFileSize={formatFileSize}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {!hasMedia && !mediaProcessing && (
        <Box
          sx={{
            border: '2px dashed #ccc',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            color: 'text.secondary'
          }}
        >
          <UploadIcon sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="body1" gutterBottom>
            No media selected
          </Typography>
          <Typography variant="body2">
            Click "Add Images" or "Add Videos" to upload media files
          </Typography>
        </Box>
      )}
    </Box>
  );
});

interface MediaPreviewCardProps {
  file: File;
  type: 'image' | 'video';
  onRemove: () => void;
  formatFileSize: (bytes: number) => string;
}

const MediaPreviewCard: React.FC<MediaPreviewCardProps> = React.memo(({
  file,
  type,
  onRemove,
  formatFileSize
}) => {
  const [preview, setPreview] = React.useState<string>('');

  React.useEffect(() => {
    if (type === 'image') {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [file, type]);

  return (
    <Card sx={{ position: 'relative', height: 200 }}>
      <IconButton
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          bgcolor: 'rgba(0,0,0,0.5)',
          color: 'white',
          zIndex: 1,
          '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
        }}
        size="small"
        onClick={onRemove}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      <CardContent sx={{ p: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'grey.100',
          borderRadius: 1,
          mb: 1,
          overflow: 'hidden'
        }}>
          {type === 'image' && preview ? (
            <img
              src={preview}
              alt={file.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <VideoIcon sx={{ fontSize: 48, color: 'grey.400' }} />
          )}
        </Box>

        <Typography variant="caption" noWrap sx={{ fontWeight: 'medium' }}>
          {file.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Chip
            label={formatFileSize(file.size)}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
          <Chip
            label={type}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
});

MediaUploadSection.displayName = 'MediaUploadSection';
MediaPreviewCard.displayName = 'MediaPreviewCard';

export default MediaUploadSection;