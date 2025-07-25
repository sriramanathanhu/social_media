import React from 'react';
import {
  Box,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
  Alert,
  Chip
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

interface SchedulingValidation {
  isValid: boolean;
  error: string | null;
}

interface SchedulingSectionProps {
  isScheduled: boolean;
  scheduledDate: Date | null;
  onToggleScheduling: (enabled: boolean) => void;
  onDateChange: (date: Date | null) => void;
  validation: SchedulingValidation;
}

const SchedulingSection: React.FC<SchedulingSectionProps> = React.memo(({
  isScheduled,
  scheduledDate,
  onToggleScheduling,
  onDateChange,
  validation
}) => {
  const handleDateTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value) {
      onDateChange(new Date(value));
    } else {
      onDateChange(null);
    }
  };

  const formatDateTimeLocal = (date: Date | null) => {
    if (!date) return '';
    
    // Format date to YYYY-MM-DDTHH:MM format for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getMinDateTime = () => {
    const now = new Date();
    const minDate = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    return formatDateTimeLocal(minDate);
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Past date';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else {
      return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
  };

  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={isScheduled}
            onChange={(e) => onToggleScheduling(e.target.checked)}
            icon={<AccessTimeIcon />}
            checkedIcon={<ScheduleIcon />}
          />
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1">
              Schedule for later
            </Typography>
            {isScheduled && (
              <Chip
                label="Enabled"
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        }
      />

      {isScheduled && (
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            type="datetime-local"
            label="Scheduled Date & Time"
            value={formatDateTimeLocal(scheduledDate)}
            onChange={handleDateTimeChange}
            inputProps={{
              min: getMinDateTime()
            }}
            helperText={
              scheduledDate 
                ? `Post will be published ${getRelativeTime(scheduledDate)}`
                : 'Select when you want this post to be published'
            }
            error={!validation.isValid}
          />

          {!validation.isValid && validation.error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {validation.error}
            </Alert>
          )}

          {scheduledDate && validation.isValid && (
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Scheduled for:</strong> {scheduledDate.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                {getRelativeTime(scheduledDate)}
              </Typography>
            </Alert>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            • Posts can be scheduled up to 1 year in advance
            • Minimum scheduling time is 5 minutes from now
            • All times are in your local timezone
          </Typography>
        </Box>
      )}
    </Box>
  );
});

SchedulingSection.displayName = 'SchedulingSection';

export default SchedulingSection;