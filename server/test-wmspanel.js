require('dotenv').config();
const wmsPanelService = require('./src/services/wmsPanelService');

async function testWMSPanel() {
  try {
    console.log('Testing WMSPanel connection...');
    
    // Test connection
    const connectionTest = await wmsPanelService.testConnection();
    console.log('Connection test result:', connectionTest);
    
    if (connectionTest.success) {
      console.log('WMSPanel API is working!');
      
      // Try to add a republishing rule for the test stream
      console.log('Adding republishing rule for test_stream -> YouTube...');
      
      try {
        await wmsPanelService.addRepublishingRule(
          'live',              // sourceApp
          'test_stream',       // sourceStream
          'a.rtmp.youtube.com', // destURL
          1935,                // destPort
          'live2',             // destApp
          '5b4w-rb4a-mrae-ddpq-ewus' // destStream (your YouTube key)
        );
        console.log('Republishing rule added successfully!');
      } catch (ruleError) {
        console.error('Failed to add republishing rule:', ruleError);
      }
      
      // Try to get current rules
      try {
        const rules = await wmsPanelService.getRepublishingRules();
        console.log('Current republishing rules:', rules);
      } catch (rulesError) {
        console.error('Failed to get republishing rules:', rulesError);
      }
      
    } else {
      console.error('WMSPanel connection failed');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testWMSPanel();