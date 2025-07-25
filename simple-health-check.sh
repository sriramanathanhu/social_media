#!/bin/bash

# Simple Health Check Script for Social Media App
# Quick status verification for critical components

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== SOCIAL MEDIA APP HEALTH CHECK ==="
echo "Timestamp: $(date)"
echo ""

# Check containers
echo "🐳 Container Status:"
containers=("social_media-postgres-1" "social_media-backend-1" "social_media-frontend-1")
for container in "${containers[@]}"; do
    if docker ps --format "{{.Names}}" | grep -q "^$container$"; then
        echo -e "  ✅ $container: ${GREEN}Running${NC}"
    else
        echo -e "  ❌ $container: ${RED}Not Running${NC}"
    fi
done
echo ""

# Check database
echo "🗄️  Database Status:"
if docker exec social_media-postgres-1 pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "  ✅ Connection: ${GREEN}OK${NC}"
    
    tables=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "\dt" 2>/dev/null | wc -l)
    echo -e "  📊 Tables: ${GREEN}$tables found${NC}"
    
    users=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
    echo -e "  👥 Users: ${GREEN}$users${NC}"
else
    echo -e "  ❌ Database: ${RED}Connection Failed${NC}"
fi
echo ""

# Check web services
echo "🌐 Web Services:"
if curl -s http://localhost:5000/health >/dev/null 2>&1; then
    echo -e "  ✅ Backend API: ${GREEN}Accessible${NC}"
else
    echo -e "  ❌ Backend API: ${RED}Not Accessible${NC}"
fi

if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo -e "  ✅ Frontend: ${GREEN}Accessible${NC}"
else
    echo -e "  ❌ Frontend: ${RED}Not Accessible${NC}"
fi
echo ""

# Check backups
echo "💾 Backup Status:"
backup_dir="/root/social_media/database_backups"
if [ -d "$backup_dir" ]; then
    backup_count=$(ls -1 "$backup_dir"/socialmedia_backup_*.sql.gz 2>/dev/null | wc -l)
    if [ "$backup_count" -gt 0 ]; then
        latest_backup=$(ls -t "$backup_dir"/socialmedia_backup_*.sql.gz 2>/dev/null | head -1)
        backup_age_hours=$((($(date +%s) - $(stat -c %Y "$latest_backup")) / 3600))
        echo -e "  ✅ Backups: ${GREEN}$backup_count available, latest ${backup_age_hours}h old${NC}"
    else
        echo -e "  ⚠️  Backups: ${YELLOW}No backups found${NC}"
    fi
else
    echo -e "  ❌ Backups: ${RED}Backup directory not found${NC}"
fi
echo ""

# System resources
echo "⚡ System Resources:"
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d% -f1 | cut -d, -f1 | tr -d 'us ')
memory_percent=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
disk_free=$(df /root | tail -1 | awk '{printf "%.1f", $4/1024/1024}')

echo -e "  🔥 CPU: ${cpu_usage:-?}%"
echo -e "  🧠 Memory: ${memory_percent}%"
echo -e "  💿 Disk Free: ${disk_free}GB"
echo ""

echo "=== END HEALTH CHECK ==="