#!/bin/bash

echo "🔧 Fixing Environment Configuration"
echo "=================================="

# Stop any running processes
echo "🛑 Stopping running processes..."
pkill -f "node.*3001" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true

sleep 2

# Update .env with working defaults
echo "📝 Updating .env file..."
cat > .env << 'EOF'
# Database Configuration (update with your actual database info)
DATABASE_URL=postgresql://postgres:password@localhost:5432/social_media_db

# Server Configuration
PORT=3001
NODE_ENV=development

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Social Media Platform APIs
X_CLIENT_ID=your-x-client-id
X_CLIENT_SECRET=your-x-client-secret

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000

# Nimble Streamer Configuration (optional for now)
NIMBLE_HOST=localhost
NIMBLE_PORT=1935
NIMBLE_STATS_PORT=8082
NIMBLE_CONFIG_PATH=/Users/hinduismnow/social_media/nimble/rules.conf
EOF

# Update client .env
echo "📝 Updating client .env file..."
cat > client/.env << 'EOF'
REACT_APP_API_URL=http://localhost:3001/api
EOF

echo "✅ Environment configuration updated!"
echo ""
echo "🎯 Next steps:"
echo "1. Update DATABASE_URL in .env with your actual PostgreSQL credentials"
echo "2. Make sure PostgreSQL is running"
echo "3. Run: npm start (for backend)"
echo "4. Run: cd client && npm start (for frontend)"
echo ""
echo "📋 If you don't have PostgreSQL set up:"
echo "   - Install: brew install postgresql"
echo "   - Start: brew services start postgresql"
echo "   - Create DB: createdb social_media_db"