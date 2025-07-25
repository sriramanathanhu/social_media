#!/bin/bash

# Health Check with Alert System
# Runs health check and sends alerts on critical issues

HEALTH_LOG="/var/log/socialmedia-health.log"
ALERT_LOG="/var/log/socialmedia-alerts.log"
LAST_ALERT_FILE="/tmp/socialmedia-last-alert"

# Run health check and capture output
HEALTH_OUTPUT=$(/root/social_media/simple-health-check.sh 2>&1)
HEALTH_EXIT_CODE=$?

# Log the health check
echo "$(date): Health check completed with exit code $HEALTH_EXIT_CODE" >> "$HEALTH_LOG"
echo "$HEALTH_OUTPUT" >> "$HEALTH_LOG"
echo "---" >> "$HEALTH_LOG"

# Check for critical issues
CRITICAL_ISSUES=$(echo "$HEALTH_OUTPUT" | grep -c "❌" || echo "0")
WARNING_ISSUES=$(echo "$HEALTH_OUTPUT" | grep -c "⚠️" || echo "0")

# Alert logic (avoid spam - only alert once per hour for same issue)
CURRENT_TIME=$(date +%s)
LAST_ALERT_TIME=0

if [ -f "$LAST_ALERT_FILE" ]; then
    LAST_ALERT_TIME=$(cat "$LAST_ALERT_FILE")
fi

TIME_SINCE_LAST_ALERT=$((CURRENT_TIME - LAST_ALERT_TIME))

if [ "$CRITICAL_ISSUES" -gt 0 ] && [ "$TIME_SINCE_LAST_ALERT" -gt 3600 ]; then
    # Critical alert
    ALERT_MSG="CRITICAL: $CRITICAL_ISSUES critical issues detected in Social Media App"
    echo "$(date): $ALERT_MSG" >> "$ALERT_LOG"
    echo "$HEALTH_OUTPUT" >> "$ALERT_LOG"
    echo "---" >> "$ALERT_LOG"
    
    # Save timestamp to prevent spam
    echo "$CURRENT_TIME" > "$LAST_ALERT_FILE"
    
    # You can add email/slack notifications here
    # echo "$ALERT_MSG" | mail -s "Social Media App Alert" admin@example.com
    
elif [ "$WARNING_ISSUES" -gt 0 ]; then
    # Warning (logged but not alerted immediately)
    echo "$(date): WARNING: $WARNING_ISSUES warnings detected" >> "$ALERT_LOG"
fi

exit $HEALTH_EXIT_CODE
