import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Alert,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Twitter as TwitterIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import api from '../services/api';

interface XAccount {
  id: number;
  username: string;
  status: string;
  hasToken: boolean;
  lastUsed: string | null;
}

interface RateLimit {
  used: number;
  limit: number;
  remaining: number;
  resetTime: string;
}

interface ApiPlan {
  key: string;
  plan_name: string;
  posts_per_month: number;
  posts_per_day: number;
  reads_per_month: number;
}

interface XApiStatusData {
  accounts: XAccount[];
  rateLimits: {
    currentPlan: string;
    daily: RateLimit;
    monthly: RateLimit;
  };
  availablePlans: ApiPlan[];
  recommendations: string[];
}

const XApiStatus: React.FC = () => {
  const [data, setData] = useState<XApiStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/auth/x-api-status');
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch X API status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getUsageColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const formatResetTime = (resetTime: string) => {
    const date = new Date(resetTime);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) return 'Now';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getAccountStatusIcon = (account: XAccount) => {
    if (!account.hasToken) {
      return <ErrorIcon color="error" />;
    }
    if (account.status === 'active') {
      return <CheckCircleIcon color="success" />;
    }
    return <WarningIcon color="warning" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="X API Status" />
        <CardContent>
          <Box display="flex" justifyContent="center" p={2}>
            <LinearProgress sx={{ width: '100%' }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader 
          title="X API Status" 
          action={
            <IconButton onClick={fetchData}>
              <RefreshIcon />
            </IconButton>
          }
        />
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader 
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <TwitterIcon />
            <Typography variant="h6">X API Status</Typography>
          </Box>
        }
        action={
          <Box display="flex" alignItems="center" gap={1}>
            <Chip 
              label={data.rateLimits.currentPlan} 
              color="primary" 
              size="small" 
            />
            <IconButton onClick={fetchData}>
              <RefreshIcon />
            </IconButton>
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* Connected Accounts */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Connected Accounts ({data.accounts.length})
            </Typography>
            {data.accounts.length === 0 ? (
              <Alert severity="info">No X accounts connected</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Username</TableCell>
                      <TableCell>Last Used</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <Tooltip title={
                            !account.hasToken ? 'Token missing' :
                            account.status === 'active' ? 'Active' : 'Inactive'
                          }>
                            {getAccountStatusIcon(account)}
                          </Tooltip>
                        </TableCell>
                        <TableCell>@{account.username}</TableCell>
                        <TableCell>
                          {account.lastUsed 
                            ? new Date(account.lastUsed).toLocaleDateString()
                            : 'Never'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Grid>

          {/* Rate Limits */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Rate Limits
            </Typography>
            
            {/* Daily Limits */}
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" fontWeight="medium">
                  Daily Posts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Resets in {formatResetTime(data.rateLimits.daily.resetTime)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getUsagePercentage(data.rateLimits.daily.used, data.rateLimits.daily.limit)}
                color={getUsageColor(data.rateLimits.daily.used, data.rateLimits.daily.limit)}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Box display="flex" justifyContent="space-between" mt={0.5}>
                <Typography variant="caption">
                  {data.rateLimits.daily.used} / {data.rateLimits.daily.limit} used
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {data.rateLimits.daily.remaining} remaining
                </Typography>
              </Box>
            </Box>

            {/* Monthly Limits */}
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" fontWeight="medium">
                  Monthly Posts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Resets {formatResetTime(data.rateLimits.monthly.resetTime)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getUsagePercentage(data.rateLimits.monthly.used, data.rateLimits.monthly.limit)}
                color={getUsageColor(data.rateLimits.monthly.used, data.rateLimits.monthly.limit)}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Box display="flex" justifyContent="space-between" mt={0.5}>
                <Typography variant="caption">
                  {data.rateLimits.monthly.used} / {data.rateLimits.monthly.limit} used
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {data.rateLimits.monthly.remaining} remaining
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Recommendations
              </Typography>
              {data.recommendations.map((recommendation, index) => (
                <Alert 
                  key={index} 
                  severity="warning" 
                  sx={{ mb: 1 }}
                >
                  {recommendation}
                </Alert>
              ))}
            </Grid>
          )}

          {/* Available Plans */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Available X API Plans
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Plan</TableCell>
                    <TableCell align="right">Posts/Day</TableCell>
                    <TableCell align="right">Posts/Month</TableCell>
                    <TableCell align="right">Reads/Month</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.availablePlans.map((plan) => (
                    <TableRow 
                      key={plan.key}
                      sx={{ 
                        backgroundColor: plan.plan_name === data.rateLimits.currentPlan 
                          ? 'action.selected' 
                          : 'inherit' 
                      }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {plan.plan_name}
                          {plan.plan_name === data.rateLimits.currentPlan && (
                            <Chip label="Current" size="small" color="primary" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {plan.posts_per_day.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {plan.posts_per_month.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {plan.reads_per_month.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default XApiStatus;