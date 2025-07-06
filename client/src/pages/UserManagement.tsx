import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Menu,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  MoreVert,
  PersonAdd,
  Delete,
  AdminPanelSettings,
  PersonRemove,
  Block
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { adminApi } from '../services/api';
import { User } from '../types';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'makeAdmin' | 'removeAdmin' | 'suspend' | 'delete' | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = useState<User | null>(null);
  
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllUsers();
      setUsers(response.data);
      setError(null);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedUser || !actionType) return;

    try {
      switch (actionType) {
        case 'approve':
          await adminApi.updateUserStatus(selectedUser.id, 'approved');
          break;
        case 'reject':
          await adminApi.updateUserStatus(selectedUser.id, 'rejected');
          break;
        case 'makeAdmin':
          await adminApi.makeAdmin(selectedUser.id);
          break;
        case 'removeAdmin':
          await adminApi.removeAdmin(selectedUser.id);
          break;
        case 'suspend':
          await adminApi.updateUserStatus(selectedUser.id, 'rejected');
          break;
        case 'delete':
          // Delete user endpoint would need to be implemented
          console.log('Delete user not implemented');
          break;
      }
      
      await fetchUsers();
      setDialogOpen(false);
      setSelectedUser(null);
      setActionType(null);
    } catch (error: any) {
      setError(error.response?.data?.error || `Failed to ${actionType} user`);
    }
  };

  const openActionDialog = (user: User, action: typeof actionType) => {
    setSelectedUser(user);
    setActionType(action);
    setDialogOpen(true);
    setAnchorEl(null);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getRoleColor = (role?: string) => {
    return role === 'admin' ? 'primary' : 'default';
  };

  const getActionText = () => {
    switch (actionType) {
      case 'approve': return 'approve';
      case 'reject': return 'reject';
      case 'makeAdmin': return 'promote to admin';
      case 'removeAdmin': return 'remove admin privileges';
      case 'suspend': return 'suspend';
      case 'delete': return 'delete';
      default: return '';
    }
  };

  const canPerformAction = (targetUser: User) => {
    // Only admins can perform actions
    if (user?.role !== 'admin') return false;
    
    // Can't perform actions on yourself
    if (targetUser.id === user?.id) return false;
    
    return true;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((userData) => (
              <TableRow key={userData.id}>
                <TableCell>{userData.email}</TableCell>
                <TableCell>
                  <Chip
                    label={userData.role || 'user'}
                    color={getRoleColor(userData.role) as any}
                    size="small"
                    icon={userData.role === 'admin' ? <AdminPanelSettings /> : undefined}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={userData.status || 'pending'}
                    color={getStatusColor(userData.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(userData.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  {canPerformAction(userData) && (
                    <>
                      {userData.status === 'pending' && (
                        <>
                          <IconButton
                            color="success"
                            onClick={() => openActionDialog(userData, 'approve')}
                            title="Approve user"
                          >
                            <CheckCircle />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => openActionDialog(userData, 'reject')}
                            title="Reject user"
                          >
                            <Cancel />
                          </IconButton>
                        </>
                      )}
                      <IconButton
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setMenuUser(userData);
                        }}
                        title="More actions"
                      >
                        <MoreVert />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Confirmation Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>
          Confirm Action
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {getActionText()} user "{selectedUser?.email}"?
            {actionType === 'makeAdmin' && (
              <Typography color="warning.main" sx={{ mt: 1 }}>
                This will give the user full administrative privileges.
              </Typography>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAction} 
            color={actionType === 'reject' || actionType === 'delete' ? 'error' : 'primary'}
            variant="contained"
          >
            {getActionText()}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setAnchorEl(null);
          setMenuUser(null);
        }}
      >
        {menuUser && (
          <>
            {menuUser.role !== 'admin' && (
              <MenuItem onClick={() => openActionDialog(menuUser, 'makeAdmin')}>
                <AdminPanelSettings sx={{ mr: 1 }} />
                Make Admin
              </MenuItem>
            )}
            {menuUser.role === 'admin' && menuUser.id !== user?.id && (
              <MenuItem onClick={() => openActionDialog(menuUser, 'removeAdmin')}>
                <PersonRemove sx={{ mr: 1 }} />
                Remove Admin
              </MenuItem>
            )}
            {menuUser.status === 'approved' && (
              <MenuItem onClick={() => openActionDialog(menuUser, 'suspend')}>
                <Block sx={{ mr: 1 }} />
                Suspend User
              </MenuItem>
            )}
            {menuUser.status === 'rejected' && (
              <MenuItem onClick={() => openActionDialog(menuUser, 'approve')}>
                <CheckCircle sx={{ mr: 1 }} />
                Reactivate User
              </MenuItem>
            )}
          </>
        )}
      </Menu>
    </Box>
  );
};

export default UserManagement;