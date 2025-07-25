#!/bin/bash

# Setup automated backup scheduling for Social Media App
# Creates cron job for regular database backups

set -euo pipefail

# Configuration
BACKUP_SCRIPT="/root/social_media/backup-database.sh"
CRON_LOG="/var/log/socialmedia-backup.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if script exists
check_backup_script() {
    if [ ! -f "$BACKUP_SCRIPT" ]; then
        log_error "Backup script not found: $BACKUP_SCRIPT"
        exit 1
    fi
    
    if [ ! -x "$BACKUP_SCRIPT" ]; then
        log_error "Backup script is not executable: $BACKUP_SCRIPT"
        exit 1
    fi
    
    log_info "Backup script found and executable"
}

# Function to setup log rotation
setup_log_rotation() {
    log_info "Setting up log rotation..."
    
    cat > /etc/logrotate.d/socialmedia-backup << 'EOF'
/var/log/socialmedia-backup.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF
    
    log_info "Log rotation configured"
}

# Function to create cron job
setup_cron_job() {
    log_info "Setting up cron job for automated backups..."
    
    # Remove existing cron job if present
    crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab - || true
    
    # Add new cron job for daily backups at 2 AM
    (crontab -l 2>/dev/null; echo "0 2 * * * $BACKUP_SCRIPT >> $CRON_LOG 2>&1") | crontab -
    
    log_info "Cron job added: Daily backup at 2:00 AM"
    
    # Also add a weekly comprehensive backup at 3 AM on Sundays
    (crontab -l 2>/dev/null; echo "0 3 * * 0 $BACKUP_SCRIPT && echo 'Weekly backup completed' >> $CRON_LOG") | crontab -
    
    log_info "Weekly backup job added: Sundays at 3:00 AM"
}

# Function to test backup script
test_backup() {
    log_info "Testing backup script..."
    
    if "$BACKUP_SCRIPT" >> "$CRON_LOG" 2>&1; then
        log_info "Backup test successful"
    else
        log_error "Backup test failed. Check $CRON_LOG for details"
        exit 1
    fi
}

# Function to create monitoring script
create_monitoring_script() {
    log_info "Creating backup monitoring script..."
    
    cat > /root/social_media/check-backup-health.sh << 'EOF'
#!/bin/bash

# Backup Health Check Script
# Monitors backup status and alerts on issues

BACKUP_DIR="/root/social_media/database_backups"
LOG_FILE="/var/log/socialmedia-backup.log"
MAX_BACKUP_AGE_HOURS=26  # Alert if latest backup is older than 26 hours

# Check if recent backup exists
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/socialmedia_backup_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "CRITICAL: No backups found in $BACKUP_DIR"
    exit 2
fi

# Check backup age
BACKUP_AGE_HOURS=$((($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600))

if [ "$BACKUP_AGE_HOURS" -gt "$MAX_BACKUP_AGE_HOURS" ]; then
    echo "WARNING: Latest backup is $BACKUP_AGE_HOURS hours old"
    echo "Latest backup: $(basename "$LATEST_BACKUP")"
    exit 1
fi

# Check backup size (should be at least 1KB)
BACKUP_SIZE_KB=$(du -k "$LATEST_BACKUP" | cut -f1)

if [ "$BACKUP_SIZE_KB" -lt 1 ]; then
    echo "CRITICAL: Latest backup is too small ($BACKUP_SIZE_KB KB)"
    exit 2
fi

# Check log for recent errors
if tail -n 100 "$LOG_FILE" 2>/dev/null | grep -i "error\|failed" | grep "$(date +%Y-%m-%d)" >/dev/null; then
    echo "WARNING: Recent backup errors found in log"
    exit 1
fi

echo "OK: Backup system healthy"
echo "Latest backup: $(basename "$LATEST_BACKUP") (${BACKUP_SIZE_KB}KB, ${BACKUP_AGE_HOURS}h old)"
exit 0
EOF
    
    chmod +x /root/social_media/check-backup-health.sh
    log_info "Monitoring script created: /root/social_media/check-backup-health.sh"
}

# Function to display current cron configuration
show_cron_config() {
    log_info "Current cron configuration:"
    echo "=========================="
    crontab -l | grep -E "(backup|social)" || echo "No backup-related cron jobs found"
    echo "=========================="
}

# Function to create backup status script
create_status_script() {
    log_info "Creating backup status script..."
    
    cat > /root/social_media/backup-status.sh << 'EOF'
#!/bin/bash

# Backup Status Display Script
# Shows backup system status and recent backups

BACKUP_DIR="/root/social_media/database_backups"
LOG_FILE="/var/log/socialmedia-backup.log"

echo "=== SOCIAL MEDIA BACKUP STATUS ==="
echo "Generated: $(date)"
echo ""

echo "Docker Container Status:"
docker ps --filter "name=postgres" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "Database Status:"
if docker exec social_media-postgres-1 pg_isready -U postgres >/dev/null 2>&1; then
    echo "✅ Database: Connected"
    TABLES=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "\dt" | wc -l)
    echo "📊 Tables: $TABLES"
    USERS=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
    echo "👥 Users: $USERS"
else
    echo "❌ Database: Disconnected"
fi
echo ""

echo "Recent Backups (last 5):"
if ls -t "$BACKUP_DIR"/socialmedia_backup_*.sql.gz >/dev/null 2>&1; then
    ls -lth "$BACKUP_DIR"/socialmedia_backup_*.sql.gz | head -5 | while read -r line; do
        echo "  $line"
    done
else
    echo "  No backups found"
fi
echo ""

echo "Backup Space Usage:"
du -sh "$BACKUP_DIR" 2>/dev/null || echo "  Backup directory not found"
echo ""

echo "Cron Jobs:"
crontab -l | grep -E "(backup|social)" || echo "  No backup cron jobs found"
echo ""

echo "Recent Log Entries (last 10 lines):"
if [ -f "$LOG_FILE" ]; then
    tail -n 10 "$LOG_FILE"
else
    echo "  No log file found"
fi

echo "=================================="
EOF
    
    chmod +x /root/social_media/backup-status.sh
    log_info "Status script created: /root/social_media/backup-status.sh"
}

# Main execution
main() {
    log_info "Setting up automated backup system..."
    
    check_backup_script
    setup_log_rotation
    setup_cron_job
    test_backup
    create_monitoring_script
    create_status_script
    show_cron_config
    
    log_info "Automated backup system setup completed!"
    log_info ""
    log_info "📝 Available commands:"
    log_info "  ./backup-database.sh        - Manual backup"
    log_info "  ./restore-database.sh       - Restore from backup"
    log_info "  ./check-backup-health.sh    - Check backup health"
    log_info "  ./backup-status.sh          - Show system status"
    log_info ""
    log_info "📅 Scheduled backups:"
    log_info "  Daily:  2:00 AM"
    log_info "  Weekly: 3:00 AM (Sundays)"
    log_info ""
    log_info "📋 Log file: $CRON_LOG"
}

# Error handling
trap 'log_error "Setup failed! Check the error above."' ERR

# Run main function
main "$@"