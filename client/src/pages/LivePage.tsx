import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Fab,
  Dialog,
  Chip,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Videocam as LiveIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  HelpOutline as HelpIcon,
  Videocam as RTMPIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import CreateStreamDialog from '../components/CreateStreamDialog';
import StreamingGuide from '../components/StreamingGuide';
import StreamRTMPInfo from '../components/StreamRTMPInfo';
import NimbleStatus from '../components/NimbleStatus';

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  status: 'inactive' | 'live' | 'ended' | 'error';
  stream_key: string;
  rtmp_url: string;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  auto_post_enabled: boolean;
  auto_post_accounts: string[];
  stats?: {
    session_count: number;
    total_duration: number;
    max_viewers: number;
    total_viewers: number;
  };
  republishing_count?: number;
  active_republishing?: number;
}

interface StreamSession {
  id: string;
  stream_id: string;
  started_at: string;
  status: 'active' | 'ended' | 'error';
  peak_viewers?: number;
  total_viewers?: number;
  connection_quality?: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`live-tabpanel-${index}`}
      aria-labelledby={`live-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const LivePage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [activeSessions, setActiveSessions] = useState<StreamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [rtmpInfoOpen, setRtmpInfoOpen] = useState(false);
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);

  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    fetchStreams();
    fetchActiveSessions();
  }, [token]);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/live`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch streams');
      }

      const data = await response.json();
      setStreams(data.streams || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch streams');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://socialmedia-p3ln.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/live/sessions/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch active sessions');
      }

      const data = await response.json();
      setActiveSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to fetch active sessions:', err);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'error';
      case 'inactive': return 'default';
      case 'ended': return 'success';
      case 'error': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live': return <LiveIcon sx={{ color: 'red' }} />;
      case 'inactive': return <StopIcon />;
      case 'ended': return <StopIcon sx={{ color: 'green' }} />;
      case 'error': return <StopIcon sx={{ color: 'orange' }} />;
      default: return <StopIcon />;
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  };

  const handleShowRTMPInfo = (streamId: string) => {
    setSelectedStreamId(streamId);
    setRtmpInfoOpen(true);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 8, mb: 4, pt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 8, mb: 4, pt: 4, position: 'relative', zIndex: 1 }}>
      <Box sx={{ mb: 4, mt: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3,
          py: 2
        }}>
          <Typography variant="h4" component="h1">
            Live Streaming
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
            width: { xs: '100%', sm: 'auto' }
          }}>
            <Button
              variant="outlined"
              startIcon={<HelpIcon />}
              onClick={() => setGuideOpen(true)}
              sx={{ minWidth: 140 }}
            >
              How it Works
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{ minWidth: 140 }}
            >
              Create Stream
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="live streaming tabs">
          <Tab label={`My Streams (${streams.length})`} />
          <Tab label={`Active Sessions (${activeSessions.length})`} />
          <Tab label="Analytics" />
          <Tab label="Settings" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {streams.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <LiveIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No streams created yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Create your first live stream to start broadcasting to multiple platforms simultaneously
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                🎯 Stream once, reach everywhere: YouTube, Twitch, Facebook, Twitter & more
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<HelpIcon />}
                  onClick={() => setGuideOpen(true)}
                >
                  How it Works
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create Stream
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {streams.map((stream) => (
              <Grid item xs={12} md={6} lg={4} key={stream.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="h3" noWrap>
                        {stream.title}
                      </Typography>
                      <Chip
                        icon={getStatusIcon(stream.status)}
                        label={stream.status.toUpperCase()}
                        color={getStatusColor(stream.status)}
                        size="small"
                      />
                    </Box>

                    {stream.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {stream.description}
                      </Typography>
                    )}

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" display="block">
                        Stream Key: {stream.stream_key.substring(0, 8)}...
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Created: {new Date(stream.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>

                    {stream.stats && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" display="block">
                          Sessions: {stream.stats.session_count} | 
                          Max Viewers: {stream.stats.max_viewers} |
                          Total Time: {formatDuration(stream.stats.total_duration)}
                        </Typography>
                      </Box>
                    )}

                    {stream.auto_post_enabled && (
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={`Auto-post to ${stream.auto_post_accounts.length} accounts`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    )}

                    {(stream.republishing_count || 0) > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={`${stream.active_republishing || 0}/${stream.republishing_count || 0} destinations active`}
                          size="small"
                          color={(stream.active_republishing || 0) > 0 ? 'primary' : 'default'}
                          variant="outlined"
                        />
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {stream.status === 'inactive' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          startIcon={<StartIcon />}
                        >
                          Start Stream
                        </Button>
                      )}
                      {stream.status === 'live' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<StopIcon />}
                        >
                          Stop Stream
                        </Button>
                      )}
                      <Button 
                        size="small" 
                        startIcon={<RTMPIcon />}
                        onClick={() => handleShowRTMPInfo(stream.id)}
                      >
                        OBS Setup
                      </Button>
                      <Button size="small" startIcon={<SettingsIcon />}>
                        Settings
                      </Button>
                      <Button size="small" startIcon={<AnalyticsIcon />}>
                        Analytics
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {activeSessions.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <LiveIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No active sessions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start a stream to see active sessions here
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {activeSessions.map((session) => (
              <Grid item xs={12} md={6} key={session.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Active Session</Typography>
                      <Chip
                        icon={<LiveIcon />}
                        label="LIVE"
                        color="error"
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" gutterBottom>
                      Started: {new Date(session.started_at).toLocaleString()}
                    </Typography>
                    
                    {session.peak_viewers !== undefined && (
                      <Typography variant="body2" gutterBottom>
                        Peak Viewers: {session.peak_viewers}
                      </Typography>
                    )}
                    
                    {session.connection_quality !== undefined && (
                      <Typography variant="body2" gutterBottom>
                        Connection Quality: {Math.round(session.connection_quality * 100)}%
                      </Typography>
                    )}
                    
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<StopIcon />}
                      sx={{ mt: 2 }}
                    >
                      End Session
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <AnalyticsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Analytics Coming Soon
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Detailed streaming analytics will be available here
            </Typography>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <NimbleStatus />
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🎛️ Stream Server Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Your streams are powered by Nimble Streamer for optimal performance and multi-platform distribution.
                </Typography>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>How it works:</strong><br />
                    • OBS Studio streams to Nimble Streamer via RTMP<br />
                    • Nimble automatically republishes to your configured platforms<br />
                    • Real-time monitoring ensures optimal stream quality<br />
                    • One stream input, multiple platform outputs
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Create Stream Dialog */}
      <CreateStreamDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onStreamCreated={fetchStreams}
      />

      {/* Streaming Guide */}
      <StreamingGuide
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      />

      {/* RTMP Info Dialog */}
      {selectedStreamId && (
        <StreamRTMPInfo
          open={rtmpInfoOpen}
          onClose={() => {
            setRtmpInfoOpen(false);
            setSelectedStreamId(null);
          }}
          streamId={selectedStreamId}
        />
      )}
    </Container>
  );
};

export default LivePage;