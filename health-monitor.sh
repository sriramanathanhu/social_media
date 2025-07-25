#!/bin/bash

# Comprehensive Health Monitoring Script for Social Media App
# Monitors all system components and alerts on issues

set -euo pipefail

# Configuration
LOG_FILE="/var/log/socialmedia-health.log"
ALERT_EMAIL=""  # Set email for alerts (optional)
BACKUP_DIR="/root/social_media/database_backups"
MAX_RESPONSE_TIME_MS=5000  # Alert if response time > 5 seconds
MAX_CPU_PERCENT=80
MAX_MEMORY_PERCENT=85
MIN_DISK_FREE_GB=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Status counters
CRITICAL_COUNT=0
WARNING_COUNT=0
OK_COUNT=0

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $1" | tee -a "$LOG_FILE"
    ((CRITICAL_COUNT++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
    ((WARNING_COUNT++))
}

log_ok() {
    echo -e "${GREEN}[OK]${NC} $1" | tee -a "$LOG_FILE"
    ((OK_COUNT++))
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to check Docker containers
check_containers() {
    log_info "Checking Docker containers..."
    
    local containers=("social_media-postgres-1" "social_media-backend-1" "social_media-frontend-1")
    
    for container in "${containers[@]}"; do
        if docker ps --format "{{.Names}}" | grep -q "^$container$"; then
            log_ok "Container $container is running"
        else
            log_critical "Container $container is not running"
        fi
    done
}

# Function to check database connectivity and health
check_database() {
    log_info "Checking database health..."
    
    # Test basic connectivity
    if docker exec social_media-postgres-1 pg_isready -U postgres >/dev/null 2>&1; then
        log_ok "Database connection successful"
        
        # Check database exists and has tables
        local table_count=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "\dt" 2>/dev/null | wc -l)
        if [ "$table_count" -gt 5 ]; then
            log_ok "Database schema intact ($table_count tables)"
        else
            log_critical "Database schema incomplete (only $table_count tables)"
        fi
        
        # Check user data
        local user_count=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
        if [ "$user_count" -gt 0 ]; then
            log_ok "User data present ($user_count users)"
        else
            log_warning "No users found in database"
        fi
        
        # Check database performance
        local query_time=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "\timing on" -c "SELECT COUNT(*) FROM posts;" 2>&1 | grep "Time:" | awk '{print $2}' | cut -d. -f1 || echo "0")
        if [ "${query_time:-0}" -lt 1000 ]; then
            log_ok "Database query performance good (${query_time:-unknown}ms)"
        else
            log_warning "Database query performance slow (${query_time:-unknown}ms)"
        fi
        
    else
        log_critical "Database connection failed"
    fi
}

# Function to check web application accessibility
check_web_application() {
    log_info "Checking web application accessibility..."
    
    # Check backend API health endpoint
    local backend_response=$(curl -s -w "%{http_code}:%{time_total}" http://localhost:5000/health 2>/dev/null || echo "000:999")
    local backend_status=$(echo "$backend_response" | cut -d: -f1)
    local backend_time=$(echo "$backend_response" | cut -d: -f2 | cut -d. -f1)
    
    if [ "$backend_status" = "200" ]; then
        if [ "${backend_time:-999}" -lt 5 ]; then
            log_ok "Backend API accessible (${backend_time}s response time)"
        else
            log_warning "Backend API slow (${backend_time}s response time)"
        fi
    else
        log_critical "Backend API not accessible (HTTP $backend_status)"
    fi
    
    # Check frontend accessibility
    local frontend_response=$(curl -s -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
    if [ "$frontend_response" = "200" ]; then
        log_ok "Frontend accessible"
    else
        log_critical "Frontend not accessible (HTTP $frontend_response)"
    fi
    
    # Check external domain (if configured)
    if curl -s -w "%{http_code}" https://live.ecitizen.media/health 2>/dev/null | grep -q "200"; then
        log_ok "External domain accessible (live.ecitizen.media)"
    else
        log_warning "External domain not accessible or SSL issues"
    fi
}

# Function to check system resources
check_system_resources() {
    log_info "Checking system resources..."
    
    # Check CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d% -f1 | cut -d, -f1)
    cpu_usage=${cpu_usage//[a-z]/}  # Remove any letters
    cpu_usage=$(echo "$cpu_usage" | tr -d ' ')  # Remove spaces
    
    if [ "${cpu_usage:-0}" -lt $MAX_CPU_PERCENT ]; then
        log_ok "CPU usage normal (${cpu_usage:-unknown}%)"
    else
        log_warning "High CPU usage (${cpu_usage:-unknown}%)"
    fi
    
    # Check memory usage
    local memory_info=$(free | grep Mem)
    local total_mem=$(echo "$memory_info" | awk '{print $2}')
    local used_mem=$(echo "$memory_info" | awk '{print $3}')
    local memory_percent=$((used_mem * 100 / total_mem))
    
    if [ "$memory_percent" -lt $MAX_MEMORY_PERCENT ]; then
        log_ok "Memory usage normal (${memory_percent}%)"
    else
        log_warning "High memory usage (${memory_percent}%)"
    fi
    
    # Check disk space
    local disk_free_gb=$(df /root | tail -1 | awk '{print int($4/1024/1024)}')
    if [ "$disk_free_gb" -gt $MIN_DISK_FREE_GB ]; then
        log_ok "Disk space sufficient (${disk_free_gb}GB free)"
    else
        log_warning "Low disk space (${disk_free_gb}GB free)"
    fi
}

# Function to check backup system
check_backup_system() {
    log_info "Checking backup system..."
    
    # Check if backup directory exists and has recent backups
    if [ -d "$BACKUP_DIR" ]; then
        local backup_count=$(ls -1 "$BACKUP_DIR"/socialmedia_backup_*.sql.gz 2>/dev/null | wc -l)
        if [ "$backup_count" -gt 0 ]; then
            local latest_backup=$(ls -t "$BACKUP_DIR"/socialmedia_backup_*.sql.gz 2>/dev/null | head -1)
            local backup_age_hours=$((($(date +%s) - $(stat -c %Y "$latest_backup")) / 3600))
            
            if [ "$backup_age_hours" -lt 26 ]; then
                log_ok "Recent backup available ($backup_count backups, latest ${backup_age_hours}h old)"
            else
                log_warning "Latest backup is old (${backup_age_hours}h old)"
            fi
        else
            log_critical "No backups found"
        fi
    else
        log_critical "Backup directory not found"
    fi
    
    # Check cron jobs
    if crontab -l | grep -q "backup-database.sh"; then
        log_ok "Backup cron job configured"
    else
        log_warning "Backup cron job not found"
    fi
}

# Function to check SSL certificates
check_ssl_certificates() {
    log_info "Checking SSL certificates..."
    
    local domain="live.ecitizen.media"
    local cert_info=$(echo "" | timeout 10 openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")
    
    if [ -n "$cert_info" ]; then
        local expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
        local expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
        local current_epoch=$(date +%s)
        local days_until_expiry=$(((expiry_epoch - current_epoch) / 86400))
        
        if [ "$days_until_expiry" -gt 30 ]; then
            log_ok "SSL certificate valid ($days_until_expiry days until expiry)"
        elif [ "$days_until_expiry" -gt 7 ]; then
            log_warning "SSL certificate expires soon ($days_until_expiry days)"
        else
            log_critical "SSL certificate expires very soon ($days_until_expiry days)"
        fi
    else
        log_warning "Could not check SSL certificate for $domain"
    fi
}

# Function to check Docker volumes
check_docker_volumes() {
    log_info "Checking Docker volumes..."
    
    local required_volumes=("social_media_postgres_data")
    
    for volume in "${required_volumes[@]}"; do
        if docker volume inspect "$volume" >/dev/null 2>&1; then
            local mount_point=$(docker volume inspect "$volume" --format '{{.Mountpoint}}')
            local volume_size=$(du -sh "$mount_point" 2>/dev/null | cut -f1 || echo "unknown")
            log_ok "Volume $volume exists (size: $volume_size)"
        else
            log_critical "Volume $volume not found"
        fi
    done
}

# Function to generate summary report
generate_summary() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local total_checks=$((CRITICAL_COUNT + WARNING_COUNT + OK_COUNT))
    
    echo ""
    echo "=== HEALTH MONITORING SUMMARY ==="
    echo "Timestamp: $timestamp"
    echo "Total checks: $total_checks"
    echo "✅ OK: $OK_COUNT"
    echo "⚠️  Warning: $WARNING_COUNT"
    echo "❌ Critical: $CRITICAL_COUNT"
    echo ""
    
    if [ "$CRITICAL_COUNT" -gt 0 ]; then
        echo "🚨 OVERALL STATUS: CRITICAL - Immediate attention required"
        return 2
    elif [ "$WARNING_COUNT" -gt 0 ]; then
        echo "⚠️  OVERALL STATUS: WARNING - Issues need attention"
        return 1
    else
        echo "✅ OVERALL STATUS: HEALTHY - All systems operational"
        return 0
    fi
}

# Function to send alerts (if email configured)
send_alert() {
    if [ -n "$ALERT_EMAIL" ] && [ "$CRITICAL_COUNT" -gt 0 ]; then
        echo "Critical issues detected in Social Media App health check. Check $LOG_FILE for details." | \
        mail -s "Social Media App - Critical Health Alert" "$ALERT_EMAIL" 2>/dev/null || true
    fi
}

# Main execution
main() {
    echo "$(date): Starting health check..." >> "$LOG_FILE"
    
    log_info "=== SOCIAL MEDIA APP HEALTH CHECK ==="
    log_info "Starting comprehensive health monitoring..."
    
    check_containers
    check_database
    check_web_application
    check_system_resources
    check_backup_system
    check_ssl_certificates
    check_docker_volumes
    
    local exit_code=0
    generate_summary || exit_code=$?
    send_alert
    
    echo "$(date): Health check completed. Status: $exit_code" >> "$LOG_FILE"
    exit $exit_code
}

# Run main function
main "$@"