import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Avatar,
  AvatarGroup,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Drafts as DraftIcon,
} from '@mui/icons-material';
import { Post } from '../types';

interface PostCardProps {
  post: Post;
  onDelete?: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onDelete }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(post.id);
    }
    handleMenuClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'failed':
        return 'error';
      case 'scheduled':
        return 'warning';
      case 'draft':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircleIcon fontSize="small" />;
      case 'failed':
        return <ErrorIcon fontSize="small" />;
      case 'scheduled':
        return <ScheduleIcon fontSize="small" />;
      case 'draft':
        return <DraftIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              {post.content}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip
                label={post.status}
                color={getStatusColor(post.status)}
                size="small"
              />
              
              {post.targetAccounts && post.targetAccounts.length > 0 && (
                <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24 } }}>
                  {post.targetAccounts.map((account: any) => (
                    <Avatar
                      key={account.id}
                      alt={account.username}
                      sx={{ width: 24, height: 24 }}
                    >
                      {account.username.charAt(0).toUpperCase()}
                    </Avatar>
                  ))}
                </AvatarGroup>
              )}
            </Box>
          </Box>
          
          <IconButton onClick={handleMenuClick} size="small">
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Created: {formatDate(post.createdAt)}
          </Typography>
          
          {post.publishedAt && (
            <Typography variant="caption" color="text.secondary">
              Published: {formatDate(post.publishedAt)}
            </Typography>
          )}
          
          {post.scheduledFor && (
            <Typography variant="caption" color="text.secondary">
              Scheduled: {formatDate(post.scheduledFor)}
            </Typography>
          )}
        </Box>
      </CardContent>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {post.status !== 'published' && onDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};

export default PostCard;