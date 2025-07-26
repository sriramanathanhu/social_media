const axios = require('axios');

// Test script to verify Reddit API submission
async function testRedditSubmission() {
  try {
    console.log('Testing Reddit API submission...');
    
    // Simulate a frontend request to our backend
    const testPostData = {
      accountId: 33, // Replace with actual account ID
      subreddit: 'AskNithyanandaAI',
      title: 'Test Post - Debug Content Issue',
      content: 'This is a test post to debug the content submission issue. This text should appear in the Reddit post body.',
      type: 'text',
      nsfw: false,
      spoiler: false
    };
    
    console.log('Sending test data:', JSON.stringify(testPostData, null, 2));
    
    const response = await axios.post('http://localhost:5000/api/reddit/post', testPostData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Only run if executed directly
if (require.main === module) {
  testRedditSubmission();
}

module.exports = { testRedditSubmission };