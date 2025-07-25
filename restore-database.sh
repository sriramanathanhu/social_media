#!/bin/bash

# PostgreSQL Database Restore Script for Social Media App
# Supports Docker Compose environment with safety checks

set -euo pipefail

# Configuration
BACKUP_DIR="/root/social_media/database_backups"
CONTAINER_NAME="social_media-postgres-1"
DB_NAME="socialmedia"
DB_USER="postgres"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_prompt() {
    echo -e "${BLUE}[PROMPT]${NC} $1"
}

# Function to show usage
usage() {
    echo "Usage: $0 [backup_file]"
    echo ""
    echo "If no backup file is specified, the most recent backup will be used."
    echo ""
    echo "Available backups:"
    ls -lt "$BACKUP_DIR"/socialmedia_backup_*.sql.gz 2>/dev/null | head -5 || echo "No backups found"
    exit 1
}

# Function to check if container is running
check_container() {
    if ! docker ps --format "table {{.Names}}" | grep -q "^$CONTAINER_NAME$"; then
        log_error "PostgreSQL container '$CONTAINER_NAME' is not running"
        log_info "Start the container with: docker-compose up -d postgres"
        exit 1
    fi
    log_info "PostgreSQL container is running"
}

# Function to test database connectivity
test_connection() {
    if ! docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" >/dev/null 2>&1; then
        log_error "Cannot connect to PostgreSQL database"
        exit 1
    fi
    log_info "Database connection successful"
}

# Function to select backup file
select_backup_file() {
    if [ -n "${1:-}" ]; then
        # Backup file specified as argument
        if [[ "$1" == /* ]]; then
            BACKUP_FILE="$1"  # Absolute path
        else
            BACKUP_FILE="$BACKUP_DIR/$1"  # Relative to backup directory
        fi
        
        # Add .gz extension if not present
        if [[ "$BACKUP_FILE" != *.gz ]] && [[ "$BACKUP_FILE" != *.custom ]]; then
            if [ -f "${BACKUP_FILE}.gz" ]; then
                BACKUP_FILE="${BACKUP_FILE}.gz"
            elif [ -f "${BACKUP_FILE}.custom" ]; then
                BACKUP_FILE="${BACKUP_FILE}.custom"
            fi
        fi
    else
        # Use most recent backup
        BACKUP_FILE=$(ls -t "$BACKUP_DIR"/socialmedia_backup_*.sql.gz 2>/dev/null | head -1)
        if [ -z "$BACKUP_FILE" ]; then
            log_error "No backup files found in $BACKUP_DIR"
            exit 1
        fi
        log_info "Using most recent backup: $(basename "$BACKUP_FILE")"
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    log_info "Selected backup: $BACKUP_FILE"
    log_info "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
    log_info "Backup date: $(stat -c %y "$BACKUP_FILE")"
}

# Function to create safety backup before restore
create_safety_backup() {
    log_warn "Creating safety backup before restore..."
    SAFETY_BACKUP="/tmp/socialmedia_safety_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" \
        --clean --no-owner --no-privileges > "$SAFETY_BACKUP" 2>/dev/null; then
        gzip "$SAFETY_BACKUP"
        log_info "Safety backup created: ${SAFETY_BACKUP}.gz"
    else
        log_warn "Could not create safety backup (database might be empty)"
    fi
}

# Function to confirm restore operation
confirm_restore() {
    echo ""
    log_warn "⚠️  WARNING: This operation will REPLACE all data in the database!"
    log_warn "Database: $DB_NAME"
    log_warn "Backup: $(basename "$BACKUP_FILE")"
    echo ""
    
    read -p "Are you sure you want to proceed? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Restore operation cancelled"
        exit 0
    fi
}

# Function to restore database
restore_database() {
    log_info "Starting database restore..."
    
    # Determine backup format
    if [[ "$BACKUP_FILE" == *.custom ]]; then
        # Custom format restore
        log_info "Restoring from custom format backup..."
        if docker exec -i "$CONTAINER_NAME" pg_restore -U "$DB_USER" -d "$DB_NAME" \
            --verbose --clean --no-owner --no-privileges < "$BACKUP_FILE"; then
            log_info "Custom format restore completed successfully"
        else
            log_error "Custom format restore failed"
            exit 1
        fi
    else
        # SQL dump restore
        log_info "Restoring from SQL dump..."
        if zcat "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
            log_info "SQL restore completed successfully"
        else
            log_error "SQL restore failed"
            exit 1
        fi
    fi
}

# Function to verify restore
verify_restore() {
    log_info "Verifying restore..."
    
    # Check if basic tables exist
    TABLES=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "\dt" | wc -l)
    if [ "$TABLES" -gt 5 ]; then
        log_info "Restore verification successful ($TABLES tables found)"
    else
        log_warn "Restore verification uncertain (only $TABLES tables found)"
    fi
    
    # Check for admin user
    ADMIN_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE role = 'admin';" 2>/dev/null || echo "0")
    if [ "$ADMIN_COUNT" -gt 0 ]; then
        log_info "Admin users found: $ADMIN_COUNT"
    else
        log_warn "No admin users found in restored database"
    fi
}

# Function to restart application services
restart_services() {
    log_info "Restarting application services..."
    
    if command -v docker-compose >/dev/null 2>&1; then
        cd /root/social_media
        docker-compose restart backend frontend || log_warn "Failed to restart services"
    else
        docker restart social_media-backend-1 social_media-frontend-1 2>/dev/null || log_warn "Failed to restart services"
    fi
    
    log_info "Services restart initiated"
}

# Main execution
main() {
    log_info "Starting PostgreSQL restore process..."
    
    # Show usage if help requested
    if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
        usage
    fi
    
    check_container
    test_connection
    select_backup_file "${1:-}"
    confirm_restore
    create_safety_backup
    restore_database
    verify_restore
    restart_services
    
    log_info "Database restore completed successfully!"
    log_info "You can now access the application with the restored data."
}

# Error handling
trap 'log_error "Restore failed! Check the logs above for details."' ERR

# Run main function
main "$@"