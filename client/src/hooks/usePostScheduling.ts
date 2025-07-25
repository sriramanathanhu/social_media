import { useState, useCallback, useMemo } from 'react';

export const usePostScheduling = () => {
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);

  const toggleScheduling = useCallback((enabled: boolean) => {
    setIsScheduled(enabled);
    if (!enabled) {
      setScheduledDate(null);
    }
  }, []);

  const updateScheduledDate = useCallback((date: Date | null) => {
    setScheduledDate(date);
    if (date) {
      setIsScheduled(true);
    }
  }, []);

  const clearScheduling = useCallback(() => {
    setIsScheduled(false);
    setScheduledDate(null);
  }, []);

  // Validate scheduling settings
  const schedulingValidation = useMemo(() => {
    if (!isScheduled) {
      return { isValid: true, error: null };
    }

    if (!scheduledDate) {
      return { isValid: false, error: 'Scheduled date is required' };
    }

    const now = new Date();
    const minDate = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

    if (scheduledDate <= minDate) {
      return { isValid: false, error: 'Scheduled date must be at least 5 minutes in the future' };
    }

    // Check if date is too far in the future (1 year)
    const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    if (scheduledDate > maxDate) {
      return { isValid: false, error: 'Scheduled date cannot be more than 1 year in the future' };
    }

    return { isValid: true, error: null };
  }, [isScheduled, scheduledDate]);

  // Get formatted scheduling info
  const getSchedulingInfo = useCallback(() => {
    if (!isScheduled || !scheduledDate) {
      return { type: 'immediate' as const };
    }

    return {
      type: 'scheduled' as const,
      date: scheduledDate,
      isoString: scheduledDate.toISOString(),
      formattedDate: scheduledDate.toLocaleDateString(),
      formattedTime: scheduledDate.toLocaleTimeString(),
      relativeTime: getRelativeTime(scheduledDate)
    };
  }, [isScheduled, scheduledDate]);

  return {
    isScheduled,
    scheduledDate,
    schedulingValidation,
    toggleScheduling,
    updateScheduledDate,
    clearScheduling,
    getSchedulingInfo
  };
};

// Helper function to get relative time description
const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  
  if (diffMs < 0) {
    return 'Past date';
  }

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

export default usePostScheduling;