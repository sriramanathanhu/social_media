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
