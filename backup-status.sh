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
