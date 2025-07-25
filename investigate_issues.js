const axios = require('axios');
const crypto = require('crypto');

async function investigateIssues() {
  console.log('🔍 Investigating Facebook streaming and UI button issues...');
  
  const baseURL = 'http://localhost:5000';
  
  // Test credentials
  const loginData = {
    email: 'test@test.com',
    password: 'test12345'
  };
  
  try {
    // Login
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, loginData);
    const token = loginResponse.data.token;
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Get current streams
    console.log('\n📋 Current streams:');
    const streamsResponse = await axios.get(`${baseURL}/api/live`, { headers });
    const streams = streamsResponse.data.streams || [];
    
    streams.forEach((stream, index) => {
      console.log(`${index + 1}. ${stream.title} (${stream.id})`);
      console.log(`   Status: ${stream.status}`);
      console.log(`   RTMP: ${stream.rtmp_url}/${stream.stream_key}`);
    });
    
    // Check current Nimble rules
    console.log('\n📡 Current Nimble rules:');
    await checkNimbleRules();
    
    // Check database republishing status
    console.log('\n💾 Database republishing status:');
    // This would require database query - let's focus on testing the APIs
    
    // Test Facebook stream specifically
    const facebookStreams = streams.filter(s => s.title.toLowerCase().includes('facebook') || s.title.toLowerCase().includes('fb'));
    if (facebookStreams.length > 0) {
      const fbStream = facebookStreams[0];
      console.log(`\n📘 Testing Facebook stream: ${fbStream.title}`);
      
      // Test start stream
      try {
        console.log('   Testing START stream...');
        const startResponse = await axios.post(`${baseURL}/api/live/${fbStream.id}/start`, {}, { headers });
        console.log('   ✅ START successful:', startResponse.data.message);
      } catch (error) {
        console.log('   ❌ START failed:', error.response?.data || error.message);
      }
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test stop stream
      try {
        console.log('   Testing STOP stream...');
        const stopResponse = await axios.post(`${baseURL}/api/live/${fbStream.id}/stop`, {}, { headers });
        console.log('   ✅ STOP successful:', stopResponse.data.message);
      } catch (error) {
        console.log('   ❌ STOP failed:', error.response?.data || error.message);
      }
      
      // Check stream status after stop
      try {
        console.log('   Checking stream status after STOP...');
        const streamResponse = await axios.get(`${baseURL}/api/live/${fbStream.id}`, { headers });
        const updatedStream = streamResponse.data.stream;
        console.log(`   Stream status: ${updatedStream.status}`);
        console.log(`   Should still show START/STOP buttons if status is not "ended"`);
      } catch (error) {
        console.log('   ❌ Failed to get stream status:', error.response?.data || error.message);
      }
    }
    
    console.log('\n🔧 Issues identified:');
    console.log('1. Facebook streaming may need different RTMP configuration');
    console.log('2. Stream status management affects UI button visibility');
    console.log('3. Need to check if Facebook stream key is valid/active');
    
  } catch (error) {
    if (error.response) {
      console.error('❌ ERROR:', error.response.status, error.response.data);
    } else {
      console.error('❌ ERROR:', error.message);
    }
  }
}

async function checkNimbleRules() {
  const nimbleHost = '37.27.201.26';
  const nimblePort = 8082;
  const nimbleToken = 'NmB7K9mX2vQ8pL4wR6tY1zE5nA3cS0uI9fH8jG2bV7xM4qW6eD1rT5yU3oP9kL2sA8cV0nB6mX4wQ7pR1tY5zE';
  
  try {
    const salt = Math.floor(Math.random() * 1000000);
    const str2hash = `${salt}/${nimbleToken}`;
    const md5hash = crypto.createHash('md5').update(str2hash).digest();
    const base64hash = Buffer.from(md5hash).toString('base64');
    
    const url = `http://${nimbleHost}:${nimblePort}/manage/rtmp/republish?salt=${salt}&hash=${base64hash}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const rules = data.rules || [];
    rules.forEach((rule, index) => {
      const platform = rule.dest_addr.includes('youtube') ? 'YouTube' : 
                      rule.dest_addr.includes('facebook') ? 'Facebook' : 'Other';
      console.log(`   ${index + 1}. ${platform}: ${rule.dest_stream}`);
      
      if (platform === 'Facebook') {
        console.log(`      Full config: ${rule.dest_addr}:${rule.dest_port}/${rule.dest_app}/${rule.dest_stream}`);
      }
    });
    
  } catch (error) {
    console.error('   Failed to check Nimble rules:', error.message);
  }
}

investigateIssues();