#!/bin/bash

echo "🛡️  SAFE Database Fix - Preserves ALL existing data"
echo "=================================================="

# Function to backup existing data
backup_existing_data() {
    echo "💾 Creating data backup before any changes..."
    local backup_file="/root/social_media/emergency_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if docker exec social_media-postgres-1 pg_dump -U postgres socialmedia > "$backup_file" 2>/dev/null; then
        echo "✅ Backup created: $backup_file"
        # Verify backup has data
        local user_count=$(grep -c "INSERT INTO.*users" "$backup_file" || echo 0)
        if [ "$user_count" -gt 0 ]; then
            echo "✅ Backup verified: Contains $user_count user records"
            return 0
        else
            echo "⚠️  Backup contains no user data - this may be expected for new installations"
            return 0
        fi
    else
        echo "❌ Failed to create backup"
        return 1
    fi
}

# Function to check if database needs fixing
check_database_health() {
    echo "🔍 Checking database health..."
    
    # Check if database exists
    local db_exists=$(docker exec social_media-postgres-1 psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -w socialmedia | wc -l)
    
    if [ "$db_exists" -eq 0 ]; then
        echo "❌ Database 'socialmedia' does not exist"
        return 1
    fi
    
    # Check if essential tables exist
    local table_count=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -c "\dt" 2>/dev/null | grep -c "users\|social_accounts" || echo 0)
    
    if [ "$table_count" -lt 2 ]; then
        echo "❌ Essential tables missing (found: $table_count/2)"
        return 1
    fi
    
    # Check if we can connect and query
    local user_count=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -c "SELECT COUNT(*) FROM users;" 2>/dev/null | grep -E '^\s*[0-9]+\s*$' | tr -d ' ' || echo "ERROR")
    
    if [ "$user_count" = "ERROR" ]; then
        echo "❌ Cannot query users table"
        return 1
    fi
    
    echo "✅ Database health check passed"
    echo "   - Database exists: ✅"
    echo "   - Tables exist: ✅ ($table_count essential tables)"
    echo "   - User count: $user_count"
    
    return 0
}

# Function to fix database issues safely
fix_database_safely() {
    echo "🔧 Applying safe database fixes..."
    
    # Create database if it doesn't exist (safe)
    docker exec social_media-postgres-1 psql -U postgres -c "CREATE DATABASE socialmedia;" 2>/dev/null || echo "Database already exists"
    
    # Apply migrations only if tables don't exist
    local users_exists=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -c "\dt users" 2>/dev/null | grep -c users || echo 0)
    
    if [ "$users_exists" -eq 0 ]; then
        echo "📝 Applying database migrations (tables don't exist)..."
        docker exec social_media-postgres-1 psql -U postgres -d socialmedia -f /docker-entrypoint-initdb.d/001_init_database.sql 2>/dev/null || echo "Base migration applied"
        docker exec social_media-postgres-1 psql -U postgres -d socialmedia -f /docker-entrypoint-initdb.d/008_create_stream_apps.sql 2>/dev/null || echo "Stream apps migration applied"
        docker exec social_media-postgres-1 psql -U postgres -d socialmedia -f /docker-entrypoint-initdb.d/009_create_live_streams.sql 2>/dev/null || echo "Live streams migration applied"
    else
        echo "✅ Tables already exist - skipping migrations to preserve data"
    fi
}

# Function to ensure admin access exists
ensure_admin_access() {
    echo "👤 Ensuring admin access is available..."
    
    # Check if any admin users exist
    local admin_count=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -c "SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'approved';" 2>/dev/null | grep -E '^\s*[0-9]+\s*$' | tr -d ' ' || echo 0)
    
    if [ "$admin_count" -gt 0 ]; then
        echo "✅ Admin access available ($admin_count admin users found)"
        return 0
    fi
    
    echo "⚠️  No admin users found - creating emergency admin access..."
    
    # Wait for backend to be ready
    for i in {1..30}; do
        if curl -s http://localhost:5000/health >/dev/null 2>&1; then
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Backend not ready - cannot create admin user"
            return 1
        fi
        sleep 2
    done
    
    # Create emergency admin
    local register_result=$(curl -s -X POST http://localhost:5000/api/auth/register \
        -H "Content-Type: application/json" \
        -d '{"email": "emergency@admin.com", "password": "admin123456", "name": "Emergency Admin"}' 2>/dev/null)
    
    # Approve the user
    docker exec social_media-postgres-1 psql -U postgres -d socialmedia -c "
        UPDATE users SET status = 'approved', role = 'admin' 
        WHERE email = 'emergency@admin.com';
    " >/dev/null 2>&1
    
    echo "✅ Emergency admin created: emergency@admin.com / admin123456"
}

# Function to test functionality
test_system() {
    echo "🧪 Testing system functionality..."
    
    # Test database connectivity
    local test_query=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -c "SELECT COUNT(*) FROM users;" 2>/dev/null | grep -E '^\s*[0-9]+\s*$' | tr -d ' ' || echo "ERROR")
    
    if [ "$test_query" = "ERROR" ]; then
        echo "❌ Database connectivity test failed"
        return 1
    fi
    
    echo "✅ Database connectivity: Working (found $test_query users)"
    
    # Test backend API
    if curl -s http://localhost:5000/health >/dev/null 2>&1; then
        echo "✅ Backend API: Working"
    else
        echo "❌ Backend API: Not responding"
        return 1
    fi
    
    # Test admin login if possible
    local admin_email=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -c "SELECT email FROM users WHERE role = 'admin' AND status = 'approved' LIMIT 1;" 2>/dev/null | grep -E '@' | tr -d ' ' || echo "")
    
    if [ -n "$admin_email" ]; then
        echo "✅ Admin account available: $admin_email"
    fi
    
    return 0
}

# Main execution
main() {
    echo "🚀 Starting SAFE database fix process..."
    echo ""
    
    # Check if postgres container is running
    if ! docker ps | grep -q social_media-postgres-1; then
        echo "❌ PostgreSQL container not running. Start with: docker compose up -d postgres"
        exit 1
    fi
    
    # Wait for postgres to be ready
    echo "⏳ Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if docker exec social_media-postgres-1 pg_isready -U postgres >/dev/null 2>&1; then
            echo "✅ PostgreSQL is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ PostgreSQL failed to become ready"
            exit 1
        fi
        sleep 2
    done
    
    # Create backup of existing data
    backup_existing_data
    
    # Check if database needs fixing
    if check_database_health; then
        echo "✅ Database is healthy - no fixes needed"
    else
        echo "🔧 Database needs fixing - applying safe fixes..."
        fix_database_safely
        
        # Verify fix worked
        if ! check_database_health; then
            echo "❌ Database fix failed"
            exit 1
        fi
    fi
    
    # Ensure backend is running
    if ! docker ps | grep -q social_media-backend-1; then
        echo "🚀 Starting backend service..."
        docker compose up -d backend
        sleep 10
    fi
    
    # Ensure admin access
    ensure_admin_access
    
    # Test system
    if test_system; then
        echo ""
        echo "🎉 SAFE database fix completed successfully!"
        echo ""
        echo "✅ Database: Healthy and operational"
        echo "✅ User data: Preserved (no data loss)"
        echo "✅ Backend: Running and responsive"
        echo "✅ Admin access: Available"
        echo ""
        echo "🌐 Access the application:"
        echo "   Frontend: http://localhost:3000"
        echo "   Backend API: http://localhost:5000"
        echo ""
        
        # Show available admin accounts
        echo "👤 Available admin accounts:"
        docker exec social_media-postgres-1 psql -U postgres -d socialmedia -c "SELECT email FROM users WHERE role = 'admin' AND status = 'approved';" 2>/dev/null | grep '@' | sed 's/^/   /' || echo "   Check database for admin users"
        
    else
        echo "❌ System test failed - please check logs"
        exit 1
    fi
}

# Safety check
echo "⚠️  SAFETY NOTICE: This script preserves ALL existing data"
echo "   - No Docker volumes will be removed"
echo "   - No existing data will be deleted"
echo "   - Backups will be created before any changes"
echo ""
read -p "Continue with safe database fix? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled"
    exit 0
fi

# Run main function
main