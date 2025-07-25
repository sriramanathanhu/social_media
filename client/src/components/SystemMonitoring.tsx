import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import api from '../services/api';

interface SystemHealth {
  memory: {
    used: string;
    total: string;
    external: string;
    usage: string;
  };
  uptime: {
    seconds: number;
    formatted: string;
  };
  pid: number;
  nodeVersion: string;
}

interface PerformanceMetrics {
  endpoints: Record<string, {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: string;
    cacheHitRate: string;
    lastRequest: string;
  }>;
  systemHealth: SystemHealth;
  activeAlerts: Array<{
    id: number;
    type: string;
    timestamp: string;
    data: any;
    resolved: boolean;
  }>;
  lastUpdated: string;
}

interface RedisMetrics {
  operations: {
    total: number;
    gets: number;
    sets: number;
    hitRate: string;
  };
  performance: {
    avgGetTime: string;
    avgSetTime: string;
  };
  redisInfo: any;
}

interface DatabaseMetrics {
  totalQueries: number;
  slowQueries: number;
  averageQueryTime: string;
  slowQueryThreshold: string;
  recentSlowQueries: Array<{
    query: string;
    duration: string;
    timestamp: string;
  }>;
}

interface MonitoringData {
  status: string;
  timestamp: string;
  performance: PerformanceMetrics;
  redis: RedisMetrics;
  database: DatabaseMetrics;
  system: SystemHealth;
}

const SystemMonitoring: React.FC = () => {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/monitoring/health');
      setData(response.data);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'success';
      case 'Warning': return 'warning';
      case 'Error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK': return <CheckCircleIcon color="success" />;
      case 'Warning': return <WarningIcon color="warning" />;
      case 'Error': return <ErrorIcon color="error" />;
      default: return <SpeedIcon />;
    }
  };

  const parseUsagePercentage = (usage: string): number => {
    return parseInt(usage.replace('%', ''));
  };

  if (loading && !data) {
    return (
      <Box p={3}>
        <Typography variant="h6" gutterBottom>
          System Monitoring
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Failed to load monitoring data: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" gutterBottom>
          System Monitoring
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" color="textSecondary">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchMonitoringData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {data && (
        <Grid container spacing={3}>
          {/* System Status Overview */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title="System Status"
                avatar={getStatusIcon(data.status)}
                action={
                  <Chip
                    label={data.status}
                    color={getStatusColor(data.status) as any}
                    variant="outlined"
                  />
                }
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <MemoryIcon color="primary" />
                      <Typography variant="body2">
                        Memory: {data.system.memory.used}/{data.system.memory.total} ({data.system.memory.usage})
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={parseUsagePercentage(data.system.memory.usage)}
                      sx={{ mt: 1 }}
                      color={parseUsagePercentage(data.system.memory.usage) > 80 ? 'warning' : 'primary'}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2">
                      <strong>Uptime:</strong> {data.system.uptime.formatted}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2">
                      <strong>Node.js:</strong> {data.system.nodeVersion}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2">
                      <strong>PID:</strong> {data.system.pid}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Active Alerts */}
          {data.performance.activeAlerts.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardHeader
                  title="Active Alerts"
                  avatar={<WarningIcon color="warning" />}
                />
                <CardContent>
                  {data.performance.activeAlerts.map((alert) => (
                    <Alert key={alert.id} severity="warning" sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        <strong>{alert.type.replace(/_/g, ' ').toUpperCase()}:</strong> {alert.data.endpoint} 
                        (Value: {alert.data.value}, Threshold: {alert.data.threshold})
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(alert.timestamp).toLocaleString()}
                      </Typography>
                    </Alert>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Performance Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader
                title="API Performance"
                avatar={<TimelineIcon color="primary" />}
              />
              <CardContent>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Endpoint</TableCell>
                      <TableCell align="right">Requests</TableCell>
                      <TableCell align="right">Avg Time</TableCell>
                      <TableCell align="right">Cache Hit</TableCell>
                      <TableCell align="right">Error Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(data.performance.endpoints).map(([endpoint, metrics]) => (
                      <TableRow key={endpoint}>
                        <TableCell component="th" scope="row">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {endpoint}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{metrics.totalRequests}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={metrics.averageResponseTime + 'ms'}
                            size="small"
                            color={metrics.averageResponseTime > 1000 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={metrics.cacheHitRate}
                            size="small"
                            color={parseFloat(metrics.cacheHitRate) > 70 ? 'success' : 'warning'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={metrics.errorRate}
                            size="small"
                            color={parseFloat(metrics.errorRate) > 5 ? 'error' : 'success'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          {/* Redis Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader
                title="Redis Cache"
                avatar={<StorageIcon color="primary" />}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2">
                      <strong>Operations:</strong> {data.redis.operations.total} total 
                      ({data.redis.operations.gets} gets, {data.redis.operations.sets} sets)
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2">
                      <strong>Hit Rate:</strong> 
                      <Chip
                        label={data.redis.operations.hitRate}
                        size="small"
                        color={parseFloat(data.redis.operations.hitRate) > 70 ? 'success' : 'warning'}
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Avg GET:</strong> {data.redis.performance.avgGetTime}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Avg SET:</strong> {data.redis.performance.avgSetTime}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Database Metrics */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Database Performance</Typography>
                <Box sx={{ ml: 2 }}>
                  <Chip
                    label={`${data.database.totalQueries} queries`}
                    size="small"
                    color="primary"
                  />
                  {data.database.slowQueries > 0 && (
                    <Chip
                      label={`${data.database.slowQueries} slow`}
                      size="small"
                      color="warning"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2">
                      <strong>Average Query Time:</strong> {data.database.averageQueryTime}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Slow Query Threshold:</strong> {data.database.slowQueryThreshold}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    {data.database.recentSlowQueries.length > 0 && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          Recent Slow Queries
                        </Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Query</TableCell>
                              <TableCell align="right">Duration</TableCell>
                              <TableCell align="right">Time</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {data.database.recentSlowQueries.map((query, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                    {query.query}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Chip label={query.duration} size="small" color="warning" />
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="caption">
                                    {new Date(query.timestamp).toLocaleTimeString()}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </>
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default SystemMonitoring;