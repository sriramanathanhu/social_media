import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  VideoCall as VideoIcon,
  Share as ShareIcon,
  Settings as SettingsIcon,
  Computer as ComputerIcon,
  Stream as StreamIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

interface StreamingGuideProps {
  open: boolean;
  onClose: () => void;
}

const StreamingGuide: React.FC<StreamingGuideProps> = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      label: 'Understand the Workflow',
      content: (
        <Box>
          <Typography variant="body1" gutterBottom>
            Our live streaming platform works as a central hub that receives your stream and distributes it to multiple platforms simultaneously.
          </Typography>
          
          <Card sx={{ mt: 2, mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                🎯 The Complete Flow:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Chip icon={<ComputerIcon />} label="Your Source" color="primary" />
                <Typography>→</Typography>
                <Chip icon={<StreamIcon />} label="Our Platform" color="secondary" />
                <Typography>→</Typography>
                <Chip icon={<ShareIcon />} label="Multiple Destinations" color="success" />
              </Box>
            </CardContent>
          </Card>

          <Typography variant="body2" color="text.secondary">
            This means you stream once to us, and we handle broadcasting to YouTube, Twitch, Facebook, Twitter, and other platforms automatically.
          </Typography>
        </Box>
      )
    },
    {
      label: 'Choose Your Source Type',
      content: (
        <Box>
          <Typography variant="body1" gutterBottom>
            Select how you want to send your stream to our platform:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon><VideoIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="RTMP Push (Recommended)"
                secondary="Stream from OBS, Streamlabs, or any RTMP-compatible software directly to our servers"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><StreamIcon color="secondary" /></ListItemIcon>
              <ListItemText
                primary="RTMP Pull"
                secondary="We pull your stream from another RTMP server or streaming service"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><ComputerIcon color="info" /></ListItemIcon>
              <ListItemText
                primary="Local Camera"
                secondary="Stream directly from your browser (experimental feature)"
              />
            </ListItem>
          </List>

          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Most Popular Choice:</strong> RTMP Push with OBS Studio - it's free, powerful, and works great with our platform.
          </Alert>
        </Box>
      )
    },
    {
      label: 'Set Up OBS Studio (RTMP Push)',
      content: (
        <Box>
          <Typography variant="body1" gutterBottom>
            For RTMP Push (most common setup):
          </Typography>

          <Card sx={{ mt: 2, mb: 2, bgcolor: 'grey.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📥 Download OBS Studio
              </Typography>
              <Typography variant="body2" gutterBottom>
                1. Go to <strong>obsproject.com</strong> and download OBS Studio (free)
                <br />
                2. Install and open OBS Studio
                <br />
                3. Create your scenes and add sources (camera, screen capture, etc.)
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2, mb: 2, bgcolor: 'blue.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔧 Configure OBS Settings
              </Typography>
              <Typography variant="body2" gutterBottom>
                1. Go to <strong>Settings → Stream</strong>
                <br />
                2. Select <strong>"Custom"</strong> as service
                <br />
                3. Enter Server URL: <code>rtmp://your-server.com/live</code>
                <br />
                4. Enter Stream Key: <code>[Generated after creating stream]</code>
              </Typography>
            </CardContent>
          </Card>

          <Alert severity="success">
            After creating a stream in our platform, you'll get the exact RTMP URL and Stream Key to use in OBS.
          </Alert>
        </Box>
      )
    },
    {
      label: 'Configure Republishing Destinations',
      content: (
        <Box>
          <Typography variant="body1" gutterBottom>
            Set up where you want your stream to be republished:
          </Typography>

          <List>
            <ListItem>
              <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
              <ListItemText
                primary="Get Stream Keys"
                secondary="Collect stream keys from each platform (YouTube, Twitch, Facebook, etc.)"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
              <ListItemText
                primary="Add Destinations"
                secondary="In the Create Stream dialog, add your desired platforms and their stream keys"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
              <ListItemText
                primary="Enable/Disable"
                secondary="Toggle platforms on/off for each stream - useful for different content types"
              />
            </ListItem>
          </List>

          <Card sx={{ mt: 2, bgcolor: 'orange.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔑 Getting Platform Stream Keys:
              </Typography>
              <Typography variant="body2">
                • <strong>YouTube:</strong> YouTube Studio → Go Live → Stream
                <br />
                • <strong>Twitch:</strong> Dashboard → Settings → Stream → Primary Stream Key
                <br />
                • <strong>Facebook:</strong> Creator Studio → Live → Set Up Live Video
                <br />
                • <strong>Twitter/X:</strong> Media Studio → Producer → Live
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )
    },
    {
      label: 'Start Streaming',
      content: (
        <Box>
          <Typography variant="body1" gutterBottom>
            Ready to go live! Here's the final workflow:
          </Typography>

          <List>
            <ListItem>
              <ListItemIcon><span style={{ fontSize: '1.5em' }}>1️⃣</span></ListItemIcon>
              <ListItemText
                primary="Create Stream"
                secondary="Use our 'Create Stream' dialog to set up your stream configuration"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><span style={{ fontSize: '1.5em' }}>2️⃣</span></ListItemIcon>
              <ListItemText
                primary="Configure OBS"
                secondary="Copy the RTMP URL and Stream Key to your OBS settings"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><span style={{ fontSize: '1.5em' }}>3️⃣</span></ListItemIcon>
              <ListItemText
                primary="Start Streaming"
                secondary="Click 'Start Streaming' in OBS to begin broadcasting"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><span style={{ fontSize: '1.5em' }}>4️⃣</span></ListItemIcon>
              <ListItemText
                primary="Monitor & Manage"
                secondary="Use our dashboard to monitor your stream and manage republishing destinations"
              />
            </ListItem>
          </List>

          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Pro Tip:</strong> Test your setup with a private stream first. You can always change republishing destinations during a live stream!
          </Alert>
        </Box>
      )
    }
  ];

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlayIcon color="primary" />
          Live Streaming Setup Guide
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography variant="h6">{step.label}</Typography>
              </StepLabel>
              <StepContent>
                {step.content}
                <Box sx={{ mb: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{ mr: 1 }}
                    disabled={index === steps.length - 1}
                  >
                    {index === steps.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                  >
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {activeStep === steps.length && (
          <Card sx={{ mt: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckIcon sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                You're Ready to Stream! 🎉
              </Typography>
              <Typography variant="body1" gutterBottom>
                You now understand how to set up and use our live streaming platform.
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  onClick={handleReset}
                  variant="contained"
                  color="inherit"
                  sx={{ mr: 1 }}
                >
                  Review Guide
                </Button>
                <Button
                  onClick={onClose}
                  variant="outlined"
                  color="inherit"
                >
                  Start Creating Streams
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default StreamingGuide;