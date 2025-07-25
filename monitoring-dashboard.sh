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
