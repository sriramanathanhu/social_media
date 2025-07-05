import React from 'react';
import {
  Box,
  Container,
  Typography,
  Toolbar,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import ApiCredentialsManager from '../components/ApiCredentialsManager';

const SettingsPage: React.FC = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Toolbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage application settings and API configurations
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>API Credentials:</strong> Configure API keys for social media platforms to enable account connections and posting.
            These credentials will be used by all users of this application.
          </Typography>
        </Alert>

        <Card>
          <CardContent>
            <ApiCredentialsManager />
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default SettingsPage;