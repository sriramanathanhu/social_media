import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  LinearProgress,
} from '@mui/material';
import { SvgIconComponent } from '@mui/icons-material';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: SvgIconComponent;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  progress?: {
    value: number;
    max: number;
  };
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'primary',
  subtitle,
  trend,
  progress,
}) => {
  const getColorValue = (colorName: string) => {
    const colorMap = {
      primary: '#1976d2',
      secondary: '#dc004e',
      success: '#2e7d32',
      warning: '#ed6c02',
      error: '#d32f2f',
      info: '#0288d1',
    };
    return colorMap[colorName as keyof typeof colorMap] || colorMap.primary;
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
          <Avatar
            sx={{
              bgcolor: `${color}.main`,
              width: 56,
              height: 56,
            }}
          >
            <Icon sx={{ fontSize: 28 }} />
          </Avatar>
        </Box>

        {subtitle && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {subtitle}
          </Typography>
        )}

        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              variant="caption"
              sx={{
                color: trend.isPositive ? 'success.main' : 'error.main',
                fontWeight: 'medium',
              }}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              from last month
            </Typography>
          </Box>
        )}

        {progress && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {progress.value}/{progress.max}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(progress.value / progress.max) * 100}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;