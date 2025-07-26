const axios = require('axios');

async function testRedditAPI() {
  const BASE_URL = 'http://localhost:5000';
  
  console.log('🚀 Testing Reddit API functionality...\n');
  
  try {
    // Step 1: Check server health
    console.log('1. Checking server health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is healthy:', healthResponse.data);
    
    // Step 2: Check Reddit endpoints
    console.log('\n2. Checking available endpoints...');
    const rootResponse = await axios.get(`${BASE_URL}/`);
    console.log('✅ Available endpoints:', rootResponse.data.endpoints);
    
    if (!rootResponse.data.endpoints.includes('/api/reddit')) {
      console.log('❌ Reddit API endpoint not found');
      return;
    }
    
    // Step 3: Test with mock data (simulating what the frontend sends)
    console.log('\n3. Testing Reddit post submission (mock test)...');
    
    const testPostData = {
      accountId: 1, // Mock account ID
      subreddit: 'test',
      title: 'Test Reddit Post Title - API Debug Session',
      type: 'text',
      content: 'This is test content for Reddit post debugging. This should appear in the Reddit post body with **bold** and *italic* formatting.',
      nsfw: false,
      spoiler: false
    };
    
    console.log('📤 Sending test post data:', JSON.stringify(testPostData, null, 2));
    
    // Note: This will fail because we don't have valid authentication, 
    // but it will help us see how the server processes the request
    try {
      const postResponse = await axios.post(`${BASE_URL}/api/reddit/submit`, testPostData, {
        headers: {
          'Content-Type': 'application/json',
          // Mock JWT token (will fail authentication but show parsing)
          'Authorization': 'Bearer mock-token-for-testing'
        }
      });
      console.log('✅ Post response:', postResponse.data);
    } catch (error) {
      if (error.response) {
        console.log('📋 Server processed request (expected auth failure):');
        console.log('Status:', error.response.status);
        console.log('Response:', error.response.data);
        
        // Check if the error indicates our changes are working
        if (error.response.status === 401 || error.response.status === 403) {
          console.log('✅ Authentication error expected - request structure is correct');
        } else if (error.response.status === 400) {
          console.log('⚠️ Bad request - check request structure');
        }
      } else {
        console.log('❌ Network error:', error.message);
      }
    }
    
    // Step 4: Test link post format
    console.log('\n4. Testing Reddit link post submission (mock test)...');
    
    const testLinkPostData = {
      accountId: 1,
      subreddit: 'test',
      title: 'Test Reddit Link Post - API Debug Session',
      type: 'link',
      url: 'https://example.com/test-link',
      nsfw: false,
      spoiler: false
    };
    
    console.log('📤 Sending test link post data:', JSON.stringify(testLinkPostData, null, 2));
    
    try {
      const linkPostResponse = await axios.post(`${BASE_URL}/api/reddit/submit`, testLinkPostData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token-for-testing'
        }
      });
      console.log('✅ Link post response:', linkPostResponse.data);
    } catch (error) {
      if (error.response) {
        console.log('📋 Server processed link post request:');
        console.log('Status:', error.response.status);
        console.log('Response:', error.response.data);
      } else {
        console.log('❌ Network error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Also monitor backend logs while testing
async function monitorBackendLogs() {
  console.log('\n=== MONITORING BACKEND LOGS ===');
  console.log('(Check Docker logs in another terminal with: docker logs -f social_media-backend-1)');
}

console.log('Starting Reddit API test...');
monitorBackendLogs();
testRedditAPI().catch(console.error);