const { chromium } = require('playwright');

async function openBrowser() {
  console.log('🌐 Opening browser for manual testing...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Navigate to the application
  await page.goto('http://localhost:3000/social_media');
  
  console.log('✅ Browser opened at http://localhost:3000/social_media');
  console.log('🔍 You can now manually test the application');
  console.log('📝 Check the streaming functionality, create accounts, test OBS setup');
  console.log('⚠️  Browser will stay open for manual testing');
  
  // Keep the browser open
  await page.waitForTimeout(300000); // 5 minutes
}

openBrowser().catch(console.error);