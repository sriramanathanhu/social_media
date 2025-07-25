const nimbleService = require('./server/src/services/nimbleApiService');

async function updateFacebookPort() {
  console.log('🔧 Updating Facebook republishing rule to use port 443...');
  
  try {
    // Get current rules
    const rulesData = await nimbleService.getRepublishingRules();
    const rules = rulesData.rules || [];
    
    // Find Facebook rule
    const facebookRule = rules.find(rule => rule.dest_addr.includes('facebook'));
    
    if (!facebookRule) {
      console.log('❌ No Facebook rule found');
      return;
    }
    
    console.log(`📘 Found Facebook rule: ID ${facebookRule.id}, Port ${facebookRule.dest_port}`);
    
    if (facebookRule.dest_port === 443) {
      console.log('✅ Facebook rule already uses port 443');
      return;
    }
    
    // Delete old rule
    console.log(`🗑️  Deleting old Facebook rule (port ${facebookRule.dest_port})...`);
    await nimbleService.deleteRepublishingRule(facebookRule.id);
    
    // Create new rule with port 443
    console.log('➕ Creating new Facebook rule with port 443...');
    const newRule = await nimbleService.createRepublishingRule({
      sourceApp: facebookRule.src_app,
      sourceStream: facebookRule.src_stream,
      destinationUrl: 'live-api-s.facebook.com',
      destinationPort: 443,
      destinationApp: 'rtmp',
      destinationStream: facebookRule.dest_stream
    });
    
    console.log('✅ Facebook rule updated successfully');
    console.log(`   New rule ID: ${newRule.id || 'Unknown'}`);
    console.log(`   Configuration: live-api-s.facebook.com:443/rtmp/${facebookRule.dest_stream}`);
    
    // Verify the change
    const updatedRulesData = await nimbleService.getRepublishingRules();
    const updatedRules = updatedRulesData.rules || [];
    const updatedFacebookRule = updatedRules.find(rule => rule.dest_addr.includes('facebook'));
    
    if (updatedFacebookRule && updatedFacebookRule.dest_port === 443) {
      console.log('🎯 Verification successful: Facebook now uses port 443');
    } else {
      console.log('❌ Verification failed: Port may not have been updated');
    }
    
  } catch (error) {
    console.error('❌ Failed to update Facebook port:', error.message);
  }
}

updateFacebookPort();