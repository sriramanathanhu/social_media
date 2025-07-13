#!/usr/bin/env node

const https = require('https');
const http = require('http');

console.log('🎯 Testing Nimble Streamer Connection');
console.log('=====================================\n');

const NIMBLE_HOST = '37.27.201.26';
const NIMBLE_RTMP_PORT = 1935;
const NIMBLE_STATS_PORT = 8082;

// Test RTMP port connectivity
function testRTMPPort() {
  return new Promise((resolve) => {
    console.log(`📡 Testing RTMP port ${NIMBLE_HOST}:${NIMBLE_RTMP_PORT}...`);
    
    const net = require('net');
    const socket = new net.Socket();
    
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      console.log('✅ RTMP port 1935 is accessible');
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log('❌ RTMP port 1935 connection timeout');
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (err) => {
      console.log(`❌ RTMP port 1935 connection error: ${err.message}`);
      resolve(false);
    });
    
    socket.connect(NIMBLE_RTMP_PORT, NIMBLE_HOST);
  });
}

// Test Stats API
function testStatsAPI() {
  return new Promise((resolve) => {
    console.log(`\n📊 Testing Stats API ${NIMBLE_HOST}:${NIMBLE_STATS_PORT}...`);
    
    const statsEndpoints = ['/stats', '/stats.json', '/status', '/info'];
    let workingEndpoint = null;
    
    const testEndpoint = (endpoint, index = 0) => {
      if (index >= statsEndpoints.length) {
        console.log('❌ No working stats endpoints found');
        console.log('💡 Stats module may need to be enabled in WMSPanel');
        resolve(false);
        return;
      }
      
      const currentEndpoint = statsEndpoints[index];
      const url = `http://${NIMBLE_HOST}:${NIMBLE_STATS_PORT}${currentEndpoint}`;
      
      const req = http.get(url, { timeout: 3000 }, (res) => {
        console.log(`✅ Stats endpoint ${currentEndpoint} responded with status ${res.statusCode}`);
        workingEndpoint = currentEndpoint;
        resolve(true);
      });
      
      req.on('timeout', () => {
        req.destroy();
        console.log(`⏰ Stats endpoint ${currentEndpoint} timeout`);
        testEndpoint(endpoint, index + 1);
      });
      
      req.on('error', (err) => {
        console.log(`❌ Stats endpoint ${currentEndpoint} error: ${err.message}`);
        testEndpoint(endpoint, index + 1);
      });
    };
    
    testEndpoint(statsEndpoints[0], 0);
  });
}

// Main test function
async function runTests() {
  console.log('Target Nimble Server: 37.27.201.26');
  console.log('WMSPanel UUID: 5f7ca354-fc54-83da-a4ae-b1ebf0980f9e\n');
  
  const rtmpTest = await testRTMPPort();
  const statsTest = await testStatsAPI();
  
  console.log('\n📋 Test Results Summary');
  console.log('=======================');
  console.log(`RTMP Port (1935): ${rtmpTest ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`Stats API (8082): ${statsTest ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (rtmpTest) {
    console.log('\n🎉 SUCCESS: Nimble Streamer is ready for streaming!');
    console.log('\n📝 Next Steps:');
    console.log('1. Navigate to /live in your social media app');
    console.log('2. Create a new stream');
    console.log('3. Configure OBS with the provided RTMP settings');
    console.log('4. Start streaming!');
    
    if (!statsTest) {
      console.log('\n⚠️  Note: Stats monitoring is not available.');
      console.log('   You can still stream, but real-time monitoring will be limited.');
      console.log('   To enable stats, configure the HTTP plugin in WMSPanel.');
    }
  } else {
    console.log('\n❌ FAILED: Cannot connect to Nimble Streamer');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify Nimble Streamer is running on the server');
    console.log('2. Check firewall settings (port 1935 must be open)');
    console.log('3. Ensure WMSPanel registration completed successfully');
  }
}

// Run the tests
runTests().catch(console.error);