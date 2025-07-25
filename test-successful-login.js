const { chromium } = require('playwright');

async function testSuccessfulLogin() {
  console.log('Testing login with Material-UI selectors...');
  
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
    if (request.url().includes('/api/')) {
      console.log('API REQUEST:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('API RESPONSE:', response.status(), response.url());
    }
  });
  
  page.on('console', msg => {
    if (msg.text().includes('API') || msg.text().includes('Error') || msg.text().includes('error')) {
      console.log('BROWSER LOG:', msg.text());
    }
  });
  
  try {
    console.log('Navigating to frontend...');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    console.log('Current URL:', page.url());
    
    // Wait for the page to fully load and check for login form
    await page.waitForSelector('input', { timeout: 10000 });
    
    console.log('Looking for login inputs...');
    
    // Try different selectors for the email field
    const emailSelectors = [
      'input[placeholder*="Email" i]',
      'input[name="email"]',
      'input[type="email"]',
      'input:first-of-type'
    ];
    
    let emailInput = null;
    for (const selector of emailSelectors) {
      const element = await page.locator(selector).first();
      if (await element.count() > 0) {
        emailInput = element;
        console.log('Found email input with selector:', selector);
        break;
      }
    }
    
    const passwordInput = await page.locator('input[type="password"]').first();
    
    console.log('Email input found:', emailInput !== null);
    console.log('Password input found:', await passwordInput.count() > 0);
    
    if (emailInput) {
      console.log('Filling login form...');
      
      // Clear and fill email
      await emailInput.click();
      await emailInput.fill('');
      await emailInput.fill('sri.ramanatha@uskfoundation.or.ke');
      
      // Clear and fill password
      await passwordInput.click();
      await passwordInput.fill('');
      await passwordInput.fill('Swamiji@1234');
      
      // Take screenshot before submitting
      await page.screenshot({ path: '/root/social_media/test-results/before-submit.png', fullPage: true });
      
      console.log('Clicking sign in button...');
      const signInButton = await page.locator('button:has-text("SIGN IN")').first();
      await signInButton.click();
      
      console.log('Waiting for response...');
      // Wait for either navigation or error message
      try {
        await page.waitForFunction(
          () => window.location.hash !== '#/login' || 
                document.querySelector('.MuiAlert-root') !== null,
          { timeout: 10000 }
        );
      } catch (e) {
        console.log('Timeout waiting for login response');
      }
      
      await page.waitForTimeout(2000); // Additional wait
      
      console.log('Final URL:', page.url());
      
      // Check for error messages
      const errorAlert = await page.locator('.MuiAlert-root').first();
      if (await errorAlert.count() > 0) {
        const errorText = await errorAlert.textContent();
        console.log('Error message found:', errorText);
      }
      
      // Check if login was successful
      const isLoginPage = page.url().includes('#/login');
      console.log('Still on login page:', isLoginPage);
      console.log('Login successful:', !isLoginPage);
      
      // Take final screenshot
      await page.screenshot({ path: '/root/social_media/test-results/after-submit.png', fullPage: true });
      
      if (!isLoginPage) {
        console.log('SUCCESS: Login appears to have worked!');
        
        // Try to navigate to different sections to test the app
        console.log('\n=== Testing App Navigation ===');
        
        // Test dashboard
        await page.goto('http://localhost:3001/#/dashboard');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: '/root/social_media/test-results/dashboard-logged-in.png', fullPage: true });
        
        // Test accounts page
        await page.goto('http://localhost:3001/#/accounts');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: '/root/social_media/test-results/accounts-logged-in.png', fullPage: true });
        
        // Check for platform connection options
        const facebookElements = await page.locator('text=Facebook').count();
        const instagramElements = await page.locator('text=Instagram').count();
        const connectButtons = await page.locator('button:has-text("Connect")').count();
        
        console.log('Facebook references found:', facebookElements);
        console.log('Instagram references found:', instagramElements);
        console.log('Connect buttons found:', connectButtons);
        
        // Test posts page
        await page.goto('http://localhost:3001/#/posts');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: '/root/social_media/test-results/posts-logged-in.png', fullPage: true });
        
        // Test live streaming page
        await page.goto('http://localhost:3001/#/live');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: '/root/social_media/test-results/live-logged-in.png', fullPage: true });
        
        // Check for streaming elements
        const streamElements = await page.locator('text=/stream|rtmp|app/i').count();
        console.log('Streaming-related elements found:', streamElements);
        
        return {
          loginSuccessful: true,
          facebookFound: facebookElements > 0,
          instagramFound: instagramElements > 0,
          connectButtons: connectButtons,
          streamElements: streamElements
        };
      } else {
        console.log('LOGIN FAILED: Still on login page');
        return {
          loginSuccessful: false,
          error: 'Login failed - still on login page'
        };
      }
    } else {
      console.log('LOGIN FAILED: Could not find email input');
      return {
        loginSuccessful: false,
        error: 'Could not find email input field'
      };
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: '/root/social_media/test-results/test-error.png', fullPage: true });
    return {
      loginSuccessful: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

// Run the test
testSuccessfulLogin().then(result => {
  console.log('\n=== FINAL TEST RESULTS ===');
  console.log('Login successful:', result.loginSuccessful);
  if (result.loginSuccessful) {
    console.log('Facebook integration visible:', result.facebookFound);
    console.log('Instagram integration visible:', result.instagramFound);
    console.log('Connect buttons found:', result.connectButtons);
    console.log('Streaming elements found:', result.streamElements);
  } else {
    console.log('Error:', result.error);
  }
}).catch(console.error);