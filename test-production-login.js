const { chromium } = require('playwright');

async function testProductionLogin() {
  console.log('🔍 Testing production login with real credentials...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  // Capture all console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`🔍 Console [${type.toUpperCase()}]:`, text);
  });
  
  // Capture network requests
  page.on('request', request => {
    if (request.url().includes('api') || request.url().includes('socialmedia')) {
      console.log('📤 Request:', request.method(), request.url());
    }
  });
  
  // Capture network responses
  page.on('response', response => {
    if (response.url().includes('api') || response.url().includes('socialmedia')) {
      console.log('📥 Response:', response.status(), response.url());
      if (!response.ok()) {
        console.log('❌ Failed response headers:', response.headers());
      }
    }
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    console.log('❌ Page error:', error.message);
  });
  
  // Capture failed requests
  page.on('requestfailed', request => {
    console.log('❌ Request failed:', request.url(), request.failure().errorText);
  });
  
  try {
    console.log('📱 Navigating to production site...');
    await page.goto('https://sriramanathanhu.github.io/social_media', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded successfully');
    
    // Take initial screenshot
    await page.screenshot({ path: 'production-login-start.png' });
    console.log('📸 Initial screenshot saved');
    
    // Wait for login form to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    console.log('✅ Login form detected');
    
    // Check if we need to click sign in link first
    const signInLink = page.locator('text=Already have an account? Sign in');
    const signInExists = await signInLink.count() > 0;
    
    if (signInExists) {
      console.log('🔗 Clicking "Sign in" link...');
      await signInLink.click();
      await page.waitForTimeout(1000);
    }
    
    console.log('📝 Filling login credentials...');
    await page.fill('input[type="email"]', 'sri.ramanatha@uskfoundation.or.ke');
    await page.fill('input[type="password"]', 'Swamiji@1234');
    
    console.log('🔐 Submitting login form...');
    await page.click('button:has-text("SIGN IN")');
    
    // Wait for response and capture any errors
    console.log('⏳ Waiting for login response...');
    await page.waitForTimeout(5000);
    
    // Check for error messages
    const errorElements = await page.locator('.error, .alert, [class*="error"], [class*="alert"], text=Network error').count();
    if (errorElements > 0) {
      const errorText = await page.locator('.error, .alert, [class*="error"], [class*="alert"], text=Network error').first().textContent();
      console.log('🚨 Error message found:', errorText);
    }
    
    // Check current URL
    const currentUrl = page.url();
    console.log('🌐 Current URL after login attempt:', currentUrl);
    
    // Take screenshot after login attempt
    await page.screenshot({ path: 'production-login-result.png' });
    console.log('📸 Login result screenshot saved');
    
    // Check for any network errors in console
    const logs = await page.evaluate(() => {
      return {
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
        cookies: document.cookie
      };
    });
    console.log('💾 Browser storage:', logs);
    
    // Test API connectivity directly from browser
    console.log('🔧 Testing API connectivity from browser...');
    const apiTest = await page.evaluate(async () => {
      try {
        console.log('Testing API with fetch...');
        const response = await fetch('https://socialmedia-p3ln.onrender.com/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: 'sri.ramanatha@uskfoundation.or.ke',
            password: 'Swamiji@1234'
          })
        });
        
        const responseText = await response.text();
        console.log('API Response:', response.status, responseText);
        
        return {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText
        };
      } catch (error) {
        console.error('API Test Error:', error);
        return { error: error.message };
      }
    });
    
    console.log('🖥️ Direct API test result:', JSON.stringify(apiTest, null, 2));
    
    console.log('🔍 Browser staying open for manual inspection...');
    await page.waitForTimeout(60000); // Keep open for 1 minute
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'production-login-error.png' });
  } finally {
    await browser.close();
  }
}

testProductionLogin();