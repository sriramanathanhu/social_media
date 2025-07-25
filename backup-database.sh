#!/bin/bash

# PostgreSQL Database Backup Script for Social Media App
# Supports Docker Compose environment with automatic rotation

set -euo pipefail

# Configuration
BACKUP_DIR="/root/social_media/database_backups"
CONTAINER_NAME="social_media-postgres-1"
DB_NAME="socialmedia"
DB_USER="postgres"
RETENTION_DAYS=30
MAX_BACKUPS=10

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/socialmedia_backup_$TIMESTAMP.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Function to check if container is running
check_container() {
    if ! docker ps --format "table {{.Names}}" | grep -q "^$CONTAINER_NAME$"; then
        log_error "PostgreSQL container '$CONTAINER_NAME' is not running"
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

# Function to create backup
create_backup() {
    log_info "Starting backup to: $BACKUP_FILE"
    
    # Create backup with custom format for better compression and features
    if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --no-owner --no-privileges \
        --format=custom --compress=9 > "${BACKUP_FILE}.custom" 2>/dev/null; then
        log_info "Custom format backup created successfully"
    else
        log_error "Custom format backup failed"
        rm -f "${BACKUP_FILE}.custom"
    fi
    
    # Create SQL dump for easy restoration
    if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --no-owner --no-privileges > "$BACKUP_FILE" 2>/dev/null; then
        log_info "SQL backup created successfully"
        
        # Compress the SQL file
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        log_info "Backup compressed: $BACKUP_FILE"
        
        # Get backup size
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_info "Backup size: $BACKUP_SIZE"
        
    else
        log_error "SQL backup failed"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
}

# Function to verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."
    
    if [ -f "${BACKUP_FILE}.custom" ]; then
        # Verify custom format backup
        if docker exec "$CONTAINER_NAME" pg_restore --list "${BACKUP_FILE}.custom" >/dev/null 2>&1; then
            log_info "Custom backup verification successful"
        else
            log_warn "Custom backup verification failed"
        fi
    fi
    
    # Verify compressed SQL backup
    if zcat "$BACKUP_FILE" | head -n 10 | grep -q "PostgreSQL database dump"; then
        log_info "SQL backup verification successful"
    else
        log_warn "SQL backup verification failed"
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (keeping last $MAX_BACKUPS files)..."
    
    # Remove backups older than retention period
    find "$BACKUP_DIR" -name "socialmedia_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "socialmedia_backup_*.custom" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Keep only the most recent backups (by count)
    ls -t "$BACKUP_DIR"/socialmedia_backup_*.sql.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f
    ls -t "$BACKUP_DIR"/socialmedia_backup_*.custom 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f
    
    # Count remaining backups
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/socialmedia_backup_*.sql.gz 2>/dev/null | wc -l)
    log_info "Backup cleanup complete. $BACKUP_COUNT backups retained."
}

# Function to generate backup summary
generate_summary() {
    echo "=== BACKUP SUMMARY ==="
    echo "Timestamp: $(date)"
    echo "Database: $DB_NAME"
    echo "Backup file: $BACKUP_FILE"
    echo "Container: $CONTAINER_NAME"
    
    if [ -f "$BACKUP_FILE" ]; then
        echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
        echo "Status: SUCCESS"
    else
        echo "Status: FAILED"
    fi
    
    echo "Total backups: $(ls -1 "$BACKUP_DIR"/socialmedia_backup_*.sql.gz 2>/dev/null | wc -l)"
    echo "======================="
}

# Main execution
main() {
    log_info "Starting PostgreSQL backup process..."
    
    check_container
    test_connection
    create_backup
    verify_backup
    cleanup_old_backups
    generate_summary
    
    log_info "Backup process completed successfully!"
}

# Error handling
trap 'log_error "Backup failed! Check the logs above for details."' ERR

# Run main function
main "$@"