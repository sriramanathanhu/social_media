const { test, expect } = require('@playwright/test');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  email: 'sri.ramanatha@uskfoundation.or.ke',
  password: 'Swamiji@1234'
};

// Screenshot directory
const screenshotDir = path.join(__dirname, 'test-results');

test.describe('Social Media Application - UI Content Verification', () => {
  
  test('Verify UI Content and Structure', async ({ page }) => {
    console.log('🔍 Starting UI content verification...');
    
    // Get auth token directly from backend first
    const authResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_CREDENTIALS),
    });
    
    let authToken = null;
    if (authResponse.ok) {
      const authData = await authResponse.json();
      authToken = authData.token;
      console.log('✅ Got auth token from backend:', authToken ? 'Yes' : 'No');
    } else {
      console.log('❌ Failed to get auth token from backend');
    }
    
    // Navigate to the application
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, 'ui-01-initial.png'),
      fullPage: true 
    });
    
    // If we have an auth token, inject it into localStorage
    if (authToken) {
      await page.evaluate((token) => {
        localStorage.setItem('token', token);
      }, authToken);
      
      // Refresh the page to use the token
      await page.reload();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: path.join(screenshotDir, 'ui-02-after-token-injection.png'),
        fullPage: true 
      });
    }
    
    // === ANALYZE CURRENT PAGE ===
    console.log('📋 Analyzing current page content...');
    
    // Get page title
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Get main content text
    const bodyText = await page.locator('body').textContent();
    const contentPreview = bodyText.replace(/\s+/g, ' ').substring(0, 200);
    console.log('📝 Content preview:', contentPreview);
    
    // Check for navigation elements
    const navElements = await page.locator('nav, .navbar, .sidebar, [role="navigation"]').count();
    console.log('🧭 Navigation elements found:', navElements);
    
    // Check for buttons
    const buttons = await page.locator('button').count();
    console.log('🔘 Buttons found:', buttons);
    
    // Check for links
    const links = await page.locator('a').count();
    console.log('🔗 Links found:', links);
    
    // Check for forms
    const forms = await page.locator('form').count();
    console.log('📋 Forms found:', forms);
    
    // Check for input fields
    const inputs = await page.locator('input').count();
    console.log('📝 Input fields found:', inputs);
    
    // Check if we're on login page or dashboard
    const isLoginPage = await page.locator('input[type="email"], input[type="password"]').count() >= 2;
    const isDashboard = await page.locator('nav, .dashboard, .MuiAppBar-root').count() > 0;
    
    console.log('🔑 Is login page:', isLoginPage);
    console.log('📊 Is dashboard:', isDashboard);
    
    if (isDashboard) {
      console.log('🎉 Dashboard detected! Testing navigation...');
      
      // === TEST NAVIGATION TO DIFFERENT PAGES ===
      
      // Test direct navigation to different routes
      const routes = [
        { path: '/accounts', name: 'Accounts' },
        { path: '/posts', name: 'Posts' },
        { path: '/live', name: 'Live Streaming' },
        { path: '/compose', name: 'Compose' },
        { path: '/settings', name: 'Settings' }
      ];
      
      for (const route of routes) {
        console.log(`📍 Testing route: ${route.path}`);
        
        try {
          await page.goto(`${BASE_URL}${route.path}`);
          await page.waitForTimeout(3000);
          
          // Take screenshot
          await page.screenshot({ 
            path: path.join(screenshotDir, `ui-03-${route.name.toLowerCase().replace(' ', '-')}.png`),
            fullPage: true 
          });
          
          // Get page content
          const pageText = await page.locator('body').textContent();
          const pagePreview = pageText.replace(/\s+/g, ' ').substring(0, 100);
          console.log(`  📄 ${route.name} content:`, pagePreview);
          
          // Count elements on this page
          const cards = await page.locator('.MuiCard-root, .card, .post-card, .account-card').count();
          const buttons = await page.locator('button').count();
          const inputs = await page.locator('input').count();
          
          console.log(`  📊 ${route.name} elements: ${cards} cards, ${buttons} buttons, ${inputs} inputs`);
          
          // Look for specific content based on the route
          if (route.path === '/accounts') {
            const platforms = ['Facebook', 'Instagram', 'X', 'Twitter', 'Mastodon', 'Pinterest', 'Bluesky'];
            const foundPlatforms = [];
            
            for (const platform of platforms) {
              const exists = await page.locator(`*:has-text("${platform}")`).count() > 0;
              if (exists) foundPlatforms.push(platform);
            }
            
            console.log(`  🔗 Platform options found: ${foundPlatforms.join(', ')}`);
          }
          
          if (route.path === '/posts') {
            const posts = await page.locator('.post, .post-card, .MuiCard-root').count();
            console.log(`  📄 Posts found: ${posts}`);
            
            // Look for text indicating posts
            const hasPostsText = await page.locator('*:has-text("post"), *:has-text("Post")').count() > 0;
            const hasEmptyState = await page.locator('*:has-text("No posts"), *:has-text("empty")').count() > 0;
            
            console.log(`  📝 Has posts text: ${hasPostsText}, Has empty state: ${hasEmptyState}`);
          }
          
          if (route.path === '/live') {
            const streamApps = await page.locator('.stream-app, .stream-card, .MuiCard-root').count();
            console.log(`  🎬 Stream apps/cards found: ${streamApps}`);
            
            // Look for specific stream app names
            const socialMediaApp = await page.locator('*:has-text("Social Media Public Stream")').count() > 0;
            const socialmediaApp = await page.locator('*:has-text("socialmedia")').count() > 0;
            
            console.log(`  🎯 Expected stream apps: Social Media Public Stream (${socialMediaApp}), socialmedia (${socialmediaApp})`);
          }
          
        } catch (error) {
          console.log(`  ❌ Error testing ${route.path}:`, error.message);
        }
      }
      
    } else if (isLoginPage) {
      console.log('🔑 Login page detected');
      
      // Try to login if we're on the login page
      if (!authToken) {
        console.log('🔐 Attempting to fill login form...');
        
        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
        const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
        
        if (await emailInput.isVisible() && await passwordInput.isVisible() && await submitButton.isVisible()) {
          await emailInput.fill(TEST_CREDENTIALS.email);
          await passwordInput.fill(TEST_CREDENTIALS.password);
          
          await page.screenshot({ 
            path: path.join(screenshotDir, 'ui-04-login-attempt.png'),
            fullPage: true 
          });
          
          await submitButton.click();
          await page.waitForTimeout(5000);
          
          await page.screenshot({ 
            path: path.join(screenshotDir, 'ui-05-after-login-attempt.png'),
            fullPage: true 
          });
          
          // Check if we're now on dashboard
          const nowOnDashboard = await page.locator('nav, .dashboard, .MuiAppBar-root').count() > 0;
          console.log('🎯 Login successful:', nowOnDashboard);
        }
      }
    } else {
      console.log('❓ Unknown page state - neither login nor dashboard clearly detected');
    }
    
    // === FINAL SUMMARY ===
    await page.screenshot({ 
      path: path.join(screenshotDir, 'ui-06-final-state.png'),
      fullPage: true 
    });
    
    console.log('🏁 UI content verification completed');
  });
});