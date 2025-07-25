const { chromium } = require('playwright');

async function testLogin() {
  console.log('Testing login with better error handling...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Enable request/response logging
  page.on('request', request => {
    console.log('REQUEST:', request.method(), request.url());
  });
  
  page.on('response', response => {
    console.log('RESPONSE:', response.status(), response.url());
  });
  
  page.on('console', msg => {
    console.log('BROWSER LOG:', msg.text());
  });
  
  try {
    console.log('Navigating to frontend...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('Current URL:', page.url());
    
    // Check if we can see the login form
    const emailInput = await page.locator('input[type="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    
    console.log('Email input present:', await emailInput.count() > 0);
    console.log('Password input present:', await passwordInput.count() > 0);
    
    if (await emailInput.count() > 0) {
      console.log('Filling login form...');
      await emailInput.fill('sri.ramanatha@uskfoundation.or.ke');
      await passwordInput.fill('Swamiji@1234');
      
      console.log('Clicking sign in button...');
      const signInButton = await page.locator('button:has-text("SIGN IN")').first();
      await signInButton.click();
      
      // Wait a bit for the request to complete
      await page.waitForTimeout(5000);
      
      console.log('Final URL:', page.url());
      
      // Check for any error messages
      const errorAlert = await page.locator('.MuiAlert-root, .error, [role="alert"]').first();
      if (await errorAlert.count() > 0) {
        const errorText = await errorAlert.textContent();
        console.log('Error message:', errorText);
      }
    }
    
    // Take a final screenshot
    await page.screenshot({ path: '/root/social_media/test-results/login-debug.png', fullPage: true });
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: '/root/social_media/test-results/login-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testLogin().catch(console.error);