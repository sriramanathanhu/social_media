#!/bin/bash

# Database restore script for local PostgreSQL
# Usage: ./restore-db.sh <backup_file.sql>

set -e

if [ $# -eq 0 ]; then
    echo "❌ Usage: $0 <backup_file.sql>"
    echo "📁 Available backups:"
    ls -la ./database_backups/ 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"
BACKUP_DIR="./database_backups"

# Check if backup file exists
if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_DIR/$BACKUP_FILE"
    exit 1
fi

echo "🔄 Starting database restore from: $BACKUP_FILE"

# Local database connection details
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="socialmedia"
DB_USER="postgres"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Check if Docker containers are running
echo "🐳 Checking Docker containers..."
if ! docker compose ps postgres | grep -q "running"; then
    echo "🚀 Starting PostgreSQL container..."
    docker compose up -d postgres
    
    # Wait for database to be ready
    echo "⏳ Waiting for database to be ready..."
    sleep 10
    
    # Check if database is responsive
    until docker compose exec postgres pg_isready -h localhost -p 5432; do
        echo "⏳ Database not ready yet, waiting..."
        sleep 2
    done
fi

echo "📦 Restoring database from backup..."

# Set password for pg_restore
export PGPASSWORD="$DB_PASSWORD"

# Drop existing database if it exists and recreate
echo "🗑️  Dropping existing database (if exists)..."
docker compose exec postgres psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;"

echo "🆕 Creating fresh database..."
docker compose exec postgres psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"

# Restore the backup
echo "📥 Restoring backup data..."
docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restore completed successfully!"
    
    # Verify the restore
    echo ""
    echo "🔍 Verifying restored data..."
    
    # Count users
    USER_COUNT=$(docker compose exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
    echo "👥 Users: $USER_COUNT"
    
    # Count social accounts
    ACCOUNT_COUNT=$(docker compose exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM social_accounts;" 2>/dev/null | tr -d ' ' || echo "0")
    echo "🔗 Social Accounts: $ACCOUNT_COUNT"
    
    # Count posts
    POST_COUNT=$(docker compose exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM posts;" 2>/dev/null | tr -d ' ' || echo "0")
    echo "📝 Posts: $POST_COUNT"
    
    # Count live streams
    STREAM_COUNT=$(docker compose exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM live_streams;" 2>/dev/null | tr -d ' ' || echo "0")
    echo "🎥 Live Streams: $STREAM_COUNT"
    
    # Count stream apps
    APP_COUNT=$(docker compose exec postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM stream_apps;" 2>/dev/null | tr -d ' ' || echo "0")
    echo "📱 Stream Apps: $APP_COUNT"
    
    echo ""
    echo "🎉 Database migration completed! You can now start the full application:"
    echo "   docker compose up -d"
    
else
    echo "❌ Database restore failed!"
    exit 1
fi