# Getting Started with Social Media Management Platform

## Quick Start Guide

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL
- Redis
- Git

### 1. Clone and Setup

```bash
cd /root/social_media
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Environment Setup

Create environment files:

```bash
# Root .env
cp .env.example .env

# Client .env
cp client/.env.example client/.env.local

# Server .env  
cp server/.env.example server/.env
```

### 3. Start Services

```bash
# Start with Docker Compose (recommended)
docker-compose up -d

# Or manually:
# Terminal 1 - Database & Redis
docker run -d --name postgres -p 5432:5432 -e POSTGRES_DB=social_media -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password postgres:15
docker run -d --name redis -p 6379:6379 redis:7

# Terminal 2 - Backend
cd server && npm run dev

# Terminal 3 - Frontend
cd client && npm run dev
```

### 4. Access the Application

- **Frontend UI**: http://localhost:3000
- **API Gateway**: http://localhost:3000/api
- **Server API**: http://localhost:5000/api

### 5. Test Login Credentials

Use these pre-seeded accounts:

**Admin User:**
- Email: `admin@socialmedia.com`
- Password: `Admin123!`

**Regular User:**
- Email: `user@example.com`  
- Password: `User123!`

**Test Organization:**
- Name: `Demo Organization`
- Slug: `demo-org`

## Feature Testing Guide

### 🔐 Authentication Flow
1. Go to http://localhost:3000/login
2. Use test credentials above
3. Test features:
   - Registration: http://localhost:3000/register
   - Password reset: Click "Forgot Password"
   - MFA setup: Profile → Security → Enable 2FA

### 📱 Social Media Integration
1. Login and go to **Integrations** page
2. Connect platforms (uses sandbox/test APIs):
   - Twitter: Test OAuth flow
   - Facebook: Connect business account
   - Instagram: Link business profile
3. Test connection status and permissions

### ✍️ Content Creation & Publishing
1. Go to **Create Post** page
2. Test features:
   - Write content with hashtags #test @mentions
   - Upload images/videos (drag & drop)
   - Select multiple platforms
   - Schedule for later
   - Save as draft
   - Publish immediately

### 📅 Content Calendar
1. Navigate to **Calendar** view
2. Test features:
   - Month/Week/Day views
   - Drag & drop scheduling
   - Bulk operations
   - Conflict detection
   - Recurring posts

### 📊 Analytics Dashboard
1. Go to **Analytics** section
2. View metrics:
   - Post performance
   - Engagement rates
   - Platform comparisons
   - Audience demographics
   - Export reports (PDF/CSV)

### 🎥 Live Streaming (Advanced)
1. Go to **Streaming** section
2. Test features:
   - Create stream with OBS
   - Multi-platform broadcasting
   - Real-time viewer count
   - Stream recording
   - Chat moderation

## API Testing

### Direct API Testing
```bash
# Get API health
curl http://localhost:5000/api/health

# Login and get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"User123!"}'

# Use token for authenticated requests
export TOKEN="your_jwt_token_here"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/posts
```

### Using Postman/Insomnia
Import the API collection: `/docs/api-collection.json`

## Database Access

### View Data
```bash
# Connect to PostgreSQL
docker exec -it postgres psql -U postgres -d social_media

# View tables
\dt

# Check users
SELECT * FROM "User" LIMIT 5;

# Check posts  
SELECT * FROM "Post" LIMIT 5;
```

### Seed Test Data
```bash
cd server
npm run seed
```

## Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Check what's using ports
lsof -i :3000
lsof -i :5000
lsof -i :5432

# Kill processes if needed
kill -9 <PID>
```

**Database connection:**
```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
cd server && npx prisma migrate deploy
npm run seed
```

**Missing dependencies:**
```bash
# Clean install
rm -rf node_modules client/node_modules server/node_modules
npm install
cd client && npm install
cd ../server && npm install
```

### Development Tools

**Database GUI:**
- Prisma Studio: `npx prisma studio` (http://localhost:5555)
- pgAdmin: Access at http://localhost:8080

**API Documentation:**
- Swagger UI: http://localhost:5000/api/docs
- Postman Collection: Import from `/docs/`

**Logs & Monitoring:**
- Application logs: `docker-compose logs -f`
- Redis GUI: RedisInsight at http://localhost:8001

## Next Steps

1. **Customize Branding**: Edit `/client/src/theme/` files
2. **Add Platforms**: Extend `/server/src/integrations/`
3. **Custom Features**: Add new modules to `/server/src/modules/`
4. **Deploy**: Use provided Docker configs for production

## Support

- 📖 **Documentation**: `/docs/README.md`
- 🐛 **Issues**: Check `/TROUBLESHOOTING.md`  
- 💬 **Community**: Join our Discord
- 📧 **Support**: support@socialmedia.com

Happy testing! 🚀