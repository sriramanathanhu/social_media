const { chromium } = require('playwright');

async function runUITests() {
  console.log('Starting comprehensive UI tests...');
  
  // Launch browser with appropriate settings
  const browser = await chromium.launch({
    headless: true,   // Run in headless mode for server environment
    slowMo: 500,      // Slow down actions for stability
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  try {
    console.log('\n=== TEST 1: LOGIN TEST ===');
    
    // Navigate to the application
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Take initial screenshot
    await page.screenshot({ path: '/root/social_media/test-results/01-initial-page.png', fullPage: true });
    
    // Check if we're already logged in or need to login
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    if (currentUrl.includes('/login') || currentUrl === 'http://localhost:3000/') {
      console.log('Login required, filling credentials...');
      
      // Wait for login form
      await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email" i]', { timeout: 10000 });
      
      // Fill login form
      const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      await emailInput.fill('sri.ramanatha@uskfoundation.or.ke');
      
      const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
      await passwordInput.fill('Swamiji@1234');
      
      // Take screenshot before login
      await page.screenshot({ path: '/root/social_media/test-results/02-before-login.png', fullPage: true });
      
      // Click login button
      const loginButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
      await loginButton.click();
      
      // Wait for navigation after login
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await page.waitForTimeout(3000); // Additional wait for any redirects
      
      console.log('Login attempted, current URL:', page.url());
    } else {
      console.log('Already logged in or redirected');
    }
    
    // Take screenshot after login attempt
    await page.screenshot({ path: '/root/social_media/test-results/03-after-login.png', fullPage: true });
    
    // Check if login was successful
    const isLoggedIn = !page.url().includes('/login');
    console.log('Login successful:', isLoggedIn);
    
    if (!isLoggedIn) {
      console.log('Login may have failed, checking for error messages...');
      const errorElements = await page.locator('.error, .alert, [class*="error"], [class*="alert"]').all();
      for (const errorEl of errorElements) {
        const errorText = await errorEl.textContent();
        if (errorText && errorText.trim()) {
          console.log('Error message found:', errorText.trim());
        }
      }
    }
    
    console.log('\n=== TEST 2: DASHBOARD OVERVIEW ===');
    
    // Navigate to dashboard if not already there
    if (!page.url().includes('/dashboard') && !page.url().endsWith('/')) {
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('networkidle');
    }
    
    // Take dashboard screenshot
    await page.screenshot({ path: '/root/social_media/test-results/04-dashboard-overview.png', fullPage: true });
    
    // Document visible features on dashboard
    console.log('Analyzing dashboard features...');
    const dashboardFeatures = [];
    
    // Check for navigation items
    const navItems = await page.locator('nav a, .nav a, [role="navigation"] a, .navigation a').all();
    for (const navItem of navItems) {
      const text = await navItem.textContent();
      if (text && text.trim()) {
        dashboardFeatures.push(`Navigation: ${text.trim()}`);
      }
    }
    
    // Check for buttons
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      if (text && text.trim() && text.length < 50) {
        dashboardFeatures.push(`Button: ${text.trim()}`);
      }
    }
    
    // Check for cards or sections
    const sections = await page.locator('.card, .section, .dashboard-item, [class*="card"], [class*="section"]').all();
    for (const section of sections) {
      const text = await section.textContent();
      if (text && text.trim() && text.length < 100) {
        dashboardFeatures.push(`Section: ${text.trim().substring(0, 50)}...`);
      }
    }
    
    console.log('Dashboard features found:', dashboardFeatures.slice(0, 10)); // Show first 10
    
    console.log('\n=== TEST 3: CONNECTED ACCOUNTS TEST ===');
    
    // Try to navigate to accounts page
    const accountsUrls = [
      'http://localhost:3000/accounts',
      'http://localhost:3000/accounts/connections',
      'http://localhost:3000/connections',
      'http://localhost:3000/settings'
    ];
    
    let accountsPageFound = false;
    for (const url of accountsUrls) {
      try {
        console.log(`Trying to access: ${url}`);
        await page.goto(url);
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        
        // Check if this looks like an accounts/connections page
        const pageContent = await page.content();
        if (pageContent.includes('Facebook') || pageContent.includes('Instagram') || 
            pageContent.includes('Twitter') || pageContent.includes('connect') ||
            pageContent.includes('account')) {
          accountsPageFound = true;
          console.log('Found accounts page at:', url);
          break;
        }
      } catch (error) {
        console.log(`URL ${url} not accessible:`, error.message);
      }
    }
    
    if (!accountsPageFound) {
      // Try clicking navigation links
      const navLinks = await page.locator('a:has-text("Account"), a:has-text("Connect"), a:has-text("Settings"), a:has-text("Connections")').all();
      for (const link of navLinks) {
        try {
          const linkText = await link.textContent();
          console.log(`Trying to click navigation link: ${linkText}`);
          await link.click();
          await page.waitForLoadState('networkidle', { timeout: 5000 });
          
          const pageContent = await page.content();
          if (pageContent.includes('Facebook') || pageContent.includes('Instagram')) {
            accountsPageFound = true;
            console.log('Found accounts page via navigation');
            break;
          }
        } catch (error) {
          console.log('Navigation link failed:', error.message);
        }
      }
    }
    
    // Take screenshot of accounts page
    await page.screenshot({ path: '/root/social_media/test-results/05-accounts-page.png', fullPage: true });
    
    // Look for social media platform options
    console.log('Checking for social media platform options...');
    const platformOptions = [];
    
    const platforms = ['Facebook', 'Instagram', 'Twitter', 'X', 'Mastodon', 'Pinterest', 'LinkedIn', 'YouTube'];
    for (const platform of platforms) {
      const elements = await page.locator(`text=${platform}, [alt*="${platform}" i], [title*="${platform}" i]`).all();
      if (elements.length > 0) {
        platformOptions.push(platform);
      }
    }
    
    console.log('Platform connection options found:', platformOptions);
    
    // Look for connect buttons specifically
    const connectButtons = await page.locator('button:has-text("Connect"), a:has-text("Connect"), [class*="connect"]').all();
    console.log(`Found ${connectButtons.length} connect-related elements`);
    
    console.log('\n=== TEST 4: POSTS HISTORY TEST ===');
    
    // Try to navigate to posts page
    const postsUrls = [
      'http://localhost:3000/posts',
      'http://localhost:3000/content',
      'http://localhost:3000/history',
      'http://localhost:3000/timeline'
    ];
    
    let postsPageFound = false;
    for (const url of postsUrls) {
      try {
        console.log(`Trying to access posts page: ${url}`);
        await page.goto(url);
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        
        const pageContent = await page.content();
        if (pageContent.includes('post') || pageContent.includes('content') || 
            pageContent.includes('publish') || pageContent.includes('history')) {
          postsPageFound = true;
          console.log('Found posts page at:', url);
          break;
        }
      } catch (error) {
        console.log(`Posts URL ${url} not accessible:`, error.message);
      }
    }
    
    if (!postsPageFound) {
      // Try clicking navigation links
      const navLinks = await page.locator('a:has-text("Post"), a:has-text("Content"), a:has-text("History"), a:has-text("Timeline")').all();
      for (const link of navLinks) {
        try {
          const linkText = await link.textContent();
          console.log(`Trying to click navigation link: ${linkText}`);
          await link.click();
          await page.waitForLoadState('networkidle', { timeout: 5000 });
          postsPageFound = true;
          break;
        } catch (error) {
          console.log('Posts navigation link failed:', error.message);
        }
      }
    }
    
    // Take screenshot of posts page
    await page.screenshot({ path: '/root/social_media/test-results/06-posts-page.png', fullPage: true });
    
    // Count posts if any are visible
    const postElements = await page.locator('.post, .content-item, [class*="post"], [class*="content"]').all();
    console.log(`Found ${postElements.length} post-like elements`);
    
    // Look for any post content
    const postTexts = await page.locator('text=/posted|published|scheduled/i').all();
    console.log(`Found ${postTexts.length} post-related text elements`);
    
    console.log('\n=== TEST 5: LIVE STREAMING TEST ===');
    
    // Try to navigate to live streaming page
    const liveUrls = [
      'http://localhost:3000/live',
      'http://localhost:3000/streaming',
      'http://localhost:3000/stream',
      'http://localhost:3000/broadcast'
    ];
    
    let livePageFound = false;
    for (const url of liveUrls) {
      try {
        console.log(`Trying to access live streaming page: ${url}`);
        await page.goto(url);
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        
        const pageContent = await page.content();
        if (pageContent.includes('stream') || pageContent.includes('live') || 
            pageContent.includes('broadcast') || pageContent.includes('RTMP')) {
          livePageFound = true;
          console.log('Found live streaming page at:', url);
          break;
        }
      } catch (error) {
        console.log(`Live URL ${url} not accessible:`, error.message);
      }
    }
    
    if (!livePageFound) {
      // Try clicking navigation links
      const navLinks = await page.locator('a:has-text("Live"), a:has-text("Stream"), a:has-text("Broadcast")').all();
      for (const link of navLinks) {
        try {
          const linkText = await link.textContent();
          console.log(`Trying to click navigation link: ${linkText}`);
          await link.click();
          await page.waitForLoadState('networkidle', { timeout: 5000 });
          livePageFound = true;
          break;
        } catch (error) {
          console.log('Live navigation link failed:', error.message);
        }
      }
    }
    
    // Take screenshot of live streaming page
    await page.screenshot({ path: '/root/social_media/test-results/07-live-streaming.png', fullPage: true });
    
    // Check for streaming-related elements
    const streamElements = await page.locator('text=/RTMP|stream|app|key|nimble/i').all();
    console.log(`Found ${streamElements.length} streaming-related elements`);
    
    // Look for stream apps or configuration
    const streamApps = await page.locator('.stream-app, .app, [class*="stream"], [class*="app"]').all();
    console.log(`Found ${streamApps.length} potential stream app elements`);
    
    console.log('\n=== FINAL RESULTS SUMMARY ===');
    console.log('Test completed successfully!');
    console.log(`Screenshots saved to: /root/social_media/test-results/`);
    console.log(`- Login successful: ${isLoggedIn}`);
    console.log(`- Platform options found: ${platformOptions.join(', ') || 'None'}`);
    console.log(`- Posts found: ${postElements.length}`);
    console.log(`- Streaming elements: ${streamElements.length}`);
    console.log(`- Dashboard features: ${dashboardFeatures.length}`);
    
  } catch (error) {
    console.error('Test failed:', error);
    
    // Take error screenshot
    await page.screenshot({ path: '/root/social_media/test-results/error-screenshot.png', fullPage: true });
    
    // Log current page content for debugging
    const title = await page.title();
    const url = page.url();
    console.log('Error occurred on page:', title, url);
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Create test results directory
const fs = require('fs');
if (!fs.existsSync('/root/social_media/test-results')) {
  fs.mkdirSync('/root/social_media/test-results');
}

// Run the tests
runUITests().catch(console.error);