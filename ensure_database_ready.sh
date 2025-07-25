#!/bin/bash

echo "🔍 Checking database state and ensuring it's ready..."

# Function to check if database exists and has tables
check_database() {
    local db_exists=$(docker exec social_media-postgres-1 psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -w socialmedia | wc -l)
    local tables_exist=0
    
    if [ "$db_exists" -gt 0 ]; then
        tables_exist=$(docker exec social_media-postgres-1 psql -U postgres -d socialmedia -c "\dt" 2>/dev/null | grep -c "users\|social_accounts\|posts" || echo 0)
    fi
    
    echo "Database exists: $db_exists, Tables exist: $tables_exist"
    
    if [ "$db_exists" -gt 0 ] && [ "$tables_exist" -gt 0 ]; then
        return 0  # Database is ready
    else
        return 1  # Database needs setup
    fi
}

# Function to setup database
setup_database() {
    echo "📝 Setting up database..."
    
    # Create database if it doesn't exist
    docker exec social_media-postgres-1 psql -U postgres -c "CREATE DATABASE socialmedia;" 2>/dev/null || echo "Database already exists"
    
    # Apply migrations in order
    echo "🔄 Applying migrations..."
    docker exec social_media-postgres-1 psql -U postgres -d socialmedia -f /docker-entrypoint-initdb.d/001_init_database.sql
    docker exec social_media-postgres-1 psql -U postgres -d socialmedia -f /docker-entrypoint-initdb.d/008_create_stream_apps.sql
    docker exec social_media-postgres-1 psql -U postgres -d socialmedia -f /docker-entrypoint-initdb.d/009_create_live_streams.sql
    
    echo "✅ Database migrations applied"
}

# Function to create admin user
create_admin_user() {
    echo "👤 Ensuring admin user exists..."
    
    # Wait for backend to be ready
    for i in {1..30}; do
        if curl -s http://localhost:5000/health >/dev/null 2>&1; then
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Backend not ready after 30 attempts"
            return 1
        fi
        sleep 2
    done
    
    # Try to create admin user (will fail if already exists, which is OK)
    local register_result=$(curl -s -X POST http://localhost:5000/api/auth/register \
        -H "Content-Type: application/json" \
        -d '{"email": "admin@example.com", "password": "admin123456", "name": "Admin User"}' 2>/dev/null)
    
    # Ensure user is approved and admin (update existing user)
    docker exec social_media-postgres-1 psql -U postgres -d socialmedia -c "
        UPDATE users SET status = 'approved', role = 'admin' 
        WHERE email = 'admin@example.com';
    " >/dev/null 2>&1
    
    echo "✅ Admin user ready"
}

# Function to test login
test_login() {
    echo "🧪 Testing login functionality..."
    
    local login_result=$(curl -s -X POST http://localhost:5000/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email": "admin@example.com", "password": "admin123456"}' 2>/dev/null)
    
    if echo "$login_result" | grep -q "token"; then
        echo "✅ Login test successful!"
        return 0
    else
        echo "❌ Login test failed: $login_result"
        return 1
    fi
}

# Main execution
echo "🚀 Starting database readiness check..."

# Check if postgres container is running
if ! docker ps | grep -q social_media-postgres-1; then
    echo "❌ PostgreSQL container not running. Start with: docker compose up -d"
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

# Check database state
if check_database; then
    echo "✅ Database is already properly configured"
else
    echo "🔧 Database needs setup"
    setup_database
fi

# Ensure backend is running
if ! docker ps | grep -q social_media-backend-1; then
    echo "🚀 Starting backend..."
    docker compose up -d backend
    sleep 10
fi

# Create/update admin user
create_admin_user

# Test login
if test_login; then
    echo ""
    echo "🎉 Database is ready and login is working!"
    echo "📧 Admin email: admin@example.com"
    echo "🔑 Admin password: admin123456"
    echo ""
    echo "🌐 Access the application:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:5000"
else
    echo ""
    echo "❌ Database setup completed but login test failed"
    echo "💡 Check backend logs: docker compose logs backend"
fi