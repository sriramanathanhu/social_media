#!/bin/bash

# Safe Deployment Script with Data Protection
# Ensures no data loss during deployments, builds, and upgrades

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROTECTION_SCRIPT="$SCRIPT_DIR/data-protection-system.sh"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[DEPLOY]${NC} $1"
}

log_error() {
    echo -e "${RED}[DEPLOY]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Show deployment menu
show_menu() {
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                        SAFE DEPLOYMENT SYSTEM                               ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Choose deployment type:"
    echo "1) 🔄 Code Update (backend/frontend changes)"
    echo "2) 📦 Full Rebuild (Docker images)"
    echo "3) 🗄️  Database Migration"
    echo "4) ⚡ Quick Restart (services only)"
    echo "5) 🛡️  Emergency Rollback"
    echo "6) 📊 Protection Status"
    echo "7) 🧪 Test Protection System"
    echo ""
    read -p "Select option (1-7): " choice
    echo ""
}

# Pre-deployment safety checks
pre_deployment_checks() {
    log_step "Running pre-deployment safety checks..."
    
    # Check if containers are running
    if ! docker ps | grep -q "social_media"; then
        log_error "Social media containers are not running!"
        return 1
    fi
    
    # Check database connectivity
    if ! docker exec social_media-postgres-1 pg_isready -U postgres >/dev/null 2>&1; then
        log_error "Database is not accessible!"
        return 1
    fi
    
    # Check data integrity
    local users=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
    if [ "$users" -lt 5 ]; then
        log_error "Data integrity check failed! Expected at least 5 users, found $users"
        return 1
    fi
    
    log_info "Pre-deployment checks passed ✅"
    return 0
}

# Code update deployment
deploy_code_update() {
    log_info "🔄 Starting code update deployment..."
    
    # Pre-deployment protection
    "$PROTECTION_SCRIPT" pre_deployment_protection
    
    # Build new images
    log_step "Building updated images..."
    docker-compose build --no-cache backend frontend
    
    # Rolling update
    log_step "Performing rolling update..."
    docker-compose up -d --no-deps backend
    sleep 5
    docker-compose up -d --no-deps frontend
    
    # Wait for services to be ready
    sleep 10
    
    # Post-deployment verification
    if "$PROTECTION_SCRIPT" post_deployment_verification; then
        log_info "Code update deployment successful! ✅"
    else
        log_error "Deployment verification failed! Initiating rollback..."
        "$PROTECTION_SCRIPT" emergency_restore pre_deployment
        return 1
    fi
}

# Full rebuild deployment
deploy_full_rebuild() {
    log_info "📦 Starting full rebuild deployment..."
    
    # Create comprehensive backup
    "$PROTECTION_SCRIPT" pre_deployment_protection
    ./backup-database.sh
    
    # Stop services (keep database running)
    log_step "Stopping application services..."
    docker-compose stop backend frontend
    
    # Rebuild everything
    log_step "Rebuilding all images..."
    docker-compose build --no-cache
    
    # Start services
    log_step "Starting services..."
    docker-compose up -d
    
    # Wait for full startup
    sleep 15
    
    # Verification
    if "$PROTECTION_SCRIPT" post_deployment_verification; then
        log_info "Full rebuild deployment successful! ✅"
    else
        log_error "Deployment verification failed! Manual intervention required."
        return 1
    fi
}

# Database migration
deploy_database_migration() {
    log_info "🗄️  Starting database migration..."
    
    # Enhanced backup before migration
    "$PROTECTION_SCRIPT" pre_deployment_protection
    ./backup-database.sh
    
    # Stop backend to prevent data conflicts
    log_step "Stopping backend service..."
    docker-compose stop backend
    
    # Run migrations
    log_step "Running database migrations..."
    if [ -d "./server/migrations" ]; then
        for migration in ./server/migrations/*.sql; do
            if [ -f "$migration" ]; then
                log_info "Running migration: $(basename "$migration")"
                docker exec -i social_media-postgres-1 psql -U postgres -d socialmedia < "$migration"
            fi
        done
    fi
    
    # Restart backend
    log_step "Restarting backend service..."
    docker-compose up -d backend
    sleep 10
    
    # Verification
    if "$PROTECTION_SCRIPT" post_deployment_verification; then
        log_info "Database migration successful! ✅"
    else
        log_error "Migration verification failed! Check logs for issues."
        return 1
    fi
}

# Quick restart
deploy_quick_restart() {
    log_info "⚡ Starting quick restart..."
    
    # Light protection (no full backup)
    "$PROTECTION_SCRIPT" init
    
    # Restart services
    log_step "Restarting services..."
    docker-compose restart backend frontend
    
    # Quick verification
    sleep 5
    if "$PROTECTION_SCRIPT" post_deployment_verification; then
        log_info "Quick restart successful! ✅"
    else
        log_warn "Quick restart completed with warnings"
    fi
}

# Emergency rollback
emergency_rollback() {
    log_warn "🛡️  Starting emergency rollback..."
    
    echo "Available rollback options:"
    echo "1) Pre-deployment backup"
    echo "2) Latest regular backup"
    echo "3) Cancel rollback"
    
    read -p "Select rollback option (1-3): " rollback_choice
    
    case $rollback_choice in
        1)
            "$PROTECTION_SCRIPT" emergency_restore pre_deployment
            ;;
        2)
            ./restore-database.sh
            ;;
        3)
            log_info "Rollback cancelled"
            return 0
            ;;
        *)
            log_error "Invalid option"
            return 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        log_info "Emergency rollback completed! ✅"
        # Restart services to pick up restored data
        docker-compose restart backend frontend
    else
        log_error "Emergency rollback failed!"
        return 1
    fi
}

# Test protection system
test_protection_system() {
    log_info "🧪 Testing protection system..."
    
    # Run all protection operations
    "$PROTECTION_SCRIPT" init
    "$PROTECTION_SCRIPT" pre_deployment_protection
    "$PROTECTION_SCRIPT" post_deployment_verification
    "$PROTECTION_SCRIPT" status
    
    log_info "Protection system test completed! ✅"
}

# Main execution
main() {
    cd "$SCRIPT_DIR"
    
    # Check if protection script exists
    if [ ! -f "$PROTECTION_SCRIPT" ]; then
        log_error "Data protection script not found: $PROTECTION_SCRIPT"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml not found. Please run from project root."
        exit 1
    fi
    
    show_menu
    
    case $choice in
        1)
            pre_deployment_checks && deploy_code_update
            ;;
        2)
            pre_deployment_checks && deploy_full_rebuild
            ;;
        3)
            pre_deployment_checks && deploy_database_migration
            ;;
        4)
            deploy_quick_restart
            ;;
        5)
            emergency_rollback
            ;;
        6)
            "$PROTECTION_SCRIPT" status
            ;;
        7)
            test_protection_system
            ;;
        *)
            log_error "Invalid option selected"
            exit 1
            ;;
    esac
}

# Error handling
trap 'log_error "Deployment failed! Check logs for details."' ERR

# Run main function
main "$@"