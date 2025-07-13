const { chromium } = require('playwright');

async function openBrowserSimple() {
  console.log('🌐 Opening browser for manual testing...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: false 
  });
  
  const page = await browser.newPage();
  
  // Navigate to the application
  await page.goto('http://localhost:3002/social_media');
  
  console.log('✅ Browser opened at: http://localhost:3002/social_media');
  console.log('🔍 Frontend: http://localhost:3002/social_media');
  console.log('🔍 Backend:  http://localhost:3001');
  console.log('');
  console.log('📝 Test Instructions:');
  console.log('1. Try login with: admin@example.com / admin123');
  console.log('2. Or create new account with any email/password');
  console.log('3. Navigate to Live Streaming section');
  console.log('4. Test stream creation and OBS setup');
  console.log('5. Verify RTMP info shows: rtmp://37.27.201.26:1935/live');
  console.log('');
  console.log('⚠️  Browser will stay open for manual testing');
  console.log('📸 Screenshots will be saved automatically');
  
  // Take initial screenshot
  await page.screenshot({ path: 'manual-test-start.png' });
  
  // Keep browser open indefinitely for manual testing
  try {
    await page.waitForTimeout(600000); // 10 minutes
  } catch (error) {
    console.log('🔍 Manual testing session ended');
  }
}

openBrowserSimple().catch(console.error);