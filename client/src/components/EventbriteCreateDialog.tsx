import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Event as EventIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  MonetizationOn as MoneyIcon,
  Publish as PublishIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface EventbriteCreateDialogProps {
  open: boolean;
  onClose: () => void;
  account: any;
  onEventCreated: () => void;
}

interface TicketClass {
  name: string;
  description: string;
  is_free: boolean;
  cost: string;
  quantity_total: number;
  minimum_quantity: number;
  maximum_quantity: number;
}

const EventbriteCreateDialog: React.FC<EventbriteCreateDialogProps> = ({
  open,
  onClose,
  account,
  onEventCreated,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Event data
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    start_datetime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to tomorrow
    end_datetime: new Date(Date.now() + 26 * 60 * 60 * 1000), // 2 hours later
    start_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    end_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: 'USD',
    online_event: false,
    listed: true,
    shareable: true,
    invite_only: false,
    show_remaining: true,
    capacity: '',
    category_id: '',
    format_id: '',
  });

  // Ticket data
  const [tickets, setTickets] = useState<TicketClass[]>([
    {
      name: 'General Admission',
      description: '',
      is_free: true,
      cost: '0.00',
      quantity_total: 100,
      minimum_quantity: 1,
      maximum_quantity: 10,
    }
  ]);

  // Meta data
  const [categories, setCategories] = useState<any[]>([]);
  const [formats, setFormats] = useState<any[]>([]);
  const [createdEvent, setCreatedEvent] = useState<any>(null);

  const { token } = useSelector((state: RootState) => state.auth);

  const steps = ['Event Details', 'Tickets & Pricing', 'Review & Publish'];

  useEffect(() => {
    if (open && account) {
      fetchEventMeta();
    }
  }, [open, account]);

  const fetchEventMeta = async () => {
    try {
      const response = await fetch(`/api/eventbrite/accounts/${account.id}/meta`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
        setFormats(data.formats || []);
      }
    } catch (err) {
      console.error('Failed to fetch event metadata:', err);
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleEventDataChange = (field: string, value: any) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  const handleTicketChange = (index: number, field: string, value: any) => {
    const newTickets = [...tickets];
    newTickets[index] = { ...newTickets[index], [field]: value };
    setTickets(newTickets);
  };

  const addTicket = () => {
    setTickets(prev => [...prev, {
      name: '',
      description: '',
      is_free: false,
      cost: '0.00',
      quantity_total: 50,
      minimum_quantity: 1,
      maximum_quantity: 10,
    }]);
  };

  const removeTicket = (index: number) => {
    if (tickets.length > 1) {
      setTickets(prev => prev.filter((_, i) => i !== index));
    }
  };

  const validateEventData = () => {
    if (!eventData.name.trim()) {
      setError('Event name is required');
      return false;
    }
    if (new Date(eventData.start_datetime) >= new Date(eventData.end_datetime)) {
      setError('End date must be after start date');
      return false;
    }
    return true;
  };

  const validateTickets = () => {
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (!ticket.name.trim()) {
        setError(`Ticket ${i + 1}: Name is required`);
        return false;
      }
      if (!ticket.is_free && (!ticket.cost || parseFloat(ticket.cost) <= 0)) {
        setError(`Ticket ${i + 1}: Cost must be greater than 0 for paid tickets`);
        return false;
      }
    }
    return true;
  };

  const handleCreateEvent = async () => {
    if (!validateEventData()) return;
    
    try {
      setLoading(true);
      setError(null);

      // Create the event
      const eventResponse = await fetch('/api/eventbrite/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: account.id,
          eventData: {
            ...eventData,
            start_datetime: new Date(eventData.start_datetime).toISOString(),
            end_datetime: new Date(eventData.end_datetime).toISOString(),
            capacity: eventData.capacity ? parseInt(eventData.capacity) : null,
          }
        }),
      });

      if (!eventResponse.ok) {
        const errorData = await eventResponse.json();
        throw new Error(errorData.details || errorData.error || 'Failed to create event');
      }

      const eventResult = await eventResponse.json();
      setCreatedEvent(eventResult);

      // Create ticket classes
      for (const ticket of tickets) {
        const ticketResponse = await fetch(`/api/eventbrite/events/${eventResult.event.id}/tickets`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: eventResult.event.id,
            ticketData: {
              ...ticket,
              cost: ticket.is_free ? null : ticket.cost,
            }
          }),
        });

        if (!ticketResponse.ok) {
          const errorData = await ticketResponse.json();
          console.warn(`Failed to create ticket "${ticket.name}":`, errorData);
        }
      }

      handleNext();
    } catch (err: any) {
      console.error('Event creation error:', err);
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishEvent = async () => {
    if (!createdEvent) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/eventbrite/events/${createdEvent.event.id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: createdEvent.event.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to publish event');
      }

      const result = await response.json();
      
      if (result.published) {
        onEventCreated();
        handleClose();
      } else {
        setError('Event could not be published. It may be missing required information.');
      }
    } catch (err: any) {
      console.error('Event publish error:', err);
      setError(err.message || 'Failed to publish event');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setActiveStep(0);
      setError(null);
      setCreatedEvent(null);
      setEventData({
        name: '',
        description: '',
        start_datetime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        end_datetime: new Date(Date.now() + 26 * 60 * 60 * 1000),
        start_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        end_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currency: 'USD',
        online_event: false,
        listed: true,
        shareable: true,
        invite_only: false,
        show_remaining: true,
        capacity: '',
        category_id: '',
        format_id: '',
      });
      setTickets([{
        name: 'General Admission',
        description: '',
        is_free: true,
        cost: '0.00',
        quantity_total: 100,
        minimum_quantity: 1,
        maximum_quantity: 10,
      }]);
      onClose();
    }
  };

  const renderEventDetailsStep = () => (
    <Box>
      <TextField
        fullWidth
        label="Event Name"
        value={eventData.name}
        onChange={(e) => handleEventDataChange('name', e.target.value)}
        required
        sx={{ mb: 2 }}
      />
      
      <TextField
        fullWidth
        label="Event Description"
        value={eventData.description}
        onChange={(e) => handleEventDataChange('description', e.target.value)}
        multiline
        rows={4}
        sx={{ mb: 2 }}
      />

      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <DateTimePicker
              label="Start Date & Time"
              value={eventData.start_datetime}
              onChange={(value) => handleEventDataChange('start_datetime', value)}
              slots={{ textField: TextField }}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={6}>
            <DateTimePicker
              label="End Date & Time"
              value={eventData.end_datetime}
              onChange={(value) => handleEventDataChange('end_datetime', value)}
              slots={{ textField: TextField }}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
        </Grid>
      </LocalizationProvider>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={4}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={eventData.category_id}
              onChange={(e) => handleEventDataChange('category_id', e.target.value)}
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={4}>
          <FormControl fullWidth>
            <InputLabel>Format</InputLabel>
            <Select
              value={eventData.format_id}
              onChange={(e) => handleEventDataChange('format_id', e.target.value)}
            >
              {formats.map((format) => (
                <MenuItem key={format.id} value={format.id}>
                  {format.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Capacity (optional)"
            type="number"
            value={eventData.capacity}
            onChange={(e) => handleEventDataChange('capacity', e.target.value)}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={6}>
          <FormControlLabel
            control={
              <Switch
                checked={eventData.online_event}
                onChange={(e) => handleEventDataChange('online_event', e.target.checked)}
              />
            }
            label="Online Event"
          />
        </Grid>
        <Grid item xs={6}>
          <FormControlLabel
            control={
              <Switch
                checked={eventData.listed}
                onChange={(e) => handleEventDataChange('listed', e.target.checked)}
              />
            }
            label="Listed Publicly"
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderTicketsStep = () => (
    <Box>
      {tickets.map((ticket, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Ticket Class {index + 1}</Typography>
              {tickets.length > 1 && (
                <Button 
                  color="error" 
                  size="small"
                  onClick={() => removeTicket(index)}
                >
                  Remove
                </Button>
              )}
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Ticket Name"
                  value={ticket.name}
                  onChange={(e) => handleTicketChange(index, 'name', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Description"
                  value={ticket.description}
                  onChange={(e) => handleTicketChange(index, 'description', e.target.value)}
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={ticket.is_free}
                      onChange={(e) => handleTicketChange(index, 'is_free', e.target.checked)}
                    />
                  }
                  label="Free Ticket"
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={ticket.cost}
                  onChange={(e) => handleTicketChange(index, 'cost', e.target.value)}
                  disabled={ticket.is_free}
                  InputProps={{ startAdornment: '$' }}
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={ticket.quantity_total}
                  onChange={(e) => handleTicketChange(index, 'quantity_total', parseInt(e.target.value))}
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  fullWidth
                  label="Min/Order"
                  type="number"
                  value={ticket.minimum_quantity}
                  onChange={(e) => handleTicketChange(index, 'minimum_quantity', parseInt(e.target.value))}
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  fullWidth
                  label="Max/Order"
                  type="number"
                  value={ticket.maximum_quantity}
                  onChange={(e) => handleTicketChange(index, 'maximum_quantity', parseInt(e.target.value))}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
      
      <Button 
        variant="outlined" 
        onClick={addTicket}
        startIcon={<MoneyIcon />}
        sx={{ mt: 1 }}
      >
        Add Another Ticket Class
      </Button>
    </Box>
  );

  const renderReviewStep = () => (
    <Box>
      {createdEvent ? (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>
            Event "{eventData.name}" has been created successfully! 
            You can now publish it to make it live.
          </Alert>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{eventData.name}</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {eventData.description}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Chip 
                  icon={<TimeIcon />} 
                  label={new Date(eventData.start_datetime).toLocaleString()} 
                />
                {eventData.online_event && <Chip label="Online Event" color="primary" />}
                {!eventData.listed && <Chip label="Private Event" color="warning" />}
              </Box>
              
              <Typography variant="body2">
                Event URL: {createdEvent.eventbrite_event?.url || 'Available after publishing'}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      ) : (
        <Box>
          <Typography variant="h6" gutterBottom>Review Your Event</Typography>
          
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6">{eventData.name}</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {eventData.description || 'No description provided'}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<TimeIcon />} 
                  label={`${new Date(eventData.start_datetime).toLocaleDateString()} - ${new Date(eventData.end_datetime).toLocaleDateString()}`}
                />
                {eventData.online_event && <Chip label="Online Event" color="primary" />}
                {!eventData.listed && <Chip label="Private Event" color="warning" />}
                {eventData.capacity && <Chip label={`Capacity: ${eventData.capacity}`} />}
              </Box>
            </CardContent>
          </Card>

          <Typography variant="h6" gutterBottom>Ticket Classes</Typography>
          {tickets.map((ticket, index) => (
            <Card key={index} sx={{ mb: 1 }}>
              <CardContent sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1">{ticket.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Quantity: {ticket.quantity_total} | Min: {ticket.minimum_quantity} | Max: {ticket.maximum_quantity}
                    </Typography>
                  </Box>
                  <Typography variant="h6" color={ticket.is_free ? 'success.main' : 'primary.main'}>
                    {ticket.is_free ? 'FREE' : `$${ticket.cost}`}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );

  if (!account) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <EventIcon sx={{ color: '#ff6600' }} />
          <Typography variant="h6">Create Event - {account.displayName}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          {activeStep === 0 && renderEventDetailsStep()}
          {activeStep === 1 && renderTicketsStep()}
          {activeStep === 2 && renderReviewStep()}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button
            onClick={activeStep === 0 ? 
              () => { if (validateEventData()) handleNext() } :
              () => { if (validateTickets()) handleNext() }
            }
            variant="contained"
            disabled={loading}
          >
            Next
          </Button>
        ) : (
          <Box>
            {!createdEvent ? (
              <Button
                onClick={handleCreateEvent}
                variant="contained"
                disabled={loading}
                sx={{ mr: 1, bgcolor: '#ff6600', '&:hover': { bgcolor: '#e55a00' } }}
                startIcon={loading ? <CircularProgress size={20} /> : <EventIcon />}
              >
                {loading ? 'Creating...' : 'Create Event'}
              </Button>
            ) : (
              <Button
                onClick={handlePublishEvent}
                variant="contained"
                disabled={loading}
                sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e55a00' } }}
                startIcon={loading ? <CircularProgress size={20} /> : <PublishIcon />}
              >
                {loading ? 'Publishing...' : 'Publish Event'}
              </Button>
            )}
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EventbriteCreateDialog;