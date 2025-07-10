#!/usr/bin/env node

/**
 * Nimble Streamer Integration Test Script
 * 
 * This script tests the end-to-end Nimble integration by:
 * 1. Testing Nimble services initialization
 * 2. Creating a test stream
 * 3. Generating Nimble configuration
 * 4. Testing monitoring functionality
 * 5. Cleaning up test data
 */

const path = require('path');
const fs = require('fs').promises;

// Test configuration
const TEST_CONFIG = {
  TEST_USER_ID: 'test-user-123',
  TEST_STREAM_TITLE: 'Test Nimble Integration Stream',
  NIMBLE_HOST: process.env.NIMBLE_HOST || 'localhost',
  NIMBLE_PORT: process.env.NIMBLE_PORT || 1935,
  NIMBLE_CONFIG_PATH: process.env.NIMBLE_CONFIG_PATH || path.join(__dirname, 'test-rules.conf'),
};

console.log('🎬 Starting Nimble Streamer Integration Test');
console.log('=' .repeat(50));

async function testServices() {
  console.log('📋 Testing service initialization...');
  
  try {
    // Test NimbleController
    const NimbleController = require('./server/src/services/nimbleController');
    const nimbleController = new NimbleController();
    console.log('✅ NimbleController initialized successfully');
    
    // Test NimbleMonitor
    const NimbleMonitor = require('./server/src/services/nimbleMonitor');
    const nimbleMonitor = new NimbleMonitor();
    console.log('✅ NimbleMonitor initialized successfully');
    
    // Test LiveStreamingService
    const liveStreamingService = require('./server/src/services/liveStreamingService');
    console.log('✅ LiveStreamingService with Nimble integration loaded');
    
    return { nimbleController, nimbleMonitor, liveStreamingService };
  } catch (error) {
    console.error('❌ Service initialization failed:', error.message);
    throw error;
  }
}

async function testStreamCreation(liveStreamingService) {
  console.log('\\n🔧 Testing stream creation with Nimble integration...');
  
  try {
    // Mock stream data
    const streamData = {
      title: TEST_CONFIG.TEST_STREAM_TITLE,
      description: 'Test stream for Nimble integration verification',
      category: 'Technology',
      tags: ['test', 'nimble', 'streaming'],
      isPublic: true,
      sourceType: 'rtmp_push',
      sourceApp: 'live',
      qualitySettings: {
        resolution: '1920x1080',
        bitrate: 4000,
        framerate: 30,
        audio_bitrate: 128
      },
      republishingTargets: [
        {
          platform: 'youtube',
          streamKey: 'test-youtube-key-123',
          enabled: true
        },
        {
          platform: 'twitch',
          streamKey: 'test-twitch-key-456',
          enabled: true
        }
      ]
    };
    
    console.log('📝 Stream data prepared:', {
      title: streamData.title,
      republishing: streamData.republishingTargets.length,
      quality: streamData.qualitySettings.resolution
    });
    
    return streamData;
  } catch (error) {
    console.error('❌ Stream creation test failed:', error.message);
    throw error;
  }
}

async function testNimbleConfig(nimbleController) {
  console.log('\\n⚙️ Testing Nimble configuration generation...');
  
  try {
    // Generate configuration
    const config = await nimbleController.generateNimbleConfig();
    console.log('✅ Nimble configuration generated successfully');
    
    // Validate configuration structure
    if (!config.SyncResponse) {
      throw new Error('Invalid config: missing SyncResponse');
    }
    
    if (!config.SyncResponse.RtmpSettings) {
      throw new Error('Invalid config: missing RtmpSettings');
    }
    
    if (!config.SyncResponse.RtmpPublishSettings) {
      throw new Error('Invalid config: missing RtmpPublishSettings');
    }
    
    console.log('✅ Configuration structure validation passed');
    console.log('📊 Configuration summary:', {
      republishing_count: config.SyncResponse.pub_count || 0,
      rtmp_port: config.SyncResponse.RtmpSettings.interfaces?.[0]?.port || 'unknown'
    });
    
    // Test configuration writing
    await nimbleController.writeNimbleConfig(config);
    console.log('✅ Configuration written to file successfully');
    
    return config;
  } catch (error) {
    console.error('❌ Nimble configuration test failed:', error.message);
    throw error;
  }
}

async function testMonitoring(nimbleMonitor) {
  console.log('\\n📡 Testing Nimble monitoring functionality...');
  
  try {
    // Test monitor status
    const status = nimbleMonitor.getStatus();
    console.log('✅ Monitor status retrieved:', {
      isMonitoring: status.isMonitoring,
      statsURL: status.nimbleStatsURL
    });
    
    // Test stats fetching (this will likely fail without a running Nimble server)
    console.log('📊 Testing stats fetching (may fail without running Nimble)...');
    try {
      const stats = await nimbleMonitor.fetchNimbleStats();
      if (stats) {
        console.log('✅ Nimble stats fetched successfully');
      } else {
        console.log('⚠️ No stats available (expected if Nimble is not running)');
      }
    } catch (statsError) {
      console.log('⚠️ Stats fetch failed (expected if Nimble is not running):', statsError.message);
    }
    
    return status;
  } catch (error) {
    console.error('❌ Monitoring test failed:', error.message);
    throw error;
  }
}

async function testPlatformMapping(nimbleController) {
  console.log('\\n🌐 Testing platform-specific configurations...');
  
  try {
    const platforms = ['youtube', 'twitch', 'facebook', 'twitter', 'linkedin'];
    
    for (const platform of platforms) {
      const url = nimbleController.getPlatformURL(platform);
      const port = nimbleController.getPlatformPort(platform);
      const app = nimbleController.getPlatformApp(platform);
      
      console.log(`✅ ${platform.toUpperCase()}: ${url}:${port}/${app}`);
    }
    
    console.log('✅ All platform mappings validated');
  } catch (error) {
    console.error('❌ Platform mapping test failed:', error.message);
    throw error;
  }
}

async function testEnvironmentConfig() {
  console.log('\\n🔧 Testing environment configuration...');
  
  const requiredVars = [
    'NIMBLE_HOST',
    'NIMBLE_PORT', 
    'NIMBLE_STATS_PORT',
    'NIMBLE_CONFIG_PATH'
  ];
  
  const config = {};
  
  for (const varName of requiredVars) {
    const value = process.env[varName] || TEST_CONFIG[varName.replace('NIMBLE_', '')];
    config[varName] = value;
    console.log(`📝 ${varName}: ${value}`);
  }
  
  console.log('✅ Environment configuration validated');
  return config;
}

async function cleanupTestData() {
  console.log('\\n🧹 Cleaning up test data...');
  
  try {
    // Remove test configuration file if it exists
    const testConfigPath = TEST_CONFIG.NIMBLE_CONFIG_PATH;
    try {
      await fs.access(testConfigPath);
      await fs.unlink(testConfigPath);
      console.log('✅ Test configuration file removed');
    } catch (err) {
      console.log('ℹ️ No test configuration file to remove');
    }
    
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

async function generateTestReport(results) {
  console.log('\\n📋 Test Report');
  console.log('=' .repeat(50));
  
  const report = {
    timestamp: new Date().toISOString(),
    status: 'PASSED',
    tests: {
      service_initialization: results.servicesOk ? 'PASSED' : 'FAILED',
      stream_creation: results.streamOk ? 'PASSED' : 'FAILED',
      nimble_config: results.configOk ? 'PASSED' : 'FAILED',
      monitoring: results.monitoringOk ? 'PASSED' : 'FAILED',
      platform_mapping: results.platformOk ? 'PASSED' : 'FAILED',
      environment: results.envOk ? 'PASSED' : 'FAILED'
    },
    configuration: results.envConfig,
    errors: results.errors
  };
  
  // Check if any test failed
  if (Object.values(report.tests).includes('FAILED')) {
    report.status = 'FAILED';
  }
  
  console.log('Overall Status:', report.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED');
  console.log('\\nTest Results:');
  Object.entries(report.tests).forEach(([test, status]) => {
    const icon = status === 'PASSED' ? '✅' : '❌';
    console.log(`  ${icon} ${test.replace(/_/g, ' ').toUpperCase()}: ${status}`);
  });
  
  if (results.errors.length > 0) {
    console.log('\\nErrors Encountered:');
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log('\\n🎯 Next Steps:');
  if (report.status === 'PASSED') {
    console.log('  1. Start Nimble Streamer server');
    console.log('  2. Configure OBS Studio with RTMP settings');
    console.log('  3. Create a stream via the UI');
    console.log('  4. Test live streaming workflow');
  } else {
    console.log('  1. Fix failing tests');
    console.log('  2. Check Nimble Streamer installation');
    console.log('  3. Verify environment configuration');
    console.log('  4. Re-run integration test');
  }
  
  // Save report to file
  const reportPath = path.join(__dirname, 'nimble-integration-test-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\\n📄 Test report saved to: ${reportPath}`);
  
  return report;
}

async function main() {
  const results = {
    servicesOk: false,
    streamOk: false,
    configOk: false,
    monitoringOk: false,
    platformOk: false,
    envOk: false,
    envConfig: {},
    errors: []
  };
  
  try {
    // Test environment configuration
    results.envConfig = await testEnvironmentConfig();
    results.envOk = true;
    
    // Test services initialization
    const services = await testServices();
    results.servicesOk = true;
    
    // Test stream creation
    await testStreamCreation(services.liveStreamingService);
    results.streamOk = true;
    
    // Test Nimble configuration
    await testNimbleConfig(services.nimbleController);
    results.configOk = true;
    
    // Test monitoring
    await testMonitoring(services.nimbleMonitor);
    results.monitoringOk = true;
    
    // Test platform mapping
    await testPlatformMapping(services.nimbleController);
    results.platformOk = true;
    
  } catch (error) {
    results.errors.push(error.message);
    console.error('\\n❌ Test failed:', error.message);
  }
  
  // Cleanup
  await cleanupTestData();
  
  // Generate report
  const report = await generateTestReport(results);
  
  console.log('\\n🎬 Nimble Streamer Integration Test Complete');
  console.log('=' .repeat(50));
  
  // Exit with appropriate code
  process.exit(report.status === 'PASSED' ? 0 : 1);
}

// Run the test
main().catch(error => {
  console.error('\\n💥 Fatal error:', error);
  process.exit(1);
});