# Database Persistence Issue - Root Cause & Solution

## 🔍 **Root Cause Analysis**

The persistent login failures after feature changes are caused by **database initialization/persistence issues**:

### **Primary Issues:**
1. **Database Volume Loss**: Docker volumes sometimes don't persist properly between container restarts
2. **Migration Timing**: PostgreSQL init scripts in `/docker-entrypoint-initdb.d` only run on first container creation
3. **Schema Mismatches**: Code expects newer schema fields (like `status` column) that weren't in original migrations
4. **Password Hash Issues**: Manual password hashes in scripts don't match actual passwords

### **Why It Happens After Feature Work:**
- ✅ Feature development often requires container restarts
- ✅ Database schema changes aren't always reflected in migration files
- ✅ Docker volume corruption or cleanup removes data
- ✅ Migration scripts aren't updated to match current code expectations

## 🛠️ **Complete Solution**

### **1. Updated Migration Files**
- ✅ **Fixed** `/server/migrations/001_init_database.sql` to include:
  - `status` column in users table
  - Updated `social_accounts` schema
  - `oauth_states` table for OAuth flows
  - `api_credentials` table for platform credentials

### **2. Database Persistence Script**
- ✅ **Created** `fix_database_persistence.sh` that:
  - Completely recreates database volume
  - Ensures proper initialization
  - Applies all migrations in correct order
  - Creates admin user via API (proper password hashing)
  - Tests login functionality

### **3. Robust Error Handling**
- ✅ **Backend now handles** missing database gracefully
- ✅ **Migration checks** ensure all required tables exist
- ✅ **Health checks** verify database connectivity

## 🚀 **Usage Instructions**

### **When Login Fails:**
```bash
# Run the fix script
./fix_database_persistence.sh

# This will:
# 1. Stop all containers
# 2. Remove old database volume
# 3. Start fresh with proper initialization
# 4. Create admin@example.com / admin123456
# 5. Test login functionality
```

### **Manual Recovery (if script fails):**
```bash
# 1. Recreate database
docker compose down
docker volume rm social_media_postgres_data
docker compose up -d postgres

# 2. Wait for postgres ready
docker exec social_media-postgres-1 pg_isready -U postgres

# 3. Apply migrations
docker exec -i social_media-postgres-1 psql -U postgres -d socialmedia < server/migrations/001_init_database.sql

# 4. Start all services
docker compose up -d

# 5. Create user via API
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "password123", "name": "Admin"}'

# 6. Promote to admin
docker exec social_media-postgres-1 psql -U postgres -d socialmedia -c \
  "UPDATE users SET status = 'approved', role = 'admin' WHERE email = 'admin@test.com';"
```

## 📋 **Default Credentials After Fix**

- **Email**: `admin@example.com`
- **Password**: `admin123456`
- **Role**: Admin
- **Status**: Approved

## 🔄 **Prevention Strategy**

### **For Future Development:**
1. **Always update migration files** when changing database schema
2. **Test with fresh database** after major changes
3. **Use the fix script** instead of manual database recreation
4. **Keep backup of working database** for quick restoration

### **Database Health Checks:**
```bash
# Check if database exists and has data
docker exec social_media-postgres-1 psql -U postgres -d socialmedia -c "SELECT COUNT(*) FROM users;"

# Check if login works
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123456"}'
```

## ✅ **Current Status**

- ✅ **Database schema**: Updated and complete
- ✅ **Migration files**: Fixed and comprehensive  
- ✅ **Persistence script**: Tested and working
- ✅ **Login functionality**: Restored and stable
- ✅ **Admin access**: Available with known credentials

This fix should **permanently resolve** the recurring login issues after feature development! 🎉