import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { SocialAccount } from '../types';

interface AccountCardProps {
  account: SocialAccount;
  onDelete: (accountId: string) => void;
  onVerify: (accountId: string) => void;
}

const AccountCard: React.FC<AccountCardProps> = ({ account, onDelete, onVerify }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = () => {
    onDelete(account.id);
    handleMenuClose();
  };

  const handleVerify = () => {
    onVerify(account.id);
    handleMenuClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'error':
        return 'error';
      case 'expired':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon fontSize="small" />;
      case 'error':
        return <ErrorIcon fontSize="small" />;
      case 'expired':
        return <ScheduleIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const getPlatformDisplayName = (platform: string) => {
    switch (platform) {
      case 'mastodon':
        return 'Mastodon';
      case 'x':
        return 'X (Twitter)';
      default:
        return platform.charAt(0).toUpperCase() + platform.slice(1);
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              src={account.avatar}
              alt={account.displayName || account.username}
              sx={{ mr: 2 }}
            >
              {(account.displayName || account.username).charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" component="div">
                {account.displayName || account.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                @{account.username}
              </Typography>
              {account.instanceUrl && (
                <Typography variant="caption" color="text.secondary">
                  {account.instanceUrl}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Chip
              label={getPlatformDisplayName(account.platform)}
              size="small"
              sx={{ mr: 1 }}
            />
            <Chip
              label={account.status}
              color={getStatusColor(account.status)}
              size="small"
              sx={{ mr: 1 }}
            />
            <IconButton onClick={handleMenuClick}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>
        
        {account.lastUsed && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Last used: {new Date(account.lastUsed).toLocaleString()}
          </Typography>
        )}
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
        <MenuItem onClick={handleVerify}>
          <ListItemIcon>
            <RefreshIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Verify Connection</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Disconnect</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default AccountCard;