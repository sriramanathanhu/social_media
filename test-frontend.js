const { chromium } = require('playwright');

async function testFrontend() {
  console.log('🔍 Testing frontend at http://localhost:3000/social_media');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the application
    console.log('📱 Navigating to application...');
    await page.goto('http://localhost:3000/social_media', { waitUntil: 'networkidle' });
    
    // Take screenshot
    await page.screenshot({ path: 'frontend-test.png' });
    console.log('📸 Screenshot saved as frontend-test.png');
    
    // Check if we're on login page or dashboard
    const pageTitle = await page.textContent('title').catch(() => 'No title');
    console.log('📄 Page title:', pageTitle);
    
    // Look for navigation elements
    const navElements = await page.locator('nav, .nav, [role="navigation"]').count();
    console.log('🧭 Navigation elements found:', navElements);
    
    // Check for Live Streaming link/button
    const liveButton = page.locator('text=Live').first();
    const liveExists = await liveButton.count() > 0;
    console.log('🔴 Live streaming button found:', liveExists);
    
    if (liveExists) {
      console.log('🎯 Clicking Live streaming...');
      await liveButton.click();
      await page.waitForTimeout(2000);
      
      // Check if we're on the live page
      const currentUrl = page.url();
      console.log('🌐 Current URL:', currentUrl);
      
      // Look for stream creation elements
      const streamElements = await page.locator('text=Create Stream, text=OBS Setup, text=Stream Key').count();
      console.log('🎬 Stream-related elements found:', streamElements);
      
      // Take screenshot of live page
      await page.screenshot({ path: 'live-page-test.png' });
      console.log('📸 Live page screenshot saved');
    }
    
    // Check for any JavaScript errors in console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console error:', msg.text());
      }
    });
    
    console.log('✅ Frontend test completed successfully');
    
  } catch (error) {
    console.error('❌ Frontend test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testFrontend();