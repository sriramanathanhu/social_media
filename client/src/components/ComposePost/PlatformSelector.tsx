import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Avatar,
  Chip,
  Button,
  Select,
  MenuItem,
  InputLabel,
  Grid
} from '@mui/material';
import {
  SelectAll as SelectAllIcon,
  Clear as DeselectAllIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { AccountGroup } from '../../hooks/useAccountSelection';

interface PlatformSelectorProps {
  selectedAccounts: string[];
  groups: AccountGroup[];
  selectedGroupId: string;
  onAccountToggle: (accountId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onGroupSelect: (group: AccountGroup) => void;
  onGroupClear: () => void;
}

const PlatformSelector: React.FC<PlatformSelectorProps> = React.memo(({
  selectedAccounts,
  groups,
  selectedGroupId,
  onAccountToggle,
  onSelectAll,
  onDeselectAll,
  onGroupSelect,
  onGroupClear
}) => {
  const { accounts, loading } = useSelector((state: RootState) => state.accounts);

  const handleGroupChange = useCallback((groupId: string) => {
    if (groupId === '') {
      onGroupClear();
    } else {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        onGroupSelect(group);
      }
    }
  }, [groups, onGroupSelect, onGroupClear]);

  const getAccountColor = (platform: string) => {
    const colors: Record<string, string> = {
      mastodon: '#6364FF',
      x: '#1DA1F2',
      twitter: '#1DA1F2',
      pinterest: '#E60023',
      bluesky: '#00A8E8',
      facebook: '#1877F2',
      instagram: '#E4405F'
    };
    return colors[platform] || '#757575';
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Loading accounts...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Select Accounts ({selectedAccounts.length} selected)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<SelectAllIcon />}
            onClick={onSelectAll}
            disabled={selectedAccounts.length === accounts.length}
          >
            All
          </Button>
          <Button
            size="small"
            startIcon={<DeselectAllIcon />}
            onClick={onDeselectAll}
            disabled={selectedAccounts.length === 0}
          >
            None
          </Button>
        </Box>
      </Box>

      {groups.length > 0 && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Quick Select Group</InputLabel>
          <Select
            value={selectedGroupId}
            onChange={(e) => handleGroupChange(e.target.value)}
            label="Quick Select Group"
            size="small"
          >
            <MenuItem value="">
              <em>No group selected</em>
            </MenuItem>
            {groups.map((group) => (
              <MenuItem key={group.id} value={group.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupIcon fontSize="small" />
                  {group.name} ({group.accountIds.length} accounts)
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControl component="fieldset" fullWidth>
        <FormLabel component="legend">Available Accounts</FormLabel>
        <FormGroup>
          <Grid container spacing={1}>
            {accounts.map((account) => (
              <Grid item xs={12} sm={6} md={4} key={account.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedAccounts.includes(account.id)}
                      onChange={() => onAccountToggle(account.id)}
                      disabled={account.status !== 'active'}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Avatar
                        src={account.avatar}
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: getAccountColor(account.platform)
                        }}
                      >
                        {account.username[0]?.toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" noWrap>
                          {account.displayName || account.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          @{account.username} • {account.platform}
                        </Typography>
                      </Box>
                      <Chip
                        label={account.status}
                        size="small"
                        color={account.status === 'active' ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </Box>
                  }
                  sx={{ 
                    margin: 0,
                    width: '100%',
                    '& .MuiFormControlLabel-label': {
                      width: '100%',
                      minWidth: 0
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </FormGroup>
      </FormControl>

      {accounts.length === 0 && (
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
          No social media accounts connected. Please connect at least one account to post.
        </Typography>
      )}
    </Box>
  );
});

PlatformSelector.displayName = 'PlatformSelector';

export default PlatformSelector;