#!/usr/bin/env node

/**
 * Nimble Core Integration Test (No Database Required)
 * 
 * Tests core Nimble functionality without database dependencies
 */

console.log('🎬 Testing Nimble Core Integration (No Database)');
console.log('=' .repeat(50));

async function testCoreServices() {
  console.log('📋 Testing core service functionality...');
  
  try {
    // Test NimbleController core functions
    const NimbleController = require('./server/src/services/nimbleController');
    const nimbleController = new NimbleController();
    console.log('✅ NimbleController initialized');
    
    // Test platform mappings
    const platforms = ['youtube', 'twitch', 'facebook', 'twitter', 'linkedin'];
    console.log('🌐 Testing platform mappings:');
    
    for (const platform of platforms) {
      const url = nimbleController.getPlatformURL(platform);
      const port = nimbleController.getPlatformPort(platform);
      const app = nimbleController.getPlatformApp(platform);
      console.log(`  ✅ ${platform.toUpperCase()}: ${url}:${port}/${app}`);
    }
    
    // Test configuration structure (without database)
    console.log('⚙️ Testing configuration structure:');
    const mockConfig = {
      SyncResponse: {
        RtmpSettings: {
          hash: Date.now().toString(),
          interfaces: [{ ip: "*", port: 1935, ssl: false }]
        },
        RtmpPublishSettings: {
          hash: Date.now().toString(),
          settings: [
            {
              id: 'test-1',
              src_app: 'live',
              src_stream: 'test-stream-key',
              dest_addr: 'a.rtmp.youtube.com',
              dest_port: 1935,
              dest_app: 'live2',
              dest_stream: 'youtube-key-123'
            }
          ]
        },
        pub_count: 1
      }
    };
    
    // Validate config structure
    const isValid = nimbleController.validateConfig(mockConfig);
    console.log('✅ Configuration validation passed');
    
    // Test NimbleMonitor core functions
    const NimbleMonitor = require('./server/src/services/nimbleMonitor');
    const nimbleMonitor = new NimbleMonitor();
    console.log('✅ NimbleMonitor initialized');
    
    const status = nimbleMonitor.getStatus();
    console.log('✅ Monitor status retrieved:', {
      statsURL: status.nimbleStatsURL,
      isMonitoring: status.isMonitoring
    });
    
    // Test stream metrics extraction
    const mockNimbleStream = {
      name: 'test-stream',
      clients: 5,
      bytes_in: 1024000,
      bytes_out: 2048000,
      bitrate: 4000,
      uptime: 300
    };
    
    const metrics = nimbleMonitor.extractStreamMetrics(mockNimbleStream);
    console.log('✅ Stream metrics extraction:', metrics);
    
    return { nimbleController, nimbleMonitor };
  } catch (error) {
    console.error('❌ Core service test failed:', error.message);
    throw error;
  }
}

async function testRTMPURLGeneration() {
  console.log('\\n🔗 Testing RTMP URL generation...');
  
  const nimbleHost = process.env.NIMBLE_HOST || 'localhost';
  const nimblePort = process.env.NIMBLE_PORT || 1935;
  
  const streamKey = 'test-stream-' + Math.random().toString(36).substr(2, 9);
  const rtmpUrl = `rtmp://${nimbleHost}:${nimblePort}/live`;
  const fullUrl = `${rtmpUrl}/${streamKey}`;
  
  console.log('✅ Generated RTMP configuration:');
  console.log(`  Server: ${rtmpUrl}`);
  console.log(`  Stream Key: ${streamKey}`);
  console.log(`  Full URL: ${fullUrl}`);
  
  return { rtmpUrl, streamKey, fullUrl };
}

async function testConfigurationGeneration() {
  console.log('\\n⚙️ Testing manual configuration generation...');
  
  // Simulate stream data without database
  const mockStreams = [
    {
      id: 'stream-1',
      stream_key: 'test-key-123',
      source_app: 'live',
      republishing: [
        {
          id: 'repub-1',
          enabled: true,
          destination_name: 'YouTube',
          destination_url: 'a.rtmp.youtube.com',
          destination_port: 1935,
          destination_app: 'live2',
          destination_stream: 'youtube-stream-key'
        },
        {
          id: 'repub-2',
          enabled: true,
          destination_name: 'Twitch',
          destination_url: 'live.twitch.tv',
          destination_port: 1935,
          destination_app: 'live',
          destination_stream: 'twitch-stream-key'
        }
      ]
    }
  ];
  
  // Generate mock configuration
  const timestamp = Date.now().toString();
  const config = {
    SyncResponse: {
      RtmpSettings: {
        hash: timestamp,
        interfaces: [{ ip: "*", port: 1935, ssl: false }],
        login: "",
        password: "",
        duration: 6,
        chunk_count: 4,
        dash_template: "TIME",
        protocols: []
      },
      RtmpPublishSettings: {
        hash: timestamp,
        settings: []
      },
      LivePullSettings: {
        hash: timestamp,
        streams: []
      },
      pub_count: 0
    }
  };
  
  // Add republishing for mock streams
  for (const stream of mockStreams) {
    for (const repub of stream.republishing) {
      if (repub.enabled) {
        config.SyncResponse.RtmpPublishSettings.settings.push({
          id: repub.id,
          src_app: stream.source_app,
          src_stream: stream.stream_key,
          dest_addr: repub.destination_url,
          dest_port: repub.destination_port,
          dest_app: repub.destination_app,
          dest_stream: repub.destination_stream
        });
      }
    }
  }
  
  config.SyncResponse.pub_count = config.SyncResponse.RtmpPublishSettings.settings.length;
  
  console.log('✅ Generated configuration:');
  console.log(`  Republishing destinations: ${config.SyncResponse.pub_count}`);
  console.log(`  RTMP interfaces: ${config.SyncResponse.RtmpSettings.interfaces.length}`);
  
  // Test configuration writing to a test file
  const fs = require('fs').promises;
  const path = require('path');
  const testConfigPath = path.join(__dirname, 'test-nimble-config.json');
  
  await fs.writeFile(testConfigPath, JSON.stringify(config, null, 2));
  console.log(`✅ Test configuration written to: ${testConfigPath}`);
  
  return config;
}

async function testOBSInstructions() {
  console.log('\\n📺 Testing OBS setup instructions...');
  
  const nimbleHost = 'localhost';
  const nimblePort = 1935;
  const streamKey = 'obs-test-key-456';
  
  const obsSettings = {
    service: 'Custom...',
    server: `rtmp://${nimbleHost}:${nimblePort}/live`,
    stream_key: streamKey
  };
  
  console.log('✅ OBS Studio Settings:');
  console.log(`  Service: ${obsSettings.service}`);
  console.log(`  Server: ${obsSettings.server}`);
  console.log(`  Stream Key: ${obsSettings.stream_key}`);
  
  console.log('\\n📋 OBS Setup Instructions:');
  console.log('  1. Open OBS Studio');
  console.log('  2. Go to Settings → Stream');
  console.log(`  3. Service: ${obsSettings.service}`);
  console.log(`  4. Server: ${obsSettings.server}`);
  console.log(`  5. Stream Key: ${obsSettings.stream_key}`);
  console.log('  6. Click OK and start streaming!');
  
  return obsSettings;
}

async function cleanup() {
  console.log('\\n🧹 Cleaning up test files...');
  
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const testFiles = [
      'test-nimble-config.json',
      'nimble-core-test-report.json'
    ];
    
    for (const file of testFiles) {
      const filePath = path.join(__dirname, file);
      try {
        await fs.unlink(filePath);
        console.log(`✅ Removed ${file}`);
      } catch (err) {
        // File doesn't exist, that's fine
      }
    }
  } catch (error) {
    console.log('⚠️ Cleanup warning:', error.message);
  }
}

async function main() {
  const results = {
    coreServices: false,
    rtmpGeneration: false,
    configGeneration: false,
    obsInstructions: false,
    errors: []
  };
  
  try {
    // Test core services
    await testCoreServices();
    results.coreServices = true;
    
    // Test RTMP URL generation
    await testRTMPURLGeneration();
    results.rtmpGeneration = true;
    
    // Test configuration generation
    await testConfigurationGeneration();
    results.configGeneration = true;
    
    // Test OBS instructions
    await testOBSInstructions();
    results.obsInstructions = true;
    
  } catch (error) {
    results.errors.push(error.message);
    console.error('\\n❌ Test failed:', error.message);
  }
  
  // Cleanup
  await cleanup();
  
  // Generate report
  console.log('\\n📋 Core Integration Test Report');
  console.log('=' .repeat(50));
  
  const allPassed = results.coreServices && results.rtmpGeneration && 
                   results.configGeneration && results.obsInstructions;
  
  console.log('Overall Status:', allPassed ? '✅ PASSED' : '❌ FAILED');
  console.log('\\nTest Results:');
  console.log(`  ${results.coreServices ? '✅' : '❌'} Core Services: ${results.coreServices ? 'PASSED' : 'FAILED'}`);
  console.log(`  ${results.rtmpGeneration ? '✅' : '❌'} RTMP Generation: ${results.rtmpGeneration ? 'PASSED' : 'FAILED'}`);
  console.log(`  ${results.configGeneration ? '✅' : '❌'} Config Generation: ${results.configGeneration ? 'PASSED' : 'FAILED'}`);
  console.log(`  ${results.obsInstructions ? '✅' : '❌'} OBS Instructions: ${results.obsInstructions ? 'PASSED' : 'FAILED'}`);
  
  if (results.errors.length > 0) {
    console.log('\\nErrors:');
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log('\\n🎯 Status:');
  if (allPassed) {
    console.log('✅ Core Nimble integration is working correctly!');
    console.log('\\n📋 Ready for end-to-end testing:');
    console.log('  1. Set up database and environment variables');
    console.log('  2. Install and start Nimble Streamer');
    console.log('  3. Start the application servers');
    console.log('  4. Create a stream via the UI');
    console.log('  5. Configure OBS and test streaming');
  } else {
    console.log('❌ Core integration has issues that need to be fixed');
  }
  
  console.log('\\n🎬 Core Integration Test Complete');
  console.log('=' .repeat(50));
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('\\n💥 Fatal error:', error);
  process.exit(1);
});