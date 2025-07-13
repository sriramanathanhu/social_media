require('dotenv').config();
const nimbleApiService = require('./src/services/nimbleApiService');

async function testNimbleDirect() {
  try {
    console.log('Testing direct Nimble API connection...');
    
    // Test connection
    const connectionTest = await nimbleApiService.testConnection();
    console.log('Connection test result:', connectionTest);
    
    if (connectionTest.success) {
      console.log('✅ Nimble API is working!');
      
      // Try to create a test republishing rule for your stream
      console.log('\nCreating test republishing rule...');
      
      try {
        const ruleResult = await nimbleApiService.addYouTubeRepublishing(
          'live',              // sourceApp
          'test_stream',       // sourceStream (your OBS key)
          '5b4w-rb4a-mrae-ddpq-ewus' // YouTube stream key
        );
        
        console.log('✅ Republishing rule created successfully!');
        console.log('Rule details:', ruleResult);
        
        // Get all rules to verify
        console.log('\nFetching all republishing rules...');
        const allRules = await nimbleApiService.getRepublishingRules();
        console.log('Current rules:', allRules);
        
      } catch (ruleError) {
        console.error('❌ Failed to create republishing rule:', ruleError.message);
      }
      
    } else {
      console.error('❌ Nimble API connection failed:', connectionTest.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNimbleDirect();