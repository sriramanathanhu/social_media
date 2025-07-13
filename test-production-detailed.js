const { chromium } = require('playwright');

async function testProductionDetailed() {
  console.log('🔍 Detailed production login test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  // Capture all console messages with more detail
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const location = msg.location();
    console.log(`🔍 Console [${type.toUpperCase()}]: ${text} (${location.url}:${location.lineNumber})`);
  });
  
  // Capture network requests with full details
  page.on('request', request => {
    const url = request.url();
    if (url.includes('api') || url.includes('socialmedia') || url.includes('.js') || url.includes('.css')) {
      console.log('📤 Request:', request.method(), url);
    }
  });
  
  // Capture network responses with details
  page.on('response', response => {
    const url = response.url();
    if (url.includes('api') || url.includes('socialmedia') || url.includes('.js') || url.includes('.css')) {
      console.log('📥 Response:', response.status(), url);
      if (!response.ok()) {
        console.log(`❌ Failed: ${response.status()} ${response.statusText()}`);
      }
    }
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    console.log('❌ Page error:', error.message);
    console.log('   Stack:', error.stack);
  });
  
  // Capture failed requests
  page.on('requestfailed', request => {
    console.log('❌ Request failed:', request.url());
    console.log('   Error:', request.failure().errorText);
  });
  
  try {
    console.log('📱 Navigating to production site...');
    await page.goto('https://sriramanathanhu.github.io/social_media', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Page navigation completed');
    
    // Wait a bit for all resources to load
    await page.waitForTimeout(3000);
    
    // Check if login form exists
    const emailInput = page.locator('input[type="email"]');
    const emailExists = await emailInput.count() > 0;
    console.log('📧 Email input exists:', emailExists);
    
    if (emailExists) {
      console.log('📝 Filling login credentials...');
      await emailInput.fill('sri.ramanatha@uskfoundation.or.ke');
      
      const passwordInput = page.locator('input[type="password"]');
      await passwordInput.fill('Swamiji@1234');
      
      console.log('🔐 Clicking sign in button...');
      const signInButton = page.locator('button:has-text("SIGN IN")');
      await signInButton.click();
      
      // Wait and capture what happens
      console.log('⏳ Waiting for login response...');
      await page.waitForTimeout(5000);
      
      // Check for any error dialogs or messages
      const errorMessages = await page.locator('text=Network error, text=Unable to connect, text=error, .error, .alert').allTextContents();
      if (errorMessages.length > 0) {
        console.log('🚨 Error messages found:', errorMessages);
      }
      
      // Check current URL
      const currentUrl = page.url();
      console.log('🌐 Current URL after login:', currentUrl);
      
      // Test the actual API call from browser console
      console.log('🔧 Testing API call directly...');
      const apiResult = await page.evaluate(async () => {
        try {
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
      
      console.log('🖥️ API Test Result:', JSON.stringify(apiResult, null, 2));
      
    } else {
      console.log('❌ Login form not found');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'production-detailed-result.png' });
    console.log('📸 Final screenshot saved');
    
    console.log('🔍 Browser staying open for inspection...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'production-detailed-error.png' });
  } finally {
    await browser.close();
  }
}

testProductionDetailed();