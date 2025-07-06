import React from 'react';
import {
  Container,
  Typography,
  Box,
  Toolbar,
} from '@mui/material';
import { Twitter as TwitterIcon } from '@mui/icons-material';
import XApiStatus from '../components/XApiStatus';

const XApiDashboard: React.FC = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Toolbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <TwitterIcon color="primary" />
            <Typography variant="h4" component="h1" gutterBottom>
              X API Dashboard
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Monitor your X (Twitter) API usage, rate limits, and connected accounts.
          </Typography>
        </Box>

        <XApiStatus />
      </Container>
    </Box>
  );
};

export default XApiDashboard;