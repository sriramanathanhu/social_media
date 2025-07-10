# 🎬 Live Streaming UI Test Guide

## 🎯 **What's New in Your UI**

Your social media scheduler now has integrated live streaming capabilities! Here's what's been added:

### **Navigation Changes**
- **Live Streaming** section added to your main navigation
- Access via: `http://localhost:3000/live`

### **New UI Features**

1. **Live Streaming Dashboard**
   - Stream creation and management
   - Active session monitoring  
   - Real-time analytics
   - Nimble server status

2. **Professional Stream Setup**
   - "OBS Setup" button on each stream
   - Copy-paste RTMP configuration
   - Security-focused stream key management

3. **Multi-Platform Integration**
   - YouTube, Twitch, Facebook, Twitter, LinkedIn
   - Auto-posting when going live
   - Uses your existing social accounts

## 🚀 **Testing the UI (Without Nimble)**

### **Step 1: Start Your Application**

```bash
# Terminal 1: Start Backend
cd server
npm run dev

# Terminal 2: Start Frontend  
cd client
npm start
```

### **Step 2: Test Live Streaming UI**

1. **Open Application**: `http://localhost:3000`

2. **Navigate to Live Streaming**:
   - Click "Live Streaming" in the navigation menu
   - You should see a new dashboard with tabs:
     - My Streams
     - Active Sessions
     - Analytics
     - Settings

3. **Create a Test Stream**:
   - Click "Create Stream" button
   - Fill in:
     - **Title**: "Test Live Stream"
     - **Description**: "Testing new live streaming feature"
     - **Category**: "Technology"
   - Add republishing targets:
     - **YouTube**: Enter any test stream key
     - **Twitch**: Enter any test stream key
   - Click "Create Stream"

4. **Test OBS Setup**:
   - Find your created stream in the list
   - Click "OBS Setup" button
   - You should see:
     - Server URL: `rtmp://localhost:1935/live`
     - Stream Key: (generated unique key)
     - Copy buttons for each field
     - Complete OBS instructions

5. **Test Settings Tab**:
   - Click "Settings" tab
   - View Nimble Status component
   - See server configuration info

## 🎥 **Manual Nimble Streamer Installation**

Since Homebrew tap isn't available, here's manual installation:

### **Option 1: Docker (Recommended)**

```bash
# Create Nimble container
docker run -d \
  --name nimble-streamer \
  -p 1935:1935 \
  -p 8081:8081 \
  -v $(pwd)/nimble:/etc/nimble \
  wmspanel/nimble-streamer

# Check if running
docker ps | grep nimble
```

### **Option 2: Direct Download (macOS)**

```bash
# Download Nimble Streamer for macOS
curl -O https://nimblestreamer.com/downloads/nimble_darwin.pkg

# Install the package
sudo installer -pkg nimble_darwin.pkg -target /

# Start Nimble
sudo /usr/local/bin/nimble start
```

### **Option 3: Mock Streaming Server**

For testing UI without Nimble, I can create a mock server:

```bash
# Run the simple test server
node simple-server.js
```

This will simulate Nimble responses for UI testing.

## 🧪 **End-to-End Testing Workflow**

### **With Nimble Installed:**

1. **Start Services**:
   ```bash
   # Start Nimble Streamer
   brew services start nimble-streamer  # or docker/manual method
   
   # Start your app
   cd server && npm run dev
   cd client && npm start
   ```

2. **Create Stream via UI**:
   - Go to `http://localhost:3000/live`
   - Create new stream with republishing destinations
   - Copy RTMP settings from "OBS Setup"

3. **Configure OBS Studio**:
   - Download OBS: https://obsproject.com/
   - Settings → Stream
   - Service: Custom...
   - Server: `rtmp://localhost:1935/live`
   - Stream Key: (from UI)

4. **Test Live Streaming**:
   - Click "Start Streaming" in OBS
   - Monitor stream in UI Settings tab
   - Check if auto-posting works (if social accounts connected)

## 🔧 **Troubleshooting UI Issues**

### **Live Streaming Page Not Loading**
```bash
# Check if route is registered
curl http://localhost:3001/api/live -H "Authorization: Bearer YOUR_TOKEN"
```

### **OBS Setup Button Not Working**
- Check browser console for errors
- Verify API endpoint: `/api/live/:id/rtmp-info`

### **Nimble Status Shows Error**
- Expected if Nimble isn't running
- UI will show "Inactive" status

### **Create Stream Fails**
- Check database connection
- Verify all required fields are filled

## 🎯 **UI Features Checklist**

Test these new UI features:

- [ ] Live Streaming navigation item appears
- [ ] Stream creation dialog works
- [ ] "OBS Setup" button opens RTMP info dialog
- [ ] Stream key can be copied to clipboard
- [ ] Settings tab shows Nimble status
- [ ] Multi-platform republishing setup works
- [ ] Auto-posting integration appears in stream creation

## 📱 **Screenshots of New UI**

### **Live Streaming Dashboard**
- Stream cards with status indicators
- "Create Stream" and "OBS Setup" buttons
- Tabbed interface (My Streams, Active Sessions, Analytics, Settings)

### **OBS Setup Dialog**
- Professional RTMP configuration
- Copy-to-clipboard functionality
- Security features (show/hide stream key)
- Complete setup instructions

### **Stream Creation**
- Multi-platform republishing options
- Social media auto-posting integration
- Quality settings configuration

## 🎉 **What This Adds to Your Platform**

Your social media scheduler is now a **complete social media management platform**:

- ✅ **Scheduled Posts** (existing)
- ✅ **Live Streaming** (new)
- ✅ **Multi-Platform Distribution** (both)
- ✅ **Unified Account Management** (shared)
- ✅ **Professional Workflow** (enhanced)

Users can now:
1. Schedule posts for later
2. Go live with multi-platform streaming
3. Auto-announce live streams via scheduled posts
4. Monitor everything from one dashboard

This makes your platform competitive with tools like Hootsuite, Buffer, and StreamLabs combined! 🚀