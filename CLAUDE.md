# Goal
Multi-platform social media management system with scheduling capabilities for X, Mastodon, Pinterest, and live streaming via Nimble Streamer.

# Standard instructions for AI 
This section maintains essential context of the project state across different chats and compactions. We maintain:
- Current active instructions
- History of implemented instructions  
- Key contextual information (bugs fixed/found, features implemented, common pitfalls, task progress)
- Current project state and direction

## Context Files
- [Current Active Instructions](current-active-instructions.md)
- [Implemented Instructions](implemented-instructions.md)
- [Common Pitfalls](common-pitfalls-to-watch-out.md)
- [Vision](vision.md)

# Project Structure
- **Frontend**: React/TypeScript with Material-UI, Redux Toolkit
- **Backend**: Node.js/Express with PostgreSQL
- **Platforms**: X (Twitter), Mastodon, Pinterest
- **Live Streaming**: Nimble Streamer integration with multi-platform republishing
- **Authentication**: OAuth 2.0 flows for each platform

# Testing Commands
- Frontend: `cd client && npm test`
- Backend: `cd server && npm test`
- Linting: `cd client && npm run lint` and `cd server && npm run lint`

# Database Management Guidelines
**CRITICAL: All database changes must be incremental and preserve existing data**
- **Schema Changes**: Use ALTER TABLE statements, never DROP/CREATE
- **Data Migration**: Always backup before modifications
- **Column Additions**: Use ALTER TABLE ADD COLUMN with DEFAULT values
- **Index Changes**: CREATE INDEX IF NOT EXISTS, DROP INDEX IF EXISTS
- **Constraint Changes**: Add constraints with NOT VALID, then validate separately
- **Production Safety**: Test all migrations on development data first
- **Rollback Plan**: Ensure every migration has a rollback script
- **Zero Downtime**: Structure changes to avoid application downtime

# Docker Volume Management
**CRITICAL: Never delete Docker volumes - data persistence is essential**
- **Volume Protection**: NEVER run `docker volume rm` or `docker volume prune`
- **Data Persistence**: All data must survive `docker compose down` and restarts
- **Manual Management**: Only the user will manually manage volume deletion
- **Container Recreation**: Ensure all services can restart without data loss
- **Volume Verification**: Always verify named volumes are properly configured for persistence

## Current Volume Configuration
- **postgres_data**: Named volume for PostgreSQL database persistence
- **server/uploads**: Host mount for uploaded files persistence
- **All data survives**: `docker compose down` and container recreation

# Render SSH Access
- SSH Connection: `ssh srv-d1k35rndiees73e10vsg@ssh.oregon.render.com`
- Server Process: Node.js running on PID 128, port 10000
- Database: `psql postgresql://socialmediadb_82lt_user:nPuC2nBBHB7oU0OhEqqX8E9hLIOz9zts@dpg-d1k3qker433s73c3k8cg-a/socialmediadb_82lt`
- Project Path: `/opt/render/project/src`

# Live Streaming Configuration (Nimble Streamer)
- **Cloud Server**: 37.27.201.26:1935 (RTMP)
- **Management API**: 37.27.201.26:8082 (Authenticated with salt-hash method)
- **WMSPanel UUID**: 5f7ca354-fc54-83da-a4ae-b1ebf0980f9e
- **Status**: RTMP working, Management API fully operational
- **Authentication**: Token-based with MD5 salt-hash authentication
- **Frontend**: Live streaming UI functional at /live route

# Current Status
- ✅ Nimble Streamer: Configured and accepting RTMP streams
- ✅ OBS Integration: Working with app-based stream keys  
- ✅ Frontend API: Fixed token handling and stream creation
- ✅ App Management System: Independent streaming apps with custom RTMP paths
- ✅ Stream Key Management: Multiple platform keys per app
- ✅ Stream Creation V2: App/key pair selection with 3-step wizard
- ✅ Stream Settings: Comprehensive dialog with deletion functionality
- ✅ Multi-destination Streaming: One OBS instance to multiple platforms
- ✅ Direct Nimble API Integration: Self-contained republishing without WMSPanel dependency
- ✅ Real-time Republishing Control: Add/remove destinations via API
- ✅ Production Ready: End-to-end streaming from OBS to YouTube working
- ✅ Secure API Access: Salt-hash authentication implemented and tested

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.