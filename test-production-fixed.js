const { chromium } = require('playwright');

async function testProductionFixed() {
  console.log('🔍 Fixed production test with correct selectors...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    console.log(`🔍 Console [${msg.type().toUpperCase()}]:`, msg.text());
  });
  
  // Capture network issues
  page.on('requestfailed', request => {
    console.log('❌ Request failed:', request.url(), request.failure().errorText);
  });
  
  // Capture API requests specifically
  page.on('request', request => {
    if (request.url().includes('socialmedia-p3ln.onrender.com')) {
      console.log('📤 API Request:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('socialmedia-p3ln.onrender.com')) {
      console.log('📥 API Response:', response.status(), response.url());
    }
  });
  
  try {
    console.log('📱 Navigating to production site...');
    await page.goto('https://sriramanathanhu.github.io/social_media', { 
      waitUntil: 'networkidle' 
    });
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    console.log('📧 Filling email field...');
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('sri.ramanatha@uskfoundation.or.ke');
    console.log('✅ Email filled');
    
    console.log('🔐 Filling password field...');
    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.fill('Swamiji@1234');
    console.log('✅ Password filled');
    
    console.log('🔐 Looking for sign in button...');
    
    // Get all buttons and their text
    const buttons = await page.$$eval('button', buttons => 
      buttons.map(btn => ({
        text: btn.textContent?.trim(),
        className: btn.className,
        type: btn.type,
        disabled: btn.disabled
      }))
    );
    console.log('📋 Found buttons:', buttons);
    
    console.log('🔐 Clicking sign in button...');
    const signInButton = page.locator('button', { hasText: 'SIGN IN' });
    await signInButton.click();
    
    console.log('⏳ Waiting for login response...');
    await page.waitForTimeout(10000);
    
    // Check URL change
    const currentUrl = page.url();
    console.log('🌐 Current URL after login:', currentUrl);
    
    // Check for error messages in the DOM
    const errorElements = await page.locator('text=Network error, text=Unable to connect, .error, .alert, [role="alert"]').allTextContents();
    if (errorElements.length > 0) {
      console.log('🚨 Error messages found:', errorElements);
    }
    
    // Check page content for errors
    const pageText = await page.textContent('body');
    const hasNetworkError = pageText.includes('Network error') || pageText.includes('Unable to connect');
    console.log('🚨 Page contains network error:', hasNetworkError);
    
    // Test API call directly from browser
    console.log('🔧 Testing direct API call...');
    const apiResult = await page.evaluate(async () => {
      try {
        console.log('Making direct API call...');
        
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
        
        const text = await response.text();
        
        return {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          body: text,
          headers: Object.fromEntries(response.headers.entries())
        };
      } catch (error) {
        return {
          error: error.message,
          name: error.name,
          stack: error.stack
        };
      }
    });
    
    console.log('🖥️ Direct API Test Result:');
    console.log(JSON.stringify(apiResult, null, 2));
    
    // If API call works, the issue is in the frontend code
    if (apiResult.status === 200 || apiResult.status === 400) {
      console.log('✅ API is responding - issue is in frontend JavaScript');
    } else if (apiResult.error) {
      console.log('❌ API call failed - network connectivity issue');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'production-fixed-result.png' });
    console.log('📸 Screenshot saved');
    
    console.log('🔍 Browser staying open - manually test the login to see exact error');
    await page.waitForTimeout(120000); // 2 minutes
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'production-fixed-error.png' });
  } finally {
    await browser.close();
  }
}

testProductionFixed();