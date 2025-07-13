const { chromium } = require('playwright');

async function testLoginNetwork() {
  console.log('🔍 Testing login network issues...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  // Listen for network requests and responses
  page.on('request', request => {
    console.log('📤 Request:', request.method(), request.url());
  });
  
  page.on('response', response => {
    console.log('📥 Response:', response.status(), response.url());
  });
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console error:', msg.text());
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log('❌ Page error:', error.message);
  });
  
  try {
    // Navigate to the application
    console.log('📱 Navigating to application...');
    await page.goto('http://localhost:3000/social_media', { waitUntil: 'networkidle' });
    
    // Check if backend is accessible
    console.log('🔧 Testing backend connectivity...');
    const backendResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/auth/test');
        return { status: response.status, ok: response.ok };
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('🖥️ Backend test result:', backendResponse);
    
    // Try to create an account first
    console.log('📝 Creating test account...');
    
    // Fill signup form
    await page.fill('input[placeholder*="Email"], input[type="email"]', 'test@example.com');
    await page.fill('input[placeholder*="Password"], input[type="password"]', 'testpassword123');
    
    // Click create account
    await page.click('button:has-text("CREATE ACCOUNT")');
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Check for error messages
    const errorElements = await page.locator('.error, .alert, [class*="error"], [class*="alert"]').count();
    console.log('🚨 Error elements found:', errorElements);
    
    if (errorElements > 0) {
      const errorText = await page.locator('.error, .alert, [class*="error"], [class*="alert"]').first().textContent();
      console.log('🚨 Error message:', errorText);
    }
    
    // Check current URL
    const currentUrl = page.url();
    console.log('🌐 Current URL after signup:', currentUrl);
    
    // If still on login page, try login instead
    if (currentUrl.includes('social_media') && !currentUrl.includes('dashboard')) {
      console.log('🔑 Trying to login instead...');
      
      // Click "Already have an account? Sign in"
      const signinLink = page.locator('text=Already have an account? Sign in');
      const signinExists = await signinLink.count() > 0;
      
      if (signinExists) {
        await signinLink.click();
        await page.waitForTimeout(1000);
      }
      
      // Fill login form
      await page.fill('input[placeholder*="Email"], input[type="email"]', 'test@example.com');
      await page.fill('input[placeholder*="Password"], input[type="password"]', 'testpassword123');
      
      // Click sign in
      await page.click('button:has-text("SIGN IN")');
      await page.waitForTimeout(3000);
      
      // Check for errors again
      const loginErrorElements = await page.locator('.error, .alert, [class*="error"], [class*="alert"]').count();
      console.log('🚨 Login error elements found:', loginErrorElements);
      
      if (loginErrorElements > 0) {
        const loginErrorText = await page.locator('.error, .alert, [class*="error"], [class*="alert"]').first().textContent();
        console.log('🚨 Login error message:', loginErrorText);
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'login-test-result.png' });
    console.log('📸 Screenshot saved as login-test-result.png');
    
    // Check final URL
    const finalUrl = page.url();
    console.log('🌐 Final URL:', finalUrl);
    
    console.log('🔍 Browser will stay open for manual inspection');
    await page.waitForTimeout(60000); // Keep open for 1 minute
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'login-error.png' });
  } finally {
    await browser.close();
  }
}

testLoginNetwork();