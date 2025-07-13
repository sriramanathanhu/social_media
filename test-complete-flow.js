const { chromium } = require('playwright');

async function testCompleteFlow() {
  console.log('🔍 Testing complete application flow');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the application
    console.log('📱 Navigating to application...');
    await page.goto('http://localhost:3000/social_media', { waitUntil: 'networkidle' });
    
    // Check if we're on login page
    const loginTitle = await page.textContent('h3, h4, h5').catch(() => '');
    console.log('📄 Login page detected:', loginTitle.includes('Social Media Scheduler'));
    
    // Create account or login (try signup first)
    console.log('🔐 Attempting to create test account...');
    
    // Click "Don't have an account? Sign up"
    const signupLink = page.locator('text=Don\'t have an account? Sign up');
    const signupExists = await signupLink.count() > 0;
    
    if (signupExists) {
      await signupLink.click();
      await page.waitForTimeout(1000);
      
      // Fill signup form
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'testpassword123');
      
      // Click sign up button
      await page.click('button:has-text("SIGN UP")');
      await page.waitForTimeout(2000);
    } else {
      // Try to login with existing credentials
      console.log('🔑 Trying to login...');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'testpassword123');
      await page.click('button:has-text("SIGN IN")');
      await page.waitForTimeout(3000);
    }
    
    // Check if we're now on the dashboard
    const currentUrl = page.url();
    console.log('🌐 Current URL after login:', currentUrl);
    
    // Take screenshot after login
    await page.screenshot({ path: 'after-login.png' });
    console.log('📸 After login screenshot saved');
    
    // Look for navigation menu
    const navItems = await page.locator('nav a, .nav-link, [role="menuitem"]').count();
    console.log('🧭 Navigation items found:', navItems);
    
    // Look for Live or Streaming link
    const liveButtons = await page.locator('text=Live, text=Streaming, text=Stream, [href*="live"]').count();
    console.log('🔴 Live streaming buttons found:', liveButtons);
    
    if (liveButtons > 0) {
      console.log('🎯 Clicking Live streaming...');
      await page.locator('text=Live, text=Streaming, text=Stream, [href*="live"]').first().click();
      await page.waitForTimeout(2000);
      
      // Test stream creation
      console.log('🎬 Testing stream creation...');
      const createStreamBtn = page.locator('text=Create Stream, text=New Stream, button:has-text("Create")');
      const createExists = await createStreamBtn.count() > 0;
      
      if (createExists) {
        await createStreamBtn.first().click();
        await page.waitForTimeout(1000);
        
        // Fill stream creation form if it appears
        const streamNameInput = page.locator('input[placeholder*="stream"], input[name*="title"], input[name*="name"]').first();
        const streamNameExists = await streamNameInput.count() > 0;
        
        if (streamNameExists) {
          await streamNameInput.fill('Test Stream from Playwright');
          console.log('✍️ Filled stream name');
          
          // Look for submit/create button
          const submitBtn = page.locator('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');
          const submitExists = await submitBtn.count() > 0;
          
          if (submitExists) {
            await submitBtn.first().click();
            await page.waitForTimeout(2000);
            console.log('✅ Stream creation attempted');
          }
        }
      }
      
      // Take screenshot of streaming page
      await page.screenshot({ path: 'streaming-page.png' });
      console.log('📸 Streaming page screenshot saved');
      
      // Look for OBS setup information
      const obsInfo = await page.locator('text=OBS, text=RTMP, text=Stream Key, text=37.27.201.26').count();
      console.log('📺 OBS/RTMP info elements found:', obsInfo);
      
      // Look for stream management elements
      const streamElements = await page.locator('text=Delete, text=Settings, text=Edit, button:has-text("Settings")').count();
      console.log('⚙️ Stream management elements found:', streamElements);
    }
    
    console.log('✅ Complete flow test finished successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('📸 Error screenshot saved');
  } finally {
    // Keep browser open for manual inspection
    console.log('🔍 Browser kept open for manual inspection. Close manually when done.');
    // await browser.close();
  }
}

testCompleteFlow();