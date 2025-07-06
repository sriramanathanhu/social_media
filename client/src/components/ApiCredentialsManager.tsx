import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';

interface ApiCredential {
  id: number;
  platform: string;
  client_id: string;
  status: string;
  created_at: string;
}

const ApiCredentialsManager: React.FC = () => {
  const { token } = useSelector((state: RootState) => state.auth);
  const [credentials, setCredentials] = useState<ApiCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    platform: 'x',
    clientId: '',
    clientSecret: ''
  });

  useEffect(() => {
    if (token) {
      fetchCredentials();
    }
  }, [token]);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/api-credentials');
      setCredentials(response.data.credentials);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to fetch API credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredentials = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/admin/api-credentials', {
        platform: formData.platform,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret
      });
      
      setSuccess('API credentials added successfully!');
      setDialogOpen(false);
      setFormData({ platform: 'x', clientId: '', clientSecret: '' });
      await fetchCredentials();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to add API credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCredentials = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete these API credentials?')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/admin/api-credentials/${id}`);
      setSuccess('API credentials deleted successfully!');
      await fetchCredentials();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete API credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleTestCredentials = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/admin/api-credentials/test', {
        platform: formData.platform,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret
      });
      
      if (response.data.valid) {
        setSuccess('Credentials are valid!');
      } else {
        setError('Credentials are invalid');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to test credentials');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformDisplayName = (platform: string) => {
    switch (platform) {
      case 'x':
        return 'X (Twitter)';
      case 'pinterest':
        return 'Pinterest';
      default:
        return platform.charAt(0).toUpperCase() + platform.slice(1);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          API Credentials Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Credentials
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current API Credentials
          </Typography>
          
          {credentials.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No API credentials configured. Add credentials to enable social platform connections.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Platform</TableCell>
                    <TableCell>Client ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {credentials.map((cred) => (
                    <TableRow key={cred.id}>
                      <TableCell>
                        <Chip 
                          label={getPlatformDisplayName(cred.platform)} 
                          size="small" 
                          color="primary"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {cred.client_id.substring(0, 10)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={cred.status}
                          size="small"
                          color={cred.status === 'active' ? 'success' : 'default'}
                          icon={cred.status === 'active' ? <CheckIcon /> : <CloseIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(cred.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteCredentials(cred.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add Credentials Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add API Credentials</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Platform</InputLabel>
              <Select
                value={formData.platform}
                label="Platform"
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              >
                <MenuItem value="x">X (Twitter)</MenuItem>
                <MenuItem value="pinterest">Pinterest</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Client ID (API Key)"
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              sx={{ mb: 2 }}
              placeholder="BrgxLiBmUBXvyKpm5qme6ckIE"
            />
            
            <TextField
              fullWidth
              label="Client Secret (API Secret)"
              type="password"
              value={formData.clientSecret}
              onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
              sx={{ mb: 2 }}
              placeholder="Enter your API secret key"
            />
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={handleTestCredentials}
                disabled={loading || !formData.clientId || !formData.clientSecret}
              >
                Test Credentials
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddCredentials}
            disabled={loading || !formData.clientId || !formData.clientSecret}
          >
            Add Credentials
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApiCredentialsManager;