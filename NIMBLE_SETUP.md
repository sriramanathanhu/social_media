# 🎥 Nimble Streamer Integration Setup Guide

This guide will help you set up the complete live streaming system with Nimble Streamer integration.

## 📋 Prerequisites

### 1. System Requirements
- **Node.js** 18+ and npm
- **PostgreSQL** 12+
- **Nimble Streamer** (free installation)
- **OBS Studio** (for streaming)

### 2. Nimble Streamer Installation

#### Ubuntu/Debian:
```bash
# Add Nimble repository
wget -O - http://nimblestreamer.com/gpg.key | sudo apt-key add -
echo "deb http://nimblestreamer.com/ubuntu focal/" | sudo tee /etc/apt/sources.list.d/nimble.list

# Install Nimble Streamer
sudo apt update
sudo apt install nimble nimble-server
```

#### CentOS/RHEL:
```bash
# Add repository
sudo rpm --import http://nimblestreamer.com/gpg.key
sudo yum-config-manager --add-repo http://nimblestreamer.com/centos/nimble.repo

# Install
sudo yum install nimble nimble-server
```

#### macOS:
```bash
# Using Homebrew
brew tap softvelum/nimble
brew install nimble-streamer
```

### 3. Start Nimble Streamer
```bash
# Ubuntu/Debian/CentOS
sudo systemctl start nimble
sudo systemctl enable nimble

# macOS
brew services start nimble-streamer
```

## ⚙️ Configuration

### 1. Environment Variables

Create or update your `.env` file:

```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

Required Nimble configuration in `.env`:
```env
# Nimble Streamer Configuration
NIMBLE_HOST=localhost
NIMBLE_PORT=1935
NIMBLE_STATS_PORT=8082
NIMBLE_CONFIG_PATH=/etc/nimble/rules.conf

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/social_media_db

# Other required variables...
```

### 2. Database Setup

```bash
# Create database
createdb social_media_db

# Run migrations
cd server
npm run migrate
```

### 3. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

## 🚀 Running the System

### 1. Start the Backend Server
```bash
cd server
npm run dev
```

### 2. Start the Frontend
```bash
cd client
npm start
```

### 3. Verify Nimble Integration
```bash
# Run integration test
cd /Users/hinduismnow/social_media
node test-nimble-integration.js
```

## 🎬 Testing the Complete Workflow

### 1. Create a Stream

1. Open the application at `http://localhost:3000`
2. Navigate to **Live Streaming**
3. Click **"Create Stream"**
4. Fill in stream details:
   - **Title**: Test Stream
   - **Category**: Technology
   - **Source Type**: RTMP Push (OBS)
5. Add republishing destinations:
   - **YouTube**: Add your YouTube stream key
   - **Twitch**: Add your Twitch stream key
   - **Facebook**: Add your Facebook stream key
6. Click **"Create Stream"**

### 2. Get OBS Settings

1. Find your created stream in the list
2. Click **"OBS Setup"** button
3. Copy the **Server URL** and **Stream Key**

### 3. Configure OBS Studio

1. Open **OBS Studio**
2. Go to **Settings** → **Stream**
3. Select **Service**: Custom...
4. **Server**: Paste the server URL from step 2
5. **Stream Key**: Paste the stream key from step 2
6. Click **OK**

### 4. Start Streaming

1. In OBS, click **"Start Streaming"**
2. In the web app, monitor the **Settings** tab for Nimble status
3. Your stream should automatically republish to configured platforms

### 5. Monitor Stream Health

- Check the **Active Sessions** tab for real-time stats
- Monitor **Nimble Status** in the Settings tab
- View republishing status for each destination

## 🔧 Troubleshooting

### Common Issues

#### 1. Nimble Streamer Not Running
```bash
# Check status
sudo systemctl status nimble

# View logs
sudo journalctl -u nimble -f

# Restart if needed
sudo systemctl restart nimble
```

#### 2. Permission Issues with Config File
```bash
# Fix permissions
sudo chown nimble:nimble /etc/nimble/rules.conf
sudo chmod 644 /etc/nimble/rules.conf
```

#### 3. Port Conflicts
- Default RTMP port: 1935
- Default stats port: 8082
- Check if ports are available: `netstat -tulpn | grep :1935`

#### 4. Database Connection Issues
```bash
# Test database connection
psql -h localhost -p 5432 -U username social_media_db
```

### Debug Mode

Enable debug logging in `.env`:
```env
NODE_ENV=development
DEBUG=nimble:*
```

### Integration Test Failures

Run the test script to diagnose issues:
```bash
node test-nimble-integration.js
```

Check the generated report: `nimble-integration-test-report.json`

## 📊 Architecture Overview

```
┌─────────────┐    RTMP     ┌─────────────────┐    Multi-RTMP    ┌──────────────┐
│ OBS Studio  │ ────────── ▶ │ Nimble Streamer │ ──────────────▶ │ Platforms    │
│             │             │                 │                 │ • YouTube    │
└─────────────┘             └─────────────────┘                 │ • Twitch     │
                                     │                          │ • Facebook   │
                                     │ Stats API                │ • Twitter    │
                                     ▼                          └──────────────┘
                            ┌─────────────────┐
                            │ Node.js Backend │
                            │ • NimbleController
                            │ • NimbleMonitor
                            │ • LiveStreamingService
                            └─────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ React Frontend  │
                            │ • Stream Management
                            │ • RTMP Setup Guide
                            │ • Real-time Monitoring
                            └─────────────────┘
```

## 🎯 Key Features

### ✅ What's Working
- **Stream Creation**: Full UI for creating streams with republishing
- **RTMP Configuration**: Automatic OBS setup instructions
- **Multi-Platform**: Simultaneous streaming to multiple platforms
- **Real-time Monitoring**: Live stats and stream health monitoring
- **Auto-posting**: Social media announcements when going live
- **Platform Integration**: YouTube, Twitch, Facebook, Twitter support

### 🔄 Stream Workflow
1. User creates stream via React UI
2. Backend generates unique RTMP URL and stream key
3. Nimble configuration is automatically updated
4. User configures OBS with provided settings
5. OBS streams to Nimble Streamer
6. Nimble republishes to all configured platforms
7. Real-time monitoring tracks stream health
8. Auto-posting announces stream on social media

## 🚨 Security Notes

1. **Stream Keys**: Keep stream keys private and secure
2. **Firewall**: Ensure RTMP port (1935) is properly configured
3. **Authentication**: All API endpoints require authentication
4. **HTTPS**: Use HTTPS in production
5. **Database**: Secure database with proper credentials

## 📞 Support

If you encounter issues:

1. Check the integration test output
2. Review Nimble Streamer logs
3. Verify all environment variables
4. Ensure all services are running
5. Check network connectivity and firewall settings

## 🎉 Ready to Stream!

Once everything is set up:
- Create your first stream
- Configure OBS with the provided RTMP settings
- Start streaming and watch it republish to all your platforms
- Monitor real-time stats and engagement
- Enjoy professional multi-platform streaming! 🚀