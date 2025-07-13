const { chromium } = require('playwright');

async function testProductionFinal() {
  console.log('🔍 Final production test after API URL fix...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  // Capture API calls
  page.on('request', request => {
    if (request.url().includes('api')) {
      console.log('📤 API Request:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('api')) {
      console.log('📥 API Response:', response.status(), response.url());
    }
  });
  
  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('API') || msg.text().includes('Network')) {
      console.log(`🔍 Console [${msg.type().toUpperCase()}]:`, msg.text());
    }
  });
  
  try {
    console.log('📱 Navigating to production site...');
    await page.goto('https://sriramanathanhu.github.io/social_media', { 
      waitUntil: 'networkidle' 
    });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    console.log('📧 Filling email...');
    await page.fill('input[name="email"]', 'sri.ramanatha@uskfoundation.or.ke');
    
    console.log('🔐 Filling password...');
    await page.fill('input[name="password"]', 'Swamiji@1234');
    
    console.log('🔐 Clicking sign in...');
    await page.click('button:has-text("Sign In")');
    
    console.log('⏳ Waiting for login response...');
    await page.waitForTimeout(8000);
    
    // Check final URL
    const finalUrl = page.url();
    console.log('🌐 Final URL:', finalUrl);
    
    // Check for success indicators
    const isLoggedIn = finalUrl.includes('dashboard') || finalUrl.includes('live') || !finalUrl.includes('login');
    console.log('✅ Login successful:', isLoggedIn);
    
    // Check for error messages
    const hasError = await page.locator('text=Network error, text=Unable to connect').count() > 0;
    console.log('❌ Has error message:', hasError);
    
    // Take screenshot
    await page.screenshot({ path: 'production-final-test.png' });
    console.log('📸 Final test screenshot saved');
    
    if (isLoggedIn) {
      console.log('🎉 SUCCESS! Login is working!');
      
      // Navigate to live streaming
      const liveLink = page.locator('text=LIVE, a[href*="live"]');
      const liveExists = await liveLink.count() > 0;
      
      if (liveExists) {
        console.log('🎯 Navigating to Live Streaming...');
        await liveLink.first().click();
        await page.waitForTimeout(3000);
        
        const streamAppsLink = page.locator('text=Stream Apps, a[href*="stream-apps"]');
        const streamAppsExists = await streamAppsLink.count() > 0;
        console.log('📱 Stream Apps available:', streamAppsExists);
        
        await page.screenshot({ path: 'production-streaming-page.png' });
        console.log('📸 Streaming page screenshot saved');
      }
    } else {
      console.log('❌ Login failed, staying on login page');
    }
    
    console.log('🔍 Browser staying open for manual verification...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'production-final-error.png' });
  } finally {
    await browser.close();
  }
}

testProductionFinal();