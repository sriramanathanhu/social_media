const crypto = require('crypto');

async function cleanupDuplicateRules() {
  console.log('🧹 Cleaning up duplicate Nimble rules...');
  
  const nimbleHost = '37.27.201.26';
  const nimblePort = 8082;
  const nimbleToken = 'NmB7K9mX2vQ8pL4wR6tY1zE5nA3cS0uI9fH8jG2bV7xM4qW6eD1rT5yU3oP9kL2sA8cV0nB6mX4wQ7pR1tY5zE';
  
  try {
    // Get current rules
    const salt = Math.floor(Math.random() * 1000000);
    const str2hash = `${salt}/${nimbleToken}`;
    const md5hash = crypto.createHash('md5').update(str2hash).digest();
    const base64hash = Buffer.from(md5hash).toString('base64');
    
    const listUrl = `http://${nimbleHost}:${nimblePort}/manage/rtmp/republish?salt=${salt}&hash=${base64hash}`;
    const response = await fetch(listUrl);
    const data = await response.json();
    
    const rules = data.rules || [];
    console.log(`Found ${rules.length} total rules`);
    
    // Group Facebook rules by destination_stream
    const facebookRules = rules.filter(rule => rule.dest_addr.includes('facebook'));
    const facebookGroups = {};
    
    facebookRules.forEach(rule => {
      const key = rule.dest_stream;
      if (!facebookGroups[key]) {
        facebookGroups[key] = [];
      }
      facebookGroups[key].push(rule);
    });
    
    // Find duplicates and keep only the first one
    for (const [streamKey, groupRules] of Object.entries(facebookGroups)) {
      if (groupRules.length > 1) {
        console.log(`\nFound ${groupRules.length} duplicate Facebook rules for stream: ${streamKey}`);
        
        // Keep the first rule, delete the rest
        for (let i = 1; i < groupRules.length; i++) {
          const ruleToDelete = groupRules[i];
          console.log(`Deleting duplicate rule: ${ruleToDelete.id}`);
          
          // Delete the duplicate rule
          const deleteSalt = Math.floor(Math.random() * 1000000);
          const deleteStr2hash = `${deleteSalt}/${nimbleToken}`;
          const deleteMd5hash = crypto.createHash('md5').update(deleteStr2hash).digest();
          const deleteBase64hash = Buffer.from(deleteMd5hash).toString('base64');
          
          const deleteUrl = `http://${nimbleHost}:${nimblePort}/manage/rtmp/republish?salt=${deleteSalt}&hash=${deleteBase64hash}&id=${ruleToDelete.id}`;
          
          try {
            const deleteResponse = await fetch(deleteUrl, { method: 'DELETE' });
            const deleteResult = await deleteResponse.json();
            
            if (deleteResult.status === 'success') {
              console.log(`✅ Successfully deleted duplicate rule ${ruleToDelete.id}`);
            } else {
              console.log(`❌ Failed to delete rule ${ruleToDelete.id}:`, deleteResult);
            }
          } catch (error) {
            console.log(`❌ Error deleting rule ${ruleToDelete.id}:`, error.message);
          }
        }
      }
    }
    
    // Show final rule count
    console.log('\n📊 Final status:');
    const finalResponse = await fetch(listUrl);
    const finalData = await finalResponse.json();
    const finalRules = finalData.rules || [];
    
    console.log(`Total rules after cleanup: ${finalRules.length}`);
    finalRules.forEach((rule, index) => {
      const platform = rule.dest_addr.includes('youtube') ? 'YouTube' : 
                      rule.dest_addr.includes('facebook') ? 'Facebook' : 'Other';
      console.log(`${index + 1}. ${platform}: ${rule.dest_stream}`);
    });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  }
}

cleanupDuplicateRules();