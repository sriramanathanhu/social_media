import React from 'react';
import {
  Paper,
  Typography,
  Grid,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Create as CreateIcon,
  AccountCircle as AccountIcon,
  Analytics as AnalyticsIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchAccounts } from '../store/slices/accountsSlice';
import { fetchPosts } from '../store/slices/postsSlice';

const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { accounts } = useSelector((state: RootState) => state.accounts);
  const { posts } = useSelector((state: RootState) => state.posts);

  const activeAccounts = accounts.filter(account => account.status === 'active');
  const hasActiveAccounts = activeAccounts.length > 0;

  const actionCards = [
    {
      title: 'Create Post',
      description: 'Compose and publish content to your social media accounts',
      icon: <CreateIcon sx={{ fontSize: 32 }} />,
      color: 'primary',
      action: () => navigate('/compose'),
      disabled: !hasActiveAccounts,
      disabledReason: 'Connect an account first',
    },
    {
      title: 'Manage Accounts',
      description: 'Connect, disconnect, and verify your social media accounts',
      icon: <AccountIcon sx={{ fontSize: 32 }} />,
      color: 'secondary',
      action: () => navigate('/accounts'),
      disabled: false,
    },
    {
      title: 'View Posts',
      description: 'See your published, scheduled, and draft posts',
      icon: <AnalyticsIcon sx={{ fontSize: 32 }} />,
      color: 'info',
      action: () => navigate('/posts'),
      disabled: false,
    },
    {
      title: 'Refresh Data',
      description: 'Update account status and sync latest posts',
      icon: <RefreshIcon sx={{ fontSize: 32 }} />,
      color: 'success',
      action: () => {
        dispatch(fetchAccounts());
        dispatch(fetchPosts());
      },
      disabled: false,
    },
  ];

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Quick Actions
      </Typography>
      
      <Grid container spacing={2}>
        {actionCards.map((card, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                opacity: card.disabled ? 0.6 : 1,
                cursor: card.disabled ? 'not-allowed' : 'pointer',
                '&:hover': {
                  boxShadow: card.disabled ? 1 : 4,
                  transform: card.disabled ? 'none' : 'translateY(-2px)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ color: `${card.color}.main`, mr: 1 }}>
                    {card.icon}
                  </Box>
                  <Typography variant="h6" component="div">
                    {card.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {card.disabled && card.disabledReason 
                    ? card.disabledReason 
                    : card.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color={card.color as any}
                  onClick={card.action}
                  disabled={card.disabled}
                >
                  {card.title}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {!hasActiveAccounts && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.contrastText" align="center">
            💡 Get started by connecting your first social media account!
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default QuickActions;