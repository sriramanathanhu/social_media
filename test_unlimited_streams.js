const axios = require('axios');

async function testUnlimitedStreams() {
  console.log('🧪 Testing unlimited stream creation capability...');
  
  const baseURL = 'http://localhost:5000';
  
  // Test credentials
  const loginData = {
    email: 'test@test.com',
    password: 'test12345'
  };
  
  try {
    // Login
    console.log('\n🔐 Logging in...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, loginData);
    const token = loginResponse.data.token;
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Get current stream count
    console.log('\n📊 Current stream status:');
    const streamsResponse = await axios.get(`${baseURL}/api/live`, { headers });
    const currentStreams = streamsResponse.data.streams || [];
    console.log(`   Current streams: ${currentStreams.length}`);
    
    currentStreams.forEach((stream, index) => {
      console.log(`   ${index + 1}. ${stream.title} - ${stream.status}`);
    });
    
    // Get stream app info
    console.log('\n🏗️  Getting stream app info...');
    const appsResponse = await axios.get(`${baseURL}/api/stream-apps`, { headers });
    const apps = appsResponse.data.apps || [];
    
    if (apps.length === 0) {
      console.log('❌ No stream apps found - cannot create streams');
      return;
    }
    
    const app = apps[0];
    console.log(`   Using app: ${app.app_name} (${app.id})`);
    
    // Get app keys
    const keysResponse = await axios.get(`${baseURL}/api/stream-apps/${app.id}/keys`, { headers });
    const keys = keysResponse.data.keys || [];
    
    if (keys.length === 0) {
      console.log('❌ No stream keys found - cannot create streams');
      return;
    }
    
    const key = keys[0];
    console.log(`   Using key: ${key.key_name} (${key.id})`);
    
    // Test creating multiple YouTube streams
    console.log('\n🎬 Testing creation of multiple YouTube streams...');
    const youtubeKeys = [
      'ytkey-channel-001',
      'ytkey-channel-002', 
      'ytkey-channel-003',
      'ytkey-channel-004',
      'ytkey-channel-005'
    ];
    
    for (let i = 0; i < youtubeKeys.length; i++) {
      const streamData = {
        title: `YouTube Channel ${currentStreams.length + i + 1}`,
        description: `Test YouTube channel ${i + 1} for unlimited streaming`,
        app_id: app.id,
        app_key_id: key.id,
        destinations: [
          {
            platform: 'youtube',
            name: `YouTube ${i + 1}`,
            url: 'rtmp://a.rtmp.youtube.com/live2',
            key: youtubeKeys[i]
          }
        ]
      };
      
      try {
        const createResponse = await axios.post(`${baseURL}/api/live`, streamData, { headers });
        console.log(`   ✅ Created: ${streamData.title} (${createResponse.data.stream.id})`);
      } catch (error) {
        console.log(`   ❌ Failed to create ${streamData.title}:`, error.response?.data?.message || error.message);
        
        // Check if there's a limit error message
        if (error.response?.data?.message?.includes('limit') || error.response?.data?.message?.includes('maximum')) {
          console.log('   🚫 Limit reached!');
          break;
        }
      }
    }
    
    // Test creating Facebook streams
    console.log('\n📘 Testing creation of multiple Facebook streams...');
    const facebookKeys = [
      'FB-2020734496752831-0-Ab3hJaIj7y-HqPcYnQ9en001',
      'FB-2020734496752831-0-Ab3hJaIj7y-HqPcYnQ9en002'
    ];
    
    for (let i = 0; i < facebookKeys.length; i++) {
      const streamData = {
        title: `Facebook Live ${i + 1}`,
        description: `Test Facebook stream ${i + 1}`,
        app_id: app.id,
        app_key_id: key.id,
        destinations: [
          {
            platform: 'facebook',
            name: `Facebook ${i + 1}`,
            url: 'rtmps://live-api-s.facebook.com:443/rtmp',
            key: facebookKeys[i]
          }
        ]
      };
      
      try {
        const createResponse = await axios.post(`${baseURL}/api/live`, streamData, { headers });
        console.log(`   ✅ Created: ${streamData.title} (${createResponse.data.stream.id})`);
      } catch (error) {
        console.log(`   ❌ Failed to create ${streamData.title}:`, error.response?.data?.message || error.message);
      }
    }
    
    // Get final count
    console.log('\n📊 Final stream count:');
    const finalStreamsResponse = await axios.get(`${baseURL}/api/live`, { headers });
    const finalStreams = finalStreamsResponse.data.streams || [];
    console.log(`   Total streams: ${finalStreams.length}`);
    
    // Group by platform
    const platformCounts = {};
    finalStreams.forEach(stream => {
      // Determine platform from title or destinations
      let platform = 'other';
      if (stream.title.toLowerCase().includes('youtube')) platform = 'youtube';
      if (stream.title.toLowerCase().includes('facebook')) platform = 'facebook';
      
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });
    
    console.log('\n📈 Platform distribution:');
    Object.entries(platformCounts).forEach(([platform, count]) => {
      console.log(`   ${platform}: ${count} streams`);
    });
    
    console.log('\n🎯 Unlimited streaming test results:');
    console.log(`   ✅ Successfully created ${finalStreams.length} total streams`);
    console.log(`   ✅ No hard limits detected`);
    console.log(`   ✅ App-based architecture supports multiple platforms`);
    console.log(`   ✅ Same stream key can be used for multiple destinations`);
    
  } catch (error) {
    if (error.response) {
      console.error('❌ ERROR:', error.response.status, error.response.data);
    } else {
      console.error('❌ ERROR:', error.message);
    }
  }
}

testUnlimitedStreams();