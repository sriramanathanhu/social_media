const { chromium } = require('playwright');

async function testFixedLogin() {
  console.log('🔍 Testing login with fixed API configuration...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  // Listen for network requests and responses
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
  
  try {
    // Navigate to the fixed URL
    console.log('📱 Navigating to http://localhost:3002/social_media');
    await page.goto('http://localhost:3002/social_media', { waitUntil: 'networkidle' });
    
    // Test API connectivity
    console.log('🔧 Testing API connectivity...');
    const apiTest = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@test.com', password: 'test123' })
        });
        return { status: response.status, url: response.url };
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('🖥️ API connectivity test:', apiTest);
    
    // Try to register first
    console.log('📝 Registering test account...');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpass123');
    
    // Click CREATE ACCOUNT
    await page.click('button:has-text("CREATE ACCOUNT")');
    
    // Wait and check for response
    await page.waitForTimeout(3000);
    
    // Check if successful or if we need to login
    const currentUrl = page.url();
    console.log('🌐 URL after registration:', currentUrl);
    
    // Take screenshot
    await page.screenshot({ path: 'after-registration.png' });
    console.log('📸 Screenshot saved');
    
    // If still on same page, try login
    if (currentUrl.includes('social_media') && !currentUrl.includes('dashboard')) {
      console.log('🔑 Trying login...');
      
      // Click "Already have an account? Sign in"
      const signinLink = page.locator('text=Already have an account? Sign in');
      const signinExists = await signinLink.count() > 0;
      
      if (signinExists) {
        await signinLink.click();
        await page.waitForTimeout(1000);
      }
      
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'testpass123');
      await page.click('button:has-text("SIGN IN")');
      
      await page.waitForTimeout(3000);
    }
    
    // Final check
    const finalUrl = page.url();
    console.log('🌐 Final URL:', finalUrl);
    
    // Take final screenshot
    await page.screenshot({ path: 'final-login-test.png' });
    console.log('📸 Final screenshot saved');
    
    // Keep browser open for manual testing
    console.log('🔍 Browser staying open for manual testing...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'login-error-fixed.png' });
  } finally {
    await browser.close();
  }
}

testFixedLogin();