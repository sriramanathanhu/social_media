# Stream Destination Setup Fixes

## Issues Fixed

### 1. ✅ Facebook RTMPS Connection Issue
**Problem**: Facebook Live streams were not working despite YouTube working fine.

**Root Cause**: The Nimble API service was missing the `rtmps://` protocol prefix for Facebook, using only `live-api-s.facebook.com` instead of `rtmps://live-api-s.facebook.com`.

**Fix Applied**: Updated `/root/social_media/server/src/services/nimbleApiService.js` line 217:
```javascript
// Before
destinationUrl: 'live-api-s.facebook.com',

// After  
destinationUrl: 'rtmps://live-api-s.facebook.com',
```

**Result**: Facebook Live streams should now work properly with secure RTMP (RTMPS) on port 443.

### 2. ✅ Added RTMP URL Input Field for Custom Destinations
**Problem**: Users could only specify Platform and Stream Key but not custom RTMP URLs.

**Fix Applied**: Enhanced `/root/social_media/client/src/components/StreamSettingsDialog.tsx` to include:
- New RTMP URL input field for custom destinations
- Helper text explaining when to use it
- Two-row layout for better organization

**New UI Features**:
- **RTMP URL Field**: Optional input for custom platform URLs
- **Platform Reference Guide**: Shows default RTMP URLs for known platforms
- **Improved Layout**: Better organized destination setup form

### 3. ✅ Platform RTMP URLs Reference Guide
**Problem**: Users didn't know what RTMP URLs were being used for different platforms.

**Fix Applied**: Added a reference guide showing default RTMP URLs:

| Platform | RTMP URL | Notes |
|----------|----------|-------|
| YouTube | `rtmp://a.rtmp.youtube.com/live2` | Standard RTMP |
| Twitch | `rtmp://live.twitch.tv/live` | Standard RTMP |
| Facebook | `rtmps://live-api-s.facebook.com:443/rtmp` | Secure RTMP (SSL) |
| Kick | `rtmp://ingest.kick.com/live` | Standard RTMP |
| Rumble | `rtmp://live.rumble.com/live` | Standard RTMP |
| Custom | User-specified | Any RTMP URL |

## How to Use the New Features

### Setting Up Facebook Live:
1. Create a new destination
2. Platform: "Facebook"
3. Stream Key: Your Facebook Live stream key
4. RTMP URL: Leave empty (uses default RTMPS)
5. Facebook should now work correctly

### Setting Up Custom Destinations:
1. Create a new destination
2. Platform: Enter platform name (e.g., "Custom CDN")
3. Stream Key: Your stream key for that platform
4. RTMP URL: Enter the full RTMP URL (e.g., `rtmp://live.example.com/stream`)
5. System will use your custom URL instead of defaults

### Platform Reference:
- The UI now shows default RTMP URLs for each platform
- Users can see exactly what URLs are being used
- Custom URLs override defaults when specified

## Technical Details

### Backend Changes:
- Fixed Facebook RTMPS protocol in `nimbleApiService.js`
- System now properly handles secure RTMP connections
- Custom destination URLs are passed through to Nimble API

### Frontend Changes:
- Added RTMP URL input field with validation
- Improved UI layout with two-row destination form
- Added platform reference guide with all default URLs
- Better user guidance with helper text

### Database Schema:
- No changes required (destination_url field already existed)
- Existing streams continue to work without modification

## Testing
1. **Facebook Live**: Create a Facebook destination and verify RTMPS connection works
2. **Custom URLs**: Add a custom platform with custom RTMP URL
3. **Default Platforms**: Verify YouTube, Twitch still work with defaults
4. **UI Validation**: Check that new RTMP URL field appears and works correctly

All fixes are backward compatible and don't affect existing stream configurations.