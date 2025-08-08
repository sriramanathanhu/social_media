# Goal
Multi-platform social media management system with scheduling capabilities for X, Mastodon, Pinterest, Reddit, and live streaming via Nimble Streamer.

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
- **Platforms**: X (Twitter), Mastodon, Pinterest, Reddit
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

## Post-Restoration Database Sequence Fix (CRITICAL)
**ALWAYS run after any data restoration to prevent primary key violations:**
```sql
-- Fix all sequences after data restoration
SELECT setval('social_accounts_id_seq', COALESCE((SELECT MAX(id) FROM social_accounts), 1), true);
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);
SELECT setval('posts_id_seq', COALESCE((SELECT MAX(id) FROM posts), 1), true);
SELECT setval('api_credentials_id_seq', COALESCE((SELECT MAX(id) FROM api_credentials), 1), true);
SELECT setval('live_streams_id_seq', COALESCE((SELECT MAX(id) FROM live_streams), 1), true);
SELECT setval('stream_apps_id_seq', COALESCE((SELECT MAX(id) FROM stream_apps), 1), true);
SELECT setval('stream_app_keys_id_seq', COALESCE((SELECT MAX(id) FROM stream_app_keys), 1), true);
```

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

# Security Guidelines
**CRITICAL: Security best practices must be followed at all times**
- **Database Security**: 
  - NEVER use default database ports (5432) with standard usernames (postgres/admin)
  - NEVER use weak passwords like 'admin123', 'postgres', or dictionary words
  - ALWAYS use strong, randomly generated passwords (32+ characters, alphanumeric + symbols)
  - ALWAYS change default database users and create application-specific users with limited privileges
  - ALWAYS use non-standard ports for database services to reduce attack surface
- **Password Policy**:
  - NEVER create simple admin passwords in production
  - ALWAYS use secure password generation for all admin accounts
  - ENFORCE minimum password complexity: 16+ chars, mixed case, numbers, special chars
- **Network Security**:
  - NEVER expose databases directly on standard ports
  - ALWAYS use firewalls and restrict database access to application servers only
  - CONSIDER using VPN or private networks for sensitive database connections
- **Access Control**:
  - ALWAYS implement principle of least privilege
  - REGULARLY audit and rotate credentials
  - LOG all administrative access and database operations

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

## Reddit Integration Status
- ✅ Backend Reddit Service: OAuth 2.0 flow with token encryption, subreddit management, and posting
- ✅ Database Schema: Reddit subreddits table and account integration
- ✅ Reddit Controller: Account management and post submission endpoints
- ✅ Authentication Routes: Reddit OAuth connect and callback handlers
- ✅ Frontend Reddit Page: Dedicated page following WordPress pattern with WYSIWYG editor
- ✅ Redux Integration: Reddit actions and state management
- ✅ UI Components: Connect dialog and publish dialog with full Reddit features
- ✅ Navigation: Reddit tab added to main navigation menu
- ✅ TypeScript Support: Extended interfaces for Reddit platform
- ✅ OAuth Flow: Complete Reddit OAuth integration working end-to-end
- ✅ WYSIWYG Editor: Rich text editor with HTML to Markdown conversion for Reddit compatibility
- ✅ Database Schema Fix: Fixed missing api_credentials columns causing OAuth 500 errors (July 26, 2025)

### Reddit Publishing Features (July 26, 2025)
- ✅ **Dual Content Modes**: Rich text (WYSIWYG) and direct Markdown input options
- ✅ **Subreddit Visibility Fix**: Fixed NULL can_submit values preventing subreddits from showing in publish dialog
- ✅ **Content Submission Fix**: Resolved issue where only titles were posted (content was missing)
- ✅ **Markdown Editor**: Dedicated markdown text area with monospace font and syntax examples
- ✅ **Format Switching**: Radio buttons to switch between Rich Text and Markdown modes
- ✅ **Smart Validation**: Content validation adapts to selected input mode (HTML vs Markdown)
- ✅ **Character Counting**: Accurate character counts for both Rich Text and Markdown modes
- ✅ **Content Processing**: Proper handling of Rich Text → Markdown conversion and direct Markdown input

### Reddit Integration Troubleshooting Guide
**Common issues and solutions for Reddit OAuth integration:**

1. **"column 'status' does not exist" Error:**
   ```sql
   ALTER TABLE api_credentials ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
   ALTER TABLE api_credentials ADD COLUMN IF NOT EXISTS created_by INTEGER;
   ```

2. **"duplicate key value violates unique constraint" Error:**
   ```sql
   -- Fix sequence values after data restoration
   SELECT setval('social_accounts_id_seq', COALESCE((SELECT MAX(id) FROM social_accounts), 1), true);
   ```

3. **Missing Reddit-specific columns:**
   ```sql
   ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS reddit_karma INTEGER DEFAULT 0;
   ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS reddit_created_utc INTEGER;
   ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS reddit_is_gold BOOLEAN DEFAULT false;
   ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS platform_user_id VARCHAR(255);
   ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS platform_data JSONB DEFAULT '{}';
   ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
   ```

4. **Missing reddit_subreddits table columns:**
   ```sql
   ALTER TABLE reddit_subreddits ADD COLUMN IF NOT EXISTS flair_enabled BOOLEAN DEFAULT false;
   ALTER TABLE reddit_subreddits ADD COLUMN IF NOT EXISTS flair_list JSONB DEFAULT '[]';
   ALTER TABLE reddit_subreddits ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '[]';
   ALTER TABLE reddit_subreddits ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
   ALTER TABLE reddit_subreddits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
   ```

5. **"No subreddits available in publish dialog" Error:**
   ```sql
   -- Fix NULL can_submit values that prevent subreddits from showing in publish dialog
   UPDATE reddit_subreddits SET can_submit = true WHERE can_submit IS NULL;
   ```
   **Note**: This commonly occurs after data restoration when can_submit values become NULL

6. **"Reddit post content missing - only title posted" Error (RESOLVED July 26, 2025):**
   - **Root Cause**: WYSIWYG to Markdown conversion occasionally producing empty results when HTML contains complex formatting
   - **Comprehensive Solution Implemented**:
   
   **A. Content Validation and Fallback System:**
   ```typescript
   // Frontend content processing with validation and fallback
   if (contentMode === 'rich') {
     const rawHtml = content.trim();
     const convertedMarkdown = turndownService.turndown(rawHtml);
     const finalContent = convertedMarkdown.trim();
     
     // If conversion resulted in empty content, use plain text fallback
     if (!finalContent || finalContent.length === 0) {
       const tempDiv = document.createElement('div');
       tempDiv.innerHTML = rawHtml;
       const plainText = tempDiv.textContent || tempDiv.innerText || '';
       processedContent = plainText.trim();
       console.warn('Turndown conversion failed, using plain text fallback');
     } else {
       processedContent = finalContent;
     }
   }
   ```
   
   **B. Enhanced Debug Logging System:**
   - **Frontend**: Comprehensive logging of content processing stages
   - **Backend**: Detailed tracing of Reddit API submission data
   - **Debug Output**: Shows conversion details, validation results, and API parameters
   
   **C. Backend Parameter Handling:**
   ```javascript
   // Complete backend controller implementation
   const { accountId, subreddit, title, content, url, type: postType, nsfw, spoiler, flairId } = req.body;
   
   if (postType === 'link' && url) {
     postData.url = url;
   } else if (postType === 'text') {
     postData.text = content || '';
   }
   ```
   
   **D. Multi-Stage Validation:**
   - Pre-submission content validation
   - Post-conversion result verification
   - Plain text fallback for failed conversions
   - Enhanced error detection and recovery
   
   **Status**: Content submission now works reliably in both Rich Text and Markdown modes with automatic fallback handling

   **E. Reddit API Compliance Enhancement (July 26, 2025):**
   - **Modhash Support**: Added automatic modhash retrieval for Reddit API compliance
   - **Enhanced Error Handling**: Comprehensive Reddit API response validation
   - **Content Validation**: Multi-stage content validation in both frontend and backend
   - **Debug Logging**: Complete submission pipeline tracing for troubleshooting
   - **API Response Analysis**: Detailed logging of Reddit API responses and errors
   
   **F. Production-Ready Implementation:**
   ```javascript
   // Enhanced Reddit API submission with modhash
   const modhash = await this.getModhash(accessToken);
   if (modhash) {
     submitData.append('uh', modhash);
   }
   
   // Comprehensive content validation
   if (req.body.type === 'text' && (!req.body.content || req.body.content.trim().length === 0)) {
     return res.status(400).json({ error: 'Text posts require content' });
   }
   ```

**Post-fix checklist:**
- [ ] Restart backend container: `docker restart social_media-backend-1`
- [ ] Test Reddit connection from UI
- [ ] Verify no database errors in logs: `docker logs social_media-backend-1 --tail 20`

## Reddit Content Debug Instructions

**To debug Reddit content issues, follow these steps:**

1. **Open Browser Developer Tools:**
   - Navigate to your social media app at `http://localhost:3000`
   - Open Developer Tools (F12)
   - Go to Console tab

2. **Test Reddit Post Submission:**
   - Go to Reddit page and click Publish on your account
   - Fill in both title and content using the WYSIWYG editor
   - Check console for "Reddit submit debug" logs before clicking submit
   - Submit the post and check logs

3. **Check Backend Logs:**
   ```bash
   # Watch backend logs in real-time
   docker logs social_media-backend-1 -f
   
   # Or check recent logs
   docker logs social_media-backend-1 --tail 50 | grep -A 20 -B 5 "REDDIT.*DEBUG"
   ```

4. **Expected Log Output:**
   - Frontend: "Reddit submit debug" with content details
   - Backend: "REDDIT POST SUBMISSION DEBUG" with request body
   - Backend: "REDDIT API SUBMISSION DEBUG" with processed data
   - Backend: "Adding text content to Reddit API" with final content

5. **Common Issues Found in Logs:**
   - `textOnlyLength: 0` → WYSIWYG editor has only HTML tags
   - `contentLength: 0` → No content sent from frontend
   - `hasContent: false` → Backend not receiving content
   - `textPreview: "NO_TEXT"` → Content lost during processing

# Feature Rebuild Guide
**Essential checklist for rebuilding features after data loss/restoration:**

## 1. Post-Restoration Database Fixes (ALWAYS FIRST)
```bash
# Connect to database
docker exec social_media-postgres-1 psql -U postgres -d socialmedia

# Fix all sequences (prevents primary key violations)
SELECT setval('social_accounts_id_seq', COALESCE((SELECT MAX(id) FROM social_accounts), 1), true);
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);
SELECT setval('posts_id_seq', COALESCE((SELECT MAX(id) FROM posts), 1), true);
SELECT setval('api_credentials_id_seq', COALESCE((SELECT MAX(id) FROM api_credentials), 1), true);
SELECT setval('live_streams_id_seq', COALESCE((SELECT MAX(id) FROM live_streams), 1), true);
```

## 2. Reddit Integration Rebuild
**Files to check/restore:**
- `server/src/services/reddit.js` - Reddit API service
- `server/src/controllers/authController.js` - Reddit OAuth handlers
- `server/src/models/ApiCredentials.js` - API credentials model
- `client/src/pages/RedditPage.tsx` - Frontend Reddit page
- `client/src/components/ConnectRedditDialog.tsx` - Connection dialog

**Database schema requirements:**
```sql
-- api_credentials table
ALTER TABLE api_credentials ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE api_credentials ADD COLUMN IF NOT EXISTS created_by INTEGER;

-- social_accounts Reddit columns
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS reddit_karma INTEGER DEFAULT 0;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS reddit_created_utc INTEGER;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS reddit_is_gold BOOLEAN DEFAULT false;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS platform_user_id VARCHAR(255);
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS platform_data JSONB DEFAULT '{}';
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- reddit_subreddits table
ALTER TABLE reddit_subreddits ADD COLUMN IF NOT EXISTS flair_enabled BOOLEAN DEFAULT false;
ALTER TABLE reddit_subreddits ADD COLUMN IF NOT EXISTS flair_list JSONB DEFAULT '[]';
ALTER TABLE reddit_subreddits ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '[]';
ALTER TABLE reddit_subreddits ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE reddit_subreddits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

## 3. WordPress Integration Rebuild
**Required columns after restoration:**
```sql
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS site_url VARCHAR(255);
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS app_password TEXT;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS site_title VARCHAR(255);
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS api_version VARCHAR(10) DEFAULT 'v2';
```

## 4. General Integration Pattern
**For any platform integration (X, Pinterest, Mastodon, etc.):**

1. **Check backend service file exists:** `server/src/services/[platform].js`
2. **Verify controller integration:** Check `authController.js` has platform handlers
3. **Frontend components:** Ensure platform page and dialogs exist
4. **Database schema:** Add platform-specific columns as needed
5. **Environment variables:** Verify API keys are configured
6. **Test integration:** Always test OAuth flow end-to-end

## 5. Live Streaming Rebuild
**Critical components:**
- Nimble Streamer configuration (37.27.201.26:1935)
- Stream apps and keys restoration
- Frontend live streaming UI
- RTMP endpoint configuration

**Database tables to restore:**
- `live_streams`
- `stream_apps` 
- `stream_app_keys`

## 6. Post-Rebuild Verification
```bash
# Restart all containers
docker restart social_media-backend-1 social_media-frontend-1

# Check logs for errors
docker logs social_media-backend-1 --tail 50

# Test all platform connections from UI
# Verify data persistence after container restarts
```

## Complete Data Restoration Status (July 25, 2025)
**✅ ALL BUSINESS-CRITICAL DATA SUCCESSFULLY RESTORED FROM BACKUP**

### Core Platform Data
- ✅ **Users (6 accounts)**: All admin and user accounts restored with original credentials
- ✅ **Social Media Accounts (11 platforms)**: 
  - Mastodon (3): SriNithyanandaTamil, SriNithyananda, nithyanandayoga
  - X/Twitter (2): kailasanation, NithyanandaAi
  - Pinterest (1): ramanathaananda  
  - Bluesky (2): nithyanandayoga.bsky.social, sphnithyananda.bsky.social
  - WordPress (2): unitedancientnations.org, usktanzania.org
- ✅ **Posts (5 content items)**: Published and failed posts with complete metadata restored

### WordPress Integration
- ✅ **WordPress Sites (2 connected)**:
  - "United Ancient Nations" - https://unitedancientnations.org/
  - "Sovereign Order of KAILASA Nithyananda" - https://usktanzania.org/
- ✅ **WordPress Categories (14)**: Diplomatic Mission, Featured News, Ghana, Kenya, Tanzania, etc.
- ✅ **WordPress Tags (14)**: africa, Kailasa, Nithyananda, NGO, Service, etc.
- ✅ **WordPress Management**: Full publish, sync, and admin functionality restored

### Live Streaming Infrastructure  
- ✅ **Stream Apps (2)**: "Social Media Public Stream", "socialmedia"
- ✅ **Stream Keys (3)**: YouTube keys and primary stream configurations
- ✅ **Live Streams (2)**: "RMN" and "RMN Test 2" with RTMP configurations
- ✅ **Nimble Streamer Integration**: 37.27.201.26:1935 RTMP working

### Platform Status
- ✅ **User Access**: Primary admin account `sri.ramanatha@uskfoundation.or.ke` fully functional
- ✅ **All Features Working**: Account management, posting, WordPress publishing, live streaming
- ✅ **Reddit Integration**: Available for new connections (not in backup - feature added later)
- 🔒 **Ransomware Recovery**: Data recovered from automated backup after ransomware attack

### Final Verification Completed
- ✅ **WordPress Sites**: Both sites visible and functional in /wordpress page
- ✅ **Social Accounts**: All 11 accounts visible in /accounts page  
- ✅ **Posts**: All 5 posts visible in /posts page
- ✅ **Live Streaming**: Infrastructure restored in database
- ✅ **Reddit**: Ready for new connections (clean slate as expected)

### Reddit Integration Activation Steps
To activate Reddit integration (server restart required):

1. **Stop Current Server Process:**
   ```bash
   # Find the server process
   ps aux | grep "node server"
   # Kill the process (replace PID with actual process ID)
   kill <PID>
   ```

2. **Start Server with Reddit Support:**
   ```bash
   cd /root/social_media
   npm start
   # OR for development
   npm run dev
   ```

3. **Verify Reddit Endpoints:**
   ```bash
   curl http://localhost:5000/
   # Should show /api/reddit in endpoints list
   ```

4. **Access Reddit Features:**
   - Navigate to `/#/reddit` in browser
   - Clear browser cache if needed (Ctrl+F5)
   - Reddit tab should be visible in navigation menu

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.