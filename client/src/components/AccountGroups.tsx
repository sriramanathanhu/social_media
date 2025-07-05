import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Group,
  AccountCircle,
  Close
} from '@mui/icons-material';
import { HexColorPicker } from 'react-colorful';
import { groupsAPI, accountsAPI } from '../services/api';
import { SocialAccount } from '../types';

interface AccountGroup {
  id: number;
  name: string;
  description: string;
  color: string;
  accounts?: SocialAccount[];
  created_at: string;
}

interface AccountGroupsProps {
  onGroupSelect?: (groupId: string | null) => void;
  selectedGroupId?: string | null;
}

const AccountGroups: React.FC<AccountGroupsProps> = ({ onGroupSelect, selectedGroupId }) => {
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AccountGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#1976D2'
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<AccountGroup | null>(null);
  const [manageAccountsOpen, setManageAccountsOpen] = useState(false);

  useEffect(() => {
    fetchGroups();
    fetchAccounts();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await groupsAPI.getGroups();
      setGroups(response.data.groups || []);
      setError(null);
    } catch (error: any) {
      setError('Failed to fetch groups');
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await accountsAPI.getAccounts();
      setAccounts(response.data.accounts || []);
      setError(null);
    } catch (error: any) {
      setError('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setFormData({ name: '', description: '', color: '#1976D2' });
    setDialogOpen(true);
  };

  const handleEditGroup = (group: AccountGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description,
      color: group.color
    });
    setDialogOpen(true);
    setAnchorEl(null);
  };

  const handleSaveGroup = async () => {
    try {
      if (editingGroup) {
        await groupsAPI.updateGroup(
          editingGroup.id.toString(),
          formData.name,
          formData.description,
          formData.color
        );
      } else {
        await groupsAPI.createGroup(formData.name, formData.description, formData.color);
      }
      
      await fetchGroups();
      setDialogOpen(false);
      setFormData({ name: '', description: '', color: '#1976D2' });
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save group');
    }
  };

  const handleDeleteGroup = async (group: AccountGroup) => {
    try {
      await groupsAPI.deleteGroup(group.id.toString());
      await fetchGroups();
      setAnchorEl(null);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete group');
    }
  };

  const handleManageAccounts = async (group: AccountGroup) => {
    try {
      const response = await groupsAPI.getGroup(group.id.toString());
      setSelectedGroup(response.data.group);
      setManageAccountsOpen(true);
      setAnchorEl(null);
    } catch (error: any) {
      setError('Failed to fetch group details');
    }
  };

  const handleAddAccountToGroup = async (accountId: string) => {
    if (!selectedGroup) return;
    
    try {
      await groupsAPI.addAccountToGroup(selectedGroup.id.toString(), accountId);
      await handleManageAccounts(selectedGroup);
    } catch (error: any) {
      setError('Failed to add account to group');
    }
  };

  const handleRemoveAccountFromGroup = async (accountId: string) => {
    try {
      await groupsAPI.removeAccountFromGroup(accountId);
      if (selectedGroup) {
        await handleManageAccounts(selectedGroup);
      }
    } catch (error: any) {
      setError('Failed to remove account from group');
    }
  };

  const getUnassignedAccounts = () => {
    if (!selectedGroup) return accounts;
    
    const groupAccountIds = selectedGroup.accounts?.map(acc => acc.id.toString()) || [];
    return accounts.filter(account => !groupAccountIds.includes(account.id.toString()));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Account Groups</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateGroup}
        >
          Create Group
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {groups.map((group) => (
          <Grid item xs={12} sm={6} md={4} key={group.id}>
            <Card 
              sx={{ 
                borderLeft: `4px solid ${group.color}`,
                cursor: onGroupSelect ? 'pointer' : 'default',
                backgroundColor: selectedGroupId === group.id.toString() ? 'action.selected' : 'inherit'
              }}
              onClick={() => onGroupSelect?.(group.id.toString())}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" component="h3">
                    {group.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGroup(group);
                      setAnchorEl(e.currentTarget);
                    }}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>
                
                {group.description && (
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {group.description}
                  </Typography>
                )}
                
                <Box display="flex" alignItems="center" gap={1}>
                  <Group fontSize="small" />
                  <Typography variant="caption">
                    {group.accounts?.length || 0} accounts
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Group Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => selectedGroup && handleManageAccounts(selectedGroup)}>
          <Group sx={{ mr: 1 }} />
          Manage Accounts
        </MenuItem>
        <MenuItem onClick={() => selectedGroup && handleEditGroup(selectedGroup)}>
          <Edit sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem 
          onClick={() => selectedGroup && handleDeleteGroup(selectedGroup)}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Create/Edit Group Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingGroup ? 'Edit Group' : 'Create New Group'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Group Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
            
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Group Color
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: formData.color, width: 32, height: 32 }} />
                <HexColorPicker
                  color={formData.color}
                  onChange={(color) => setFormData({ ...formData, color })}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveGroup} 
            variant="contained"
            disabled={!formData.name.trim()}
          >
            {editingGroup ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Accounts Dialog */}
      <Dialog
        open={manageAccountsOpen}
        onClose={() => setManageAccountsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Manage Accounts - {selectedGroup?.name}
            <IconButton onClick={() => setManageAccountsOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Accounts in Group ({selectedGroup?.accounts?.length || 0})
              </Typography>
              <List>
                {selectedGroup?.accounts?.map((account) => (
                  <ListItem key={account.id}>
                    <ListItemAvatar>
                      <Avatar src={account.avatar_url}>
                        <AccountCircle />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={account.display_name || account.username}
                      secondary={`${account.platform} • @${account.username}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        onClick={() => handleRemoveAccountFromGroup(account.id.toString())}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {(!selectedGroup?.accounts || selectedGroup.accounts.length === 0) && (
                  <Typography color="text.secondary">No accounts in this group</Typography>
                )}
              </List>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Available Accounts
              </Typography>
              <List>
                {getUnassignedAccounts().map((account) => (
                  <ListItem key={account.id}>
                    <ListItemAvatar>
                      <Avatar src={account.avatar_url}>
                        <AccountCircle />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={account.display_name || account.username}
                      secondary={`${account.platform} • @${account.username}`}
                    />
                    <ListItemSecondaryAction>
                      <Button
                        onClick={() => handleAddAccountToGroup(account.id.toString())}
                        variant="outlined"
                        size="small"
                      >
                        Add
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {getUnassignedAccounts().length === 0 && (
                  <Typography color="text.secondary">All accounts are assigned</Typography>
                )}
              </List>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AccountGroups;