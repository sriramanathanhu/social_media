const nimbleService = require('./server/src/services/nimbleApiService');

async function cleanupDuplicates() {
  console.log('🧹 Cleaning up duplicate Facebook rules...');
  
  try {
    
    // Get all current rules
    const rulesData = await nimbleService.getRepublishingRules();
    const rules = rulesData.rules || [];
    
    console.log(`📋 Found ${rules.length} total rules`);
    
    // Group Facebook rules by destination stream
    const facebookRules = rules.filter(rule => rule.dest_addr.includes('facebook'));
    const facebookGroups = {};
    
    facebookRules.forEach(rule => {
      const key = rule.dest_stream;
      if (!facebookGroups[key]) {
        facebookGroups[key] = [];
      }
      facebookGroups[key].push(rule);
    });
    
    console.log(`📘 Found ${facebookRules.length} Facebook rules`);
    
    // Find and delete duplicates
    for (const [streamKey, groupRules] of Object.entries(facebookGroups)) {
      if (groupRules.length > 1) {
        console.log(`\n🔍 Found ${groupRules.length} duplicate rules for: ${streamKey}`);
        
        // Keep the first rule, delete the rest
        for (let i = 1; i < groupRules.length; i++) {
          const ruleToDelete = groupRules[i];
          console.log(`🗑️  Deleting duplicate rule ID: ${ruleToDelete.id}`);
          
          try {
            await nimbleService.deleteRepublishingRule(ruleToDelete.id);
            console.log(`✅ Successfully deleted rule ${ruleToDelete.id}`);
          } catch (error) {
            console.log(`❌ Failed to delete rule ${ruleToDelete.id}:`, error.message);
          }
        }
      }
    }
    
    // Show final state
    console.log('\n📊 Final status:');
    const finalRulesData = await nimbleService.getRepublishingRules();
    const finalRules = finalRulesData.rules || [];
    
    console.log(`Total rules after cleanup: ${finalRules.length}`);
    finalRules.forEach((rule, index) => {
      const platform = rule.dest_addr.includes('youtube') ? 'YouTube' : 
                      rule.dest_addr.includes('facebook') ? 'Facebook' : 'Other';
      console.log(`${index + 1}. ${platform}: ${rule.dest_stream}`);
    });
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanupDuplicates();