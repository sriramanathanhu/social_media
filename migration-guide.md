# Database Migration Guide

This guide will help you migrate your social media app database from Render to your local server.

## Prerequisites

- Docker and Docker Compose installed
- `pg_dump` and `psql` client tools installed
- Network access to Render database

## Step 1: Backup Database from Render

```bash
# Run the backup script
./backup-render-db.sh
```

This will:
- Connect to your Render PostgreSQL database
- Create a full backup with timestamp
- Save to `./database_backups/` directory
- Show backup size and included tables

## Step 2: Restore Database Locally

```bash
# Start only PostgreSQL first
docker compose up -d postgres

# Wait for database to be ready, then restore
./restore-db.sh render_backup_YYYYMMDD_HHMMSS.sql
```

This will:
- Start PostgreSQL container if not running
- Drop existing database (if any)
- Create fresh database
- Restore all data from backup
- Verify restoration with data counts

## Step 3: Start Full Application

```bash
# Start all services
docker compose up -d

# Check logs
docker compose logs -f
```

## Step 4: Verify Migration

1. **Check Users**: Login with existing credentials
2. **Check Social Accounts**: Verify all connected platforms
3. **Check Posts**: Verify post history and scheduled posts
4. **Check Live Streams**: Verify streaming apps and configurations
5. **Check Admin Functions**: Verify admin panel access

## Database Connection Details

### Render Database (Source)
- **Host**: `dpg-d1k3qker433s73c3k8cg-a`
- **Database**: `socialmediadb_82lt`
- **User**: `socialmediadb_82lt_user`
- **Password**: `nPuC2nBBHB7oU0OhEqqX8E9hLIOz9zts`

### Local Database (Destination)
- **Host**: `localhost:5432`
- **Database**: `socialmedia`
- **User**: `postgres`
- **Password**: Set in `.env` file

## Data Verification Checklist

After migration, verify these tables contain your data:

- [ ] **users** - User accounts and admin credentials
- [ ] **social_accounts** - Connected social media accounts
- [ ] **posts** - Published and scheduled posts
- [ ] **api_credentials** - Platform API keys
- [ ] **account_groups** - Account groupings
- [ ] **live_streams** - Live stream configurations
- [ ] **stream_apps** - Streaming applications
- [ ] **stream_app_keys** - Stream keys
- [ ] **stream_sessions** - Stream session history
- [ ] **stream_republishing** - Multi-platform configurations

## Troubleshooting

### Connection Issues
```bash
# Test Render database connection
psql "postgresql://socialmediadb_82lt_user:nPuC2nBBHB7oU0OhEqqX8E9hLIOz9zts@dpg-d1k3qker433s73c3k8cg-a/socialmediadb_82lt" -c "SELECT COUNT(*) FROM users;"
```

### Local Database Issues
```bash
# Reset local database
docker compose down -v
docker compose up -d postgres
```

### View Backup Contents
```bash
# Check what's in backup file
head -50 ./database_backups/render_backup_*.sql
```

## Security Notes

- Backup files contain sensitive data - handle securely
- Change default passwords in `.env` file
- Update API keys and secrets for production
- Review user access and admin permissions

## Next Steps

1. Update `.env` with production values
2. Configure Caddy for SSL/domain
3. Set up monitoring and logging
4. Create regular backup schedule
5. Test all social media integrations