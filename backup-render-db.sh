#!/bin/bash

# Database backup script for Render PostgreSQL
# Run this script to backup your database from Render

set -e

echo "🔄 Starting database backup from Render..."

# Database connection details from CLAUDE.md
DB_URL="postgresql://socialmediadb_82lt_user:nPuC2nBBHB7oU0OhEqqX8E9hLIOz9zts@dpg-d1k3qker433s73c3k8cg-a.oregon-postgres.render.com/socialmediadb_82lt"
BACKUP_FILE="render_backup_$(date +%Y%m%d_%H%M%S).sql"
BACKUP_DIR="./database_backups"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup file: $BACKUP_DIR/$BACKUP_FILE"

# Create full database backup
pg_dump "$DB_URL" > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database backup completed successfully!"
    echo "📁 Backup saved to: $BACKUP_DIR/$BACKUP_FILE"
    echo "📊 Backup size: $(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)"
    
    # List all tables in the backup
    echo ""
    echo "🔍 Tables included in backup:"
    grep -E "^CREATE TABLE" "$BACKUP_DIR/$BACKUP_FILE" | sed 's/CREATE TABLE /- /' | sed 's/ (.*//g' || echo "Unable to list tables"
    
    echo ""
    echo "🚀 To restore this backup to your local database:"
    echo "   1. Start your local PostgreSQL: docker compose up -d postgres"
    echo "   2. Run restore script: ./restore-db.sh $BACKUP_FILE"
else
    echo "❌ Database backup failed!"
    exit 1
fi