#!/bin/bash

# Data Protection System for Social Media App
# Prevents data loss during deployments, builds, and upgrades

set -euo pipefail

# Configuration
BACKUP_DIR="/root/social_media/database_backups"
PROTECTION_DIR="/root/social_media/data_protection"
DEPLOY_BACKUP_DIR="$PROTECTION_DIR/deployment_backups"
SCHEMA_DIR="$PROTECTION_DIR/schema_snapshots"
LOG_FILE="/var/log/socialmedia-data-protection.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_protection() {
    echo -e "${BLUE}[PROTECTION]${NC} $1" | tee -a "$LOG_FILE"
}

# Initialize protection system
init_protection_system() {
    log_info "Initializing data protection system..."
    
    # Create protection directories
    mkdir -p "$PROTECTION_DIR"
    mkdir -p "$DEPLOY_BACKUP_DIR"
    mkdir -p "$SCHEMA_DIR"
    
    # Create git repository for tracking changes
    if [ ! -d "$PROTECTION_DIR/.git" ]; then
        cd "$PROTECTION_DIR"
        git init
        git config user.email "system@socialmedia.app"
        git config user.name "Data Protection System"
        cd - >/dev/null
        log_info "Git repository initialized for data protection tracking"
    fi
    
    log_info "Protection system initialized"
}

# Create schema snapshot
create_schema_snapshot() {
    local snapshot_file="$SCHEMA_DIR/schema_$(date +%Y%m%d_%H%M%S).sql"
    
    log_protection "Creating schema snapshot..."
    
    docker exec social_media-postgres-1 pg_dump -U postgres -d socialmedia \
        --schema-only --no-owner --no-privileges > "$snapshot_file"
    
    if [ $? -eq 0 ]; then
        log_info "Schema snapshot created: $(basename "$snapshot_file")"
        return 0
    else
        log_error "Failed to create schema snapshot"
        return 1
    fi
}

# Create data snapshot with metadata
create_data_snapshot() {
    local purpose="$1"
    local snapshot_file="$DEPLOY_BACKUP_DIR/data_${purpose}_$(date +%Y%m%d_%H%M%S).sql.gz"
    local metadata_file="${snapshot_file%.sql.gz}_metadata.json"
    
    log_protection "Creating data snapshot for: $purpose"
    
    # Create data backup
    if docker exec social_media-postgres-1 pg_dump -U postgres -d socialmedia \
        --data-only --no-owner --no-privileges | gzip > "$snapshot_file"; then
        
        # Create metadata
        cat > "$metadata_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "purpose": "$purpose",
    "database": "socialmedia",
    "backup_file": "$(basename "$snapshot_file")",
    "file_size": "$(du -h "$snapshot_file" | cut -f1)",
    "record_counts": {
        "users": $(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0"),
        "social_accounts": $(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM social_accounts;" 2>/dev/null | tr -d ' ' || echo "0"),
        "posts": $(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM posts;" 2>/dev/null | tr -d ' ' || echo "0"),
        "stream_apps": $(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM stream_apps;" 2>/dev/null | tr -d ' ' || echo "0"),
        "live_streams": $(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM live_streams;" 2>/dev/null | tr -d ' ' || echo "0")
    },
    "docker_containers": [
        $(docker ps --format '"{{.Names}}"' | grep social_media | paste -sd, -)
    ],
    "git_commit": "$(cd /root/social_media && git rev-parse HEAD 2>/dev/null || echo 'unknown')"
}
EOF
        
        log_info "Data snapshot created: $(basename "$snapshot_file")"
        log_info "Metadata saved: $(basename "$metadata_file")"
        return 0
    else
        log_error "Failed to create data snapshot"
        return 1
    fi
}

# Pre-deployment protection
pre_deployment_protection() {
    log_protection "=== PRE-DEPLOYMENT PROTECTION ==="
    
    init_protection_system
    create_schema_snapshot
    create_data_snapshot "pre_deployment"
    
    # Create deployment state file
    cat > "$PROTECTION_DIR/deployment_state.json" << EOF
{
    "deployment_started": "$(date -Iseconds)",
    "pre_deployment_backup": true,
    "protection_active": true,
    "rollback_ready": true
}
EOF
    
    # Commit to git
    cd "$PROTECTION_DIR"
    git add .
    git commit -m "Pre-deployment protection: $(date)" >/dev/null 2>&1 || true
    cd - >/dev/null
    
    log_protection "Pre-deployment protection completed"
}

# Post-deployment verification
post_deployment_verification() {
    log_protection "=== POST-DEPLOYMENT VERIFICATION ==="
    
    # Verify data integrity
    local current_users=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
    local current_accounts=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM social_accounts;" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [ "$current_users" -ge 5 ] && [ "$current_accounts" -ge 5 ]; then
        log_info "Data integrity verification passed"
        log_info "Users: $current_users, Social Accounts: $current_accounts"
        
        # Create post-deployment snapshot
        create_data_snapshot "post_deployment"
        
        # Update deployment state
        cat > "$PROTECTION_DIR/deployment_state.json" << EOF
{
    "deployment_completed": "$(date -Iseconds)",
    "post_deployment_backup": true,
    "data_integrity_verified": true,
    "protection_active": true
}
EOF
        
        log_protection "Post-deployment verification completed successfully"
        return 0
    else
        log_error "Data integrity verification failed!"
        log_error "Expected: Users >= 5, Social Accounts >= 5"
        log_error "Found: Users = $current_users, Social Accounts = $current_accounts"
        return 1
    fi
}

# Emergency data restoration
emergency_restore() {
    local backup_type="${1:-pre_deployment}"
    
    log_protection "=== EMERGENCY DATA RESTORATION ==="
    log_warn "Initiating emergency restoration from $backup_type backup"
    
    # Find latest backup of specified type
    local latest_backup=$(ls -t "$DEPLOY_BACKUP_DIR"/data_${backup_type}_*.sql.gz 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        log_error "No $backup_type backup found for emergency restoration"
        return 1
    fi
    
    log_info "Using backup: $(basename "$latest_backup")"
    
    # Create emergency backup of current state
    create_data_snapshot "emergency_current_state"
    
    # Restore from backup
    if zcat "$latest_backup" | docker exec -i social_media-postgres-1 psql -U postgres -d socialmedia >/dev/null 2>&1; then
        log_info "Emergency restoration completed successfully"
        
        # Restart services
        docker restart social_media-backend-1 >/dev/null 2>&1
        
        # Verify restoration
        post_deployment_verification
        
        return 0
    else
        log_error "Emergency restoration failed"
        return 1
    fi
}

# Setup deployment hooks
setup_deployment_hooks() {
    log_info "Setting up deployment protection hooks..."
    
    # Create pre-deployment hook
    cat > /root/social_media/pre-deploy-hook.sh << 'EOF'
#!/bin/bash
echo "🛡️  Activating data protection..."
/root/social_media/data-protection-system.sh pre_deployment_protection
if [ $? -eq 0 ]; then
    echo "✅ Pre-deployment protection activated"
else
    echo "❌ Pre-deployment protection failed - ABORTING DEPLOYMENT"
    exit 1
fi
EOF

    # Create post-deployment hook
    cat > /root/social_media/post-deploy-hook.sh << 'EOF'
#!/bin/bash
echo "🔍 Verifying deployment data integrity..."
/root/social_media/data-protection-system.sh post_deployment_verification
if [ $? -eq 0 ]; then
    echo "✅ Deployment verification successful"
else
    echo "❌ Deployment verification failed - initiating rollback"
    /root/social_media/data-protection-system.sh emergency_restore pre_deployment
    exit 1
fi
EOF
    
    chmod +x /root/social_media/pre-deploy-hook.sh
    chmod +x /root/social_media/post-deploy-hook.sh
    
    log_info "Deployment hooks created successfully"
}

# Status dashboard
show_protection_status() {
    echo "=== DATA PROTECTION STATUS ==="
    echo "Timestamp: $(date)"
    echo ""
    
    echo "📁 Protection Directories:"
    echo "  Main: $PROTECTION_DIR"
    echo "  Deployment Backups: $DEPLOY_BACKUP_DIR"
    echo "  Schema Snapshots: $SCHEMA_DIR"
    echo ""
    
    echo "💾 Recent Protection Backups:"
    if ls -t "$DEPLOY_BACKUP_DIR"/*.sql.gz >/dev/null 2>&1; then
        ls -lth "$DEPLOY_BACKUP_DIR"/*.sql.gz | head -3
    else
        echo "  No protection backups found"
    fi
    echo ""
    
    echo "📋 Current Data Counts:"
    echo "  Users: $(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "ERROR")"
    echo "  Social Accounts: $(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM social_accounts;" 2>/dev/null | tr -d ' ' || echo "ERROR")"
    echo "  Posts: $(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM posts;" 2>/dev/null | tr -d ' ' || echo "ERROR")"
    echo "  Stream Apps: $(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM stream_apps;" 2>/dev/null | tr -d ' ' || echo "ERROR")"
    echo "  Live Streams: $(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM live_streams;" 2>/dev/null | tr -d ' ' || echo "ERROR")"
    echo ""
    
    if [ -f "$PROTECTION_DIR/deployment_state.json" ]; then
        echo "🔄 Deployment State:"
        cat "$PROTECTION_DIR/deployment_state.json" | jq . 2>/dev/null || cat "$PROTECTION_DIR/deployment_state.json"
    fi
    
    echo "================================"
}

# Main execution
case "${1:-status}" in
    "init")
        init_protection_system
        ;;
    "pre_deployment_protection")
        pre_deployment_protection
        ;;
    "post_deployment_verification")
        post_deployment_verification
        ;;
    "emergency_restore")
        emergency_restore "${2:-pre_deployment}"
        ;;
    "setup_hooks")
        setup_deployment_hooks
        ;;
    "status")
        show_protection_status
        ;;
    *)
        echo "Usage: $0 {init|pre_deployment_protection|post_deployment_verification|emergency_restore|setup_hooks|status}"
        exit 1
        ;;
esac