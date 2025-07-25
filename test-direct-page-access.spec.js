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

test.describe('Social Media Application - Direct Page Access', () => {
  
  test('Test Direct Route Access', async ({ page }) => {
    console.log('🔍 Testing direct route access...');
    
    // Get auth token from backend
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
      console.log('✅ Got auth token from backend');
    }
    
    // Test various routes
    const routes = [
      { path: '/', name: 'Root' },
      { path: '/login', name: 'Login' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/accounts', name: 'Accounts' },
      { path: '/posts', name: 'Posts' },
      { path: '/live', name: 'Live' },
      { path: '/compose', name: 'Compose' },
      { path: '/settings', name: 'Settings' }
    ];
    
    for (const route of routes) {
      console.log(`📍 Testing route: ${route.path}`);
      
      try {
        // Navigate to route
        await page.goto(`${BASE_URL}${route.path}`);
        await page.waitForTimeout(3000);
        
        // If we have a token, inject it
        if (authToken) {
          await page.evaluate((token) => {
            localStorage.setItem('token', token);
          }, authToken);
          
          // Reload to apply token
          await page.reload();
          await page.waitForTimeout(3000);
        }
        
        // Take screenshot
        await page.screenshot({ 
          path: path.join(screenshotDir, `route-${route.name.toLowerCase()}.png`),
          fullPage: true 
        });
        
        // Analyze page content
        const title = await page.title();
        const bodyText = await page.locator('body').textContent();
        const contentPreview = bodyText.replace(/\\s+/g, ' ').substring(0, 150);
        
        console.log(`  📄 Title: ${title}`);
        console.log(`  📝 Content: ${contentPreview}...`);
        
        // Count key elements
        const buttons = await page.locator('button').count();
        const links = await page.locator('a').count();
        const cards = await page.locator('.MuiCard-root, .card').count();
        const forms = await page.locator('form').count();
        const navElements = await page.locator('nav, .navbar, .MuiAppBar-root').count();
        
        console.log(`  📊 Elements: ${buttons} buttons, ${links} links, ${cards} cards, ${forms} forms, ${navElements} nav`);
        
        // Check for specific content based on route
        if (route.path === '/accounts' || route.name === 'Accounts') {
          const platforms = ['Facebook', 'Instagram', 'X', 'Twitter', 'Mastodon', 'Pinterest', 'Bluesky'];
          const foundPlatforms = [];
          
          for (const platform of platforms) {
            const exists = await page.locator(`*:has-text("${platform}")`).count() > 0;
            if (exists) foundPlatforms.push(platform);
          }
          
          console.log(`  🔗 Platforms found: ${foundPlatforms.join(', ')}`);
        }
        
        if (route.path === '/posts' || route.name === 'Posts') {
          const posts = await page.locator('.post, .post-card').count();
          const hasPostText = await page.locator('*:has-text("post"), *:has-text("Post")').count() > 0;
          
          console.log(`  📄 Posts found: ${posts}, Has post text: ${hasPostText}`);
        }
        
        if (route.path === '/live' || route.name === 'Live') {
          const streamElements = await page.locator('.stream, .stream-app, .stream-card').count();
          const hasLiveText = await page.locator('*:has-text("stream"), *:has-text("Stream"), *:has-text("Live")').count() > 0;
          
          console.log(`  🎬 Stream elements: ${streamElements}, Has live text: ${hasLiveText}`);
          
          // Check for specific stream app names
          const socialMediaApp = await page.locator('*:has-text("Social Media Public Stream")').count() > 0;
          const socialmediaApp = await page.locator('*:has-text("socialmedia")').count() > 0;
          
          console.log(`  🎯 Stream apps: Social Media Public Stream (${socialMediaApp}), socialmedia (${socialmediaApp})`);
        }
        
        // Check if this looks like a login page
        const isLoginPage = await page.locator('input[type="email"], input[type="password"]').count() >= 1;
        const hasSignInButton = await page.locator('button:has-text("Sign In"), button:has-text("Login")').count() > 0;
        
        if (isLoginPage || hasSignInButton) {
          console.log('  🔑 This appears to be a login page');
        }
        
        // Check if this looks like a dashboard/authenticated page
        const hasDashboardElements = await page.locator('nav, .sidebar, .dashboard').count() > 0;
        const hasUserMenu = await page.locator('.user-menu, .profile, .avatar').count() > 0;
        
        if (hasDashboardElements || hasUserMenu) {
          console.log('  📊 This appears to be an authenticated page');
        }
        
      } catch (error) {
        console.log(`  ❌ Error testing ${route.path}: ${error.message}`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('🏁 Route testing completed');
  });
});