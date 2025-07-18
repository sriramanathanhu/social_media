import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Link,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Web as WordPressIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { wordpressAPI } from '../services/api';

interface WordPressConnectDialogProps {
  open: boolean;
  onClose: () => void;
  onSiteConnected: (site: any) => void;
}

const steps = [
  {
    label: 'Enter Site Details',
    description: 'Provide your WordPress site URL and username',
  },
  {
    label: 'Create Application Password',
    description: 'Generate an application password in WordPress',
  },
  {
    label: 'Verify Connection',
    description: 'Test the connection and sync site data',
  },
];

const WordPressConnectDialog: React.FC<WordPressConnectDialogProps> = ({
  open,
  onClose,
  onSiteConnected,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    siteUrl: '',
    username: '',
    appPassword: '',
  });
  
  const [siteInfo, setSiteInfo] = useState<any>(null);

  const handleReset = () => {
    setActiveStep(0);
    setFormData({ siteUrl: '', username: '', appPassword: '' });
    setError(null);
    setSuccess(null);
    setSiteInfo(null);
    setLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const validateSiteUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleConnectSite = async () => {
    if (!formData.siteUrl || !formData.username || !formData.appPassword) {
      setError('All fields are required');
      return;
    }

    if (!validateSiteUrl(formData.siteUrl)) {
      setError('Please enter a valid URL (including http:// or https://)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await wordpressAPI.connectSite(formData);
      
      if (response.data.success) {
        setSiteInfo(response.data);
        setSuccess('WordPress site connected successfully!');
        onSiteConnected(response.data.account);
        
        // Auto-advance to success step
        setActiveStep(3);
      }
    } catch (err: any) {
      setError(err.response?.data?.details || 'Failed to connect WordPress site');
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter your WordPress site details. Make sure you have admin access to your WordPress site.
            </Typography>
            
            <TextField
              fullWidth
              label="Site URL"
              value={formData.siteUrl}
              onChange={(e) => setFormData({ ...formData, siteUrl: e.target.value })}
              placeholder="https://yourdomain.com"
              margin="normal"
              helperText="Enter your complete WordPress site URL"
            />
            
            <TextField
              fullWidth
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="your-wp-username"
              margin="normal"
              helperText="Your WordPress admin username"
            />

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                onClick={handleNext}
                disabled={!formData.siteUrl || !formData.username}
              >
                Next
              </Button>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Application Passwords</strong> allow external applications to securely connect to your WordPress site without sharing your actual password.
              </Typography>
            </Alert>

            <Typography variant="h6" gutterBottom>
              Steps to create an Application Password:
            </Typography>
            
            <Box component="ol" sx={{ pl: 2, mb: 3 }}>
              <li>
                <Typography variant="body2">
                  Go to your WordPress admin dashboard: <Link href={`${formData.siteUrl}/wp-admin`} target="_blank">{formData.siteUrl}/wp-admin</Link>
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Navigate to <strong>Users → Profile</strong>
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Scroll down to the <strong>Application Passwords</strong> section
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Enter "Social Media Scheduler" as the application name
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Click <strong>Add New Application Password</strong>
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Copy the generated password and paste it below
                </Typography>
              </li>
            </Box>

            <TextField
              fullWidth
              label="Application Password"
              value={formData.appPassword}
              onChange={(e) => setFormData({ ...formData, appPassword: e.target.value })}
              placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
              margin="normal"
              helperText="Paste the application password you generated"
              type="password"
            />

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleBack}>
                Back
              </Button>
              <Button 
                onClick={handleNext}
                disabled={!formData.appPassword}
              >
                Next
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ready to connect your WordPress site. We'll verify the connection and sync your site data.
            </Typography>

            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Connection Details:
              </Typography>
              <Typography variant="body2">
                <strong>Site:</strong> {formData.siteUrl}
              </Typography>
              <Typography variant="body2">
                <strong>Username:</strong> {formData.username}
              </Typography>
              <Typography variant="body2">
                <strong>Password:</strong> {'*'.repeat(formData.appPassword.length)}
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleBack} disabled={loading}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleConnectSite}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <WordPressIcon />}
                sx={{ bgcolor: '#21759b', '&:hover': { bgcolor: '#1e6ba8' } }}
              >
                {loading ? 'Connecting...' : 'Connect Site'}
              </Button>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Site Connected Successfully!
            </Typography>

            {siteInfo && (
              <Box sx={{ mt: 3, textAlign: 'left' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Site Information:
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>Title:</strong> {siteInfo.site?.title}
                  </Typography>
                  <Typography variant="body2">
                    <strong>URL:</strong> {siteInfo.site?.url}
                  </Typography>
                  <Typography variant="body2">
                    <strong>User:</strong> {siteInfo.user?.displayName} ({siteInfo.user?.email})
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Permissions:</strong>
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {siteInfo.user?.capabilities?.slice(0, 5).map((cap: string) => (
                      <Chip key={cap} label={cap} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    ))}
                    {siteInfo.user?.capabilities?.length > 5 && (
                      <Chip label={`+${siteInfo.user.capabilities.length - 5} more`} size="small" />
                    )}
                  </Box>
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={handleClose}
                sx={{ bgcolor: '#21759b', '&:hover': { bgcolor: '#1e6ba8' } }}
              >
                Done
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WordPressIcon sx={{ color: '#21759b' }} />
            <Typography variant="h6">Connect WordPress Site</Typography>
          </Box>
          <Button onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography variant="subtitle2">{step.label}</Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {step.description}
                </Typography>
                {getStepContent(index)}
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
    </Dialog>
  );
};

export default WordPressConnectDialog;