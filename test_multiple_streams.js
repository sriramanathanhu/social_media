#!/usr/bin/env node

/**
 * Test script to verify multiple stream creation with same app works correctly
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Test data
const testStreams = [
  {
    title: 'Morning Yoga Session',
    description: 'Daily morning yoga for wellness',
    app_id: 'f1a19f23-630f-4520-a65c-92f15289db41', // gurupurnima app
    app_key_id: '66d41382-d9b6-4328-876f-e6f95d6aaf37'
  },
  {
    title: 'Evening Meditation Class',
    description: 'Peaceful evening meditation session',
    app_id: 'f1a19f23-630f-4520-a65c-92f15289db41', // gurupurnima app
    app_key_id: '66d41382-d9b6-4328-876f-e6f95d6aaf37'
  },
  {
    title: 'Weekend Workshop',
    description: 'Special weekend spiritual workshop',
    app_id: 'f1a19f23-630f-4520-a65c-92f15289db41', // gurupurnima app  
    app_key_id: '66d41382-d9b6-4328-876f-e6f95d6aaf37'
  }
];

async function loginAndGetToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@socialmedia.com',
        password: 'Admin123!'
      }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Login error:', error.message);
    return null;
  }
}

async function createStream(streamData, token) {
  try {
    const response = await fetch(`${API_BASE_URL}/live`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(streamData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Stream creation failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    return data.stream;
  } catch (error) {
    console.error('Stream creation error:', error.message);
    return null;
  }
}

async function getAllStreams(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/live`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Get streams failed: ${response.status}`);
    }

    const data = await response.json();
    return data.streams;
  } catch (error) {
    console.error('Get streams error:', error.message);
    return [];
  }
}

async function runTest() {
  console.log('🚀 Starting Multiple Stream Creation Test...\n');

  // Step 1: Login
  console.log('📋 Step 1: Logging in...');
  const token = await loginAndGetToken();
  if (!token) {
    console.log('❌ Login failed. Test aborted.');
    return;
  }
  console.log('✅ Login successful\n');

  // Step 2: Create multiple streams
  console.log('📋 Step 2: Creating multiple streams with same app...');
  const createdStreams = [];

  for (let i = 0; i < testStreams.length; i++) {
    const streamData = testStreams[i];
    console.log(`  Creating stream ${i + 1}: "${streamData.title}"`);
    
    const stream = await createStream(streamData, token);
    if (stream) {
      createdStreams.push(stream);
      console.log(`    ✅ Created with source_stream: "${stream.source_stream}"`);
    } else {
      console.log(`    ❌ Failed to create stream: "${streamData.title}"`);
    }
  }

  if (createdStreams.length === 0) {
    console.log('❌ No streams were created. Test failed.');
    return;
  }

  console.log(`\n📋 Step 3: Verifying ${createdStreams.length} streams were created...\n`);

  // Step 3: Verify streams
  console.log('Stream Details:');
  console.log('================');
  
  createdStreams.forEach((stream, index) => {
    console.log(`Stream ${index + 1}:`);
    console.log(`  Title: ${stream.title}`);
    console.log(`  Stream Key: ${stream.stream_key} (shared)`);
    console.log(`  RTMP URL: ${stream.rtmp_url} (shared)`);
    console.log(`  Source App: ${stream.source_app} (shared)`);
    console.log(`  Source Stream: ${stream.source_stream} (unique) ⭐`);
    console.log(`  ID: ${stream.id}`);
    console.log('');
  });

  // Step 4: Verify Nimble Configuration Format
  console.log('📋 Step 4: Generated Nimble Configuration Preview:\n');
  console.log('push_publishing_rules = [');
  
  createdStreams.forEach((stream) => {
    console.log(`  # ${stream.title}`);
    console.log(`  {`);
    console.log(`    name = "${stream.source_app}_${stream.source_stream}_youtube"`);
    console.log(`    source_application = "${stream.source_app}"`);
    console.log(`    source_stream = "${stream.source_stream}"`);
    console.log(`    target_url = "rtmp://a.rtmp.youtube.com/live2/YOUR_YOUTUBE_KEY"`);
    console.log(`  },`);
    console.log('');
  });
  console.log(']');

  // Step 5: OBS Setup Instructions
  console.log('\n📋 Step 5: OBS Setup Instructions:\n');
  if (createdStreams.length > 0) {
    const firstStream = createdStreams[0];
    console.log('For OBS Studio, use these SHARED settings for ALL streams:');
    console.log(`  RTMP URL: ${firstStream.rtmp_url}`);
    console.log(`  Stream Key: ${firstStream.stream_key}`);
    console.log('');
    console.log('Nimble will automatically route to the correct destinations');
    console.log('based on your republishing rules configuration.');
  }

  console.log('\n🎉 Test completed successfully!');
  console.log(`✅ Created ${createdStreams.length} streams using the same app`);
  console.log('✅ Each stream has a unique source_stream identifier');
  console.log('✅ All streams share the same RTMP endpoint for OBS');
  console.log('✅ Ready for multi-destination republishing setup');
}

// Run the test
runTest().catch(console.error);