const { chromium } = require('playwright');

async function testLoginFinal() {
  console.log('🔍 Final login test - both servers running properly...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📱 Navigating to http://localhost:3002/social_media');
    await page.goto('http://localhost:3002/social_media', { waitUntil: 'networkidle' });
    
    // Try the admin account that was just used
    console.log('🔑 Testing admin login...');
    
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    
    await page.click('button:has-text("SIGN IN")');
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('🌐 URL after admin login:', currentUrl);
    
    if (currentUrl.includes('dashboard') || !currentUrl.includes('social_media')) {
      console.log('✅ Login successful! Checking for live streaming...');
      
      // Look for Live streaming navigation
      const liveLink = page.locator('text=Live, [href*="live"], a:has-text("Stream")');
      const liveExists = await liveLink.count() > 0;
      
      if (liveExists) {
        console.log('🎯 Clicking Live streaming...');
        await liveLink.first().click();
        await page.waitForTimeout(2000);
        
        console.log('🌐 Current URL:', page.url());
        
        // Check for streaming elements
        const streamElements = await page.locator('text=Create Stream, text=OBS Setup, text=Stream Key, text=RTMP').count();
        console.log('🎬 Streaming elements found:', streamElements);
        
        // Take screenshot of live page
        await page.screenshot({ path: 'live-streaming-working.png' });
        console.log('📸 Live streaming screenshot saved');
      }
    } else {
      console.log('❌ Still on login page, trying registration...');
      
      // Try registering a new account
      await page.fill('input[type="email"]', 'test@playwright.com');
      await page.fill('input[type="password"]', 'testpass123');
      
      await page.click('button:has-text("CREATE ACCOUNT")');
      await page.waitForTimeout(3000);
      
      console.log('🌐 URL after registration:', page.url());
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'final-test-result.png' });
    console.log('📸 Final screenshot saved');
    
    console.log('✅ Test completed - browser staying open for inspection');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'final-test-error.png' });
  } finally {
    await browser.close();
  }
}

testLoginFinal();