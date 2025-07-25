const axios = require('axios');

async function testCompleteWorkflow() {
  console.log('🧪 Testing complete stream workflow: create → start → stop → start again');
  
  const baseURL = 'http://localhost:5000';
  
  // Test credentials
  const loginData = {
    email: 'test@test.com',
    password: 'test12345'
  };
  
  try {
    // Login
    console.log('\n🔐 Step 1: Logging in...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, loginData);
    const token = loginResponse.data.token;
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Get Facebook stream
    console.log('\n📋 Step 2: Getting Facebook stream...');
    const streamsResponse = await axios.get(`${baseURL}/api/live`, { headers });
    const streams = streamsResponse.data.streams || [];
    
    const facebookStream = streams.find(s => s.title.toLowerCase().includes('facebook'));
    if (!facebookStream) {
      console.log('❌ No Facebook stream found');
      return;
    }
    
    console.log(`📘 Found Facebook stream: ${facebookStream.title} (${facebookStream.id})`);
    console.log(`   Initial status: ${facebookStream.status}`);
    
    // Test workflow: START → STOP → START again
    console.log('\n🚀 Step 3: Testing START stream...');
    try {
      const startResponse = await axios.post(`${baseURL}/api/live/${facebookStream.id}/start`, {}, { headers });
      console.log('   ✅ START successful:', startResponse.data.message);
    } catch (error) {
      console.log('   ❌ START failed:', error.response?.data || error.message);
      return;
    }
    
    // Check status after start
    console.log('\n📊 Step 4: Checking status after START...');
    try {
      const statusResponse = await axios.get(`${baseURL}/api/live/${facebookStream.id}`, { headers });
      const updatedStream = statusResponse.data.stream;
      console.log(`   Stream status after START: ${updatedStream.status}`);
      console.log(`   Expected: "live" - UI should show STOP button`);
    } catch (error) {
      console.log('   ❌ Failed to get stream status:', error.response?.data || error.message);
    }
    
    // Wait a moment
    console.log('\\n⏳ Step 5: Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test STOP
    console.log('\\n🛑 Step 6: Testing STOP stream...');
    try {
      const stopResponse = await axios.post(`${baseURL}/api/live/${facebookStream.id}/stop`, {}, { headers });
      console.log('   ✅ STOP successful:', stopResponse.data.message);
    } catch (error) {
      console.log('   ❌ STOP failed:', error.response?.data || error.message);
      return;
    }
    
    // Check status after stop
    console.log('\\n📊 Step 7: Checking status after STOP...');
    try {
      const statusResponse = await axios.get(`${baseURL}/api/live/${facebookStream.id}`, { headers });
      const updatedStream = statusResponse.data.stream;
      console.log(`   Stream status after STOP: ${updatedStream.status}`);
      console.log(`   Expected: "inactive" - UI should show START button`);
      
      if (updatedStream.status === 'inactive') {
        console.log('   ✅ Status is inactive - stream can be reused');
      } else if (updatedStream.status === 'ended') {
        console.log('   ❌ Status is ended - stream cannot be reused without recreation');
      }
    } catch (error) {
      console.log('   ❌ Failed to get stream status:', error.response?.data || error.message);
    }
    
    // Test START again to verify reusability
    console.log('\\n🔄 Step 8: Testing START again (reusability)...');
    try {
      const restartResponse = await axios.post(`${baseURL}/api/live/${facebookStream.id}/start`, {}, { headers });
      console.log('   ✅ RESTART successful:', restartResponse.data.message);
      console.log('   ✅ Stream is reusable - no need to recreate!');
    } catch (error) {
      console.log('   ❌ RESTART failed:', error.response?.data || error.message);
      console.log('   ❌ Stream is not reusable - this is the bug we need to fix');
    }
    
    // Final status check
    console.log('\\n📊 Step 9: Final status check...');
    try {
      const finalResponse = await axios.get(`${baseURL}/api/live/${facebookStream.id}`, { headers });
      const finalStream = finalResponse.data.stream;
      console.log(`   Final stream status: ${finalStream.status}`);
    } catch (error) {
      console.log('   ❌ Failed final status check:', error.response?.data || error.message);
    }
    
    // Stop the stream to clean up
    console.log('\\n🧹 Step 10: Cleanup - stopping stream...');
    try {
      await axios.post(`${baseURL}/api/live/${facebookStream.id}/stop`, {}, { headers });
      console.log('   ✅ Cleanup successful');
    } catch (error) {
      console.log('   ❌ Cleanup failed:', error.response?.data || error.message);
    }
    
    console.log('\\n🎯 Test Results Summary:');
    console.log('- Start/Stop functionality: Should work');
    console.log('- Stream reusability: Should work with status "inactive" after stop');
    console.log('- UI button persistence: Depends on status management');
    console.log('- Facebook streaming: Technical configuration appears correct');
    
  } catch (error) {
    if (error.response) {
      console.error('❌ ERROR:', error.response.status, error.response.data);
    } else {
      console.error('❌ ERROR:', error.message);
    }
  }
}

testCompleteWorkflow();