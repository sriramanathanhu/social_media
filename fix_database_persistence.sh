#!/bin/bash

echo "🔧 Fixing database persistence issues..."

# Stop containers to ensure clean state
echo "📦 Stopping containers..."
docker compose down

# Remove the database volume to start fresh with proper initialization
echo "🗑️  Removing old database volume..."
docker volume rm social_media_postgres_data 2>/dev/null || echo "Volume doesn't exist, continuing..."

# Start only postgres to let it initialize properly
echo "🐘 Starting PostgreSQL with fresh initialization..."
docker compose up -d postgres

# Wait for postgres to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec social_media-postgres-1 pg_isready -U postgres >/dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start"
        exit 1
    fi
    sleep 2
done

# Check if database was created by init script
echo "🔍 Checking database initialization..."
DB_EXISTS=$(docker exec social_media-postgres-1 psql -U postgres -lqt | cut -d \| -f 1 | grep -w socialmedia | wc -l)

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "📝 Database not found, creating manually..."
    docker exec social_media-postgres-1 psql -U postgres -c "CREATE DATABASE socialmedia;"
    
    # Apply migrations manually
    echo "🔄 Applying migrations..."
    docker exec -i social_media-postgres-1 psql -U postgres -d socialmedia < /root/social_media/server/migrations/001_init_database.sql
    docker exec -i social_media-postgres-1 psql -U postgres -d socialmedia < /root/social_media/server/migrations/008_create_stream_apps.sql
    docker exec -i social_media-postgres-1 psql -U postgres -d socialmedia < /root/social_media/server/migrations/009_create_live_streams.sql
else
    echo "✅ Database exists and was properly initialized"
fi

# Wait for backend to start
echo "⏳ Waiting for backend to be ready..."
sleep 10

# Create default admin user via API (this ensures proper password hashing)
echo "👤 Creating default admin user..."
REGISTER_RESULT=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123456", "name": "Admin User"}')

echo "Registration result: $REGISTER_RESULT"

# Approve and promote the user
docker exec social_media-postgres-1 psql -U postgres -d socialmedia -c "
UPDATE users SET status = 'approved', role = 'admin' WHERE email = 'admin@example.com';
"

# Start all other services
echo "🚀 Starting all services..."
docker compose up -d

# Test the database connection
echo "🧪 Testing database connection..."
sleep 5
TEST_RESULT=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123456"}' | grep -o token | head -1)

if [ "$TEST_RESULT" = "token" ]; then
    echo "✅ Database persistence fix successful! Login is working."
    echo "📧 Default admin: admin@example.com"
    echo "🔑 Default password: admin123456"
else
    echo "❌ Login test failed. Check logs with: docker compose logs backend"
fi

echo "🏁 Database persistence fix completed!"