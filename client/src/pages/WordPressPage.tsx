import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Box,
  Alert,
  CircularProgress,
  Fab,
  Dialog,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Web as WordPressIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { wordpressAPI } from '../services/api';
import WordPressConnectDialog from '../components/WordPressConnectDialog';
import WordPressPublishDialog from '../components/WordPressPublishDialog';

interface WordPressSite {
  id: number;
  siteUrl: string;
  username: string;
  displayName: string;
  siteTitle: string;
  status: string;
  lastUsed: string | null;
  createdAt: string;
  updatedAt: string;
}

const WordPressPage: React.FC = () => {
  const [sites, setSites] = useState<WordPressSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<WordPressSite | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);

  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (token) {
      fetchSites();
    }
  }, [token]);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const response = await wordpressAPI.getSites();
      setSites(response.data.sites || []);
    } catch (err: any) {
      setError(err.response?.data?.details || 'Failed to fetch WordPress sites');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSite = () => {
    setConnectDialogOpen(true);
  };

  const handleSiteConnected = (newSite: WordPressSite) => {
    setSites(prev => [newSite, ...prev]);
    setConnectDialogOpen(false);
  };

  const handlePublishToSite = (site: WordPressSite) => {
    setSelectedSite(site);
    setPublishDialogOpen(true);
  };

  const handleSyncSite = async (site: WordPressSite) => {
    try {
      setSyncing(site.id);
      await wordpressAPI.syncSiteData(site.id.toString());
      // Show success message or update UI as needed
    } catch (err: any) {
      setError(err.response?.data?.details || 'Failed to sync site data');
    } finally {
      setSyncing(null);
    }
  };

  const handleDeleteSite = async (site: WordPressSite) => {
    if (!window.confirm(`Are you sure you want to disconnect "${site.siteTitle}"?`)) {
      return;
    }

    try {
      await wordpressAPI.deleteSite(site.id.toString());
      setSites(prev => prev.filter(s => s.id !== site.id));
    } catch (err: any) {
      setError(err.response?.data?.details || 'Failed to disconnect site');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WordPressIcon sx={{ fontSize: 40, color: '#21759b' }} />
          <Box>
            <Typography variant="h4" component="h1">
              WordPress Publishing
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage and publish to your WordPress sites
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleConnectSite}
          sx={{ bgcolor: '#21759b', '&:hover': { bgcolor: '#1e6ba8' } }}
        >
          Connect Site
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Sites Grid */}
      {sites.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <WordPressIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No WordPress Sites Connected
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Connect your first WordPress site to start publishing content directly from here.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleConnectSite}
              sx={{ bgcolor: '#21759b', '&:hover': { bgcolor: '#1e6ba8' } }}
            >
              Connect Your First Site
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {sites.map((site) => (
            <Grid item xs={12} sm={6} md={4} key={site.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <WordPressIcon sx={{ color: '#21759b', fontSize: 32 }} />
                    <Chip
                      label={site.status}
                      color={site.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="h6" component="h2" gutterBottom noWrap>
                    {site.siteTitle}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom noWrap>
                    {site.siteUrl}
                  </Typography>
                  
                  <Typography variant="caption" display="block" color="text.secondary">
                    Connected as: {site.displayName || site.username}
                  </Typography>
                  
                  <Typography variant="caption" display="block" color="text.secondary">
                    Added: {formatDate(site.createdAt)}
                  </Typography>
                  
                  {site.lastUsed && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      Last used: {formatDate(site.lastUsed)}
                    </Typography>
                  )}
                </CardContent>
                
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => handlePublishToSite(site)}
                    sx={{ bgcolor: '#21759b', '&:hover': { bgcolor: '#1e6ba8' } }}
                  >
                    Publish
                  </Button>
                  
                  <Tooltip title="Sync categories and tags">
                    <IconButton
                      size="small"
                      onClick={() => handleSyncSite(site)}
                      disabled={syncing === site.id}
                    >
                      {syncing === site.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <SyncIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Open WordPress admin">
                    <IconButton
                      size="small"
                      onClick={() => window.open(`${site.siteUrl}/wp-admin`, '_blank')}
                    >
                      <LaunchIcon />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Disconnect site">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteSite(site)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Floating Action Button for Quick Publish */}
      {sites.length > 0 && (
        <Fab
          color="primary"
          aria-label="quick publish"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            bgcolor: '#21759b',
            '&:hover': { bgcolor: '#1e6ba8' }
          }}
          onClick={() => {
            if (sites.length === 1) {
              handlePublishToSite(sites[0]);
            } else {
              // If multiple sites, show site selection or use the first one
              handlePublishToSite(sites[0]);
            }
          }}
        >
          <EditIcon />
        </Fab>
      )}

      {/* Dialogs */}
      <WordPressConnectDialog
        open={connectDialogOpen}
        onClose={() => setConnectDialogOpen(false)}
        onSiteConnected={handleSiteConnected}
      />

      <WordPressPublishDialog
        open={publishDialogOpen}
        onClose={() => setPublishDialogOpen(false)}
        site={selectedSite}
        onPublished={() => {
          setPublishDialogOpen(false);
          // Optionally refresh data or show success message
        }}
      />
    </Container>
  );
};

export default WordPressPage;