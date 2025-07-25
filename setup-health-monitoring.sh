#!/bin/bash

# Setup Health Monitoring System for Social Media App
# Configures automated health checks and alerting

set -euo pipefail

# Configuration
HEALTH_SCRIPT="/root/social_media/simple-health-check.sh"
HEALTH_LOG="/var/log/socialmedia-health.log"
ALERT_LOG="/var/log/socialmedia-alerts.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Function to setup log rotation for health monitoring
setup_health_log_rotation() {
    log_info "Setting up health monitoring log rotation..."
    
    cat > /etc/logrotate.d/socialmedia-health << 'EOF'
/var/log/socialmedia-health.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}

/var/log/socialmedia-alerts.log {
    daily
    rotate 90
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF
    
    log_info "Health monitoring log rotation configured"
}

# Function to create health monitoring cron jobs
setup_health_cron() {
    log_info "Setting up health monitoring cron jobs..."
    
    # Remove existing health monitoring cron jobs
    crontab -l 2>/dev/null | grep -v "simple-health-check.sh" | grep -v "health-monitor.sh" | crontab - || true
    
    # Add health check every 15 minutes
    (crontab -l 2>/dev/null; echo "*/15 * * * * $HEALTH_SCRIPT >> $HEALTH_LOG 2>&1") | crontab -
    
    log_info "Health check scheduled: Every 15 minutes"
    
    # Add comprehensive health monitoring daily
    (crontab -l 2>/dev/null; echo "0 6 * * * /root/social_media/health-monitor.sh >> $HEALTH_LOG 2>&1 || echo 'Health check completed with warnings' >> $ALERT_LOG") | crontab -
    
    log_info "Comprehensive health monitoring scheduled: Daily at 6:00 AM"
}

# Function to create alert system
create_alert_system() {
    log_info "Creating health alert system..."
    
    cat > /root/social_media/check-and-alert.sh << 'EOF'
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
EOF
    
    chmod +x /root/social_media/check-and-alert.sh
    log_info "Alert system created: /root/social_media/check-and-alert.sh"
}

# Function to create monitoring dashboard script
create_monitoring_dashboard() {
    log_info "Creating monitoring dashboard..."
    
    cat > /root/social_media/monitoring-dashboard.sh << 'EOF'
#!/bin/bash

# Monitoring Dashboard for Social Media App
# Displays comprehensive system status

clear

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                        SOCIAL MEDIA APP MONITORING DASHBOARD                ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Current health status
echo "🏥 CURRENT HEALTH STATUS"
echo "========================"
/root/social_media/simple-health-check.sh
echo ""

# Recent alerts
echo "🚨 RECENT ALERTS (Last 24 hours)"
echo "================================"
if [ -f "/var/log/socialmedia-alerts.log" ]; then
    tail -n 20 /var/log/socialmedia-alerts.log | grep "$(date +%Y-%m-%d)" || echo "No alerts today"
else
    echo "No alert log found"
fi
echo ""

# System uptime and load
echo "⚡ SYSTEM PERFORMANCE"
echo "===================="
uptime
echo ""

# Docker stats
echo "🐳 CONTAINER RESOURCE USAGE"
echo "==========================="
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" social_media-postgres-1 social_media-backend-1 social_media-frontend-1 2>/dev/null || echo "Container stats unavailable"
echo ""

# Backup status
echo "💾 BACKUP STATUS"
echo "==============="
if [ -d "/root/social_media/database_backups" ]; then
    echo "Recent backups:"
    ls -lth /root/social_media/database_backups/ | head -6
else
    echo "Backup directory not found"
fi
echo ""

# Disk usage
echo "💿 DISK USAGE"
echo "============"
df -h /root | grep -v "Filesystem"
echo ""

# Recent logs
echo "📋 RECENT HEALTH LOG ENTRIES"
echo "============================"
if [ -f "/var/log/socialmedia-health.log" ]; then
    tail -n 10 /var/log/socialmedia-health.log
else
    echo "No health log found"
fi

echo ""
echo "Dashboard updated: $(date)"
echo "Refresh with: ./monitoring-dashboard.sh"
EOF
    
    chmod +x /root/social_media/monitoring-dashboard.sh
    log_info "Monitoring dashboard created: /root/social_media/monitoring-dashboard.sh"
}

# Function to show current monitoring configuration
show_monitoring_config() {
    log_info "Current monitoring configuration:"
    echo "=================================="
    echo "Health Check Script: $HEALTH_SCRIPT"
    echo "Health Log: $HEALTH_LOG"
    echo "Alert Log: $ALERT_LOG"
    echo ""
    echo "Cron Jobs:"
    crontab -l | grep -E "(health|backup)" || echo "No monitoring cron jobs found"
    echo "=================================="
}

# Main execution
main() {
    log_info "Setting up health monitoring system..."
    
    setup_health_log_rotation
    setup_health_cron
    create_alert_system
    create_monitoring_dashboard
    show_monitoring_config
    
    log_info "Health monitoring system setup completed!"
    log_info ""
    log_info "📝 Available monitoring commands:"
    log_info "  ./simple-health-check.sh     - Quick health check"
    log_info "  ./health-monitor.sh          - Comprehensive health check"
    log_info "  ./check-and-alert.sh         - Health check with alerting"
    log_info "  ./monitoring-dashboard.sh    - Full monitoring dashboard"
    log_info ""
    log_info "📅 Scheduled monitoring:"
    log_info "  Health checks: Every 15 minutes"
    log_info "  Comprehensive: Daily at 6:00 AM"
    log_info "  Backups: Daily at 2:00 AM"
    log_info ""
    log_info "📋 Log files:"
    log_info "  Health: $HEALTH_LOG"
    log_info "  Alerts: $ALERT_LOG"
    log_info "  Backup: /var/log/socialmedia-backup.log"
}

# Run main function
main "$@"