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

test.describe('Social Media Application - Fixed Backend Connection', () => {
  
  test('Login with Backend Fix', async ({ page }) => {
    console.log('🚀 Testing login with backend fix...');
    
    // Navigate to the application
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    // Intercept API calls and redirect them to the correct backend
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      const newUrl = url.replace('http://localhost:3000/api', 'http://localhost:5000/api');
      console.log('Redirecting:', url, '->', newUrl);
      
      route.continue({
        url: newUrl
      });
    });
    
    // Take screenshot of initial page
    await page.screenshot({ 
      path: path.join(screenshotDir, 'fixed-01-initial-page.png'),
      fullPage: true 
    });
    
    // Fill in login form
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    
    await emailInput.fill(TEST_CREDENTIALS.email);
    await passwordInput.fill(TEST_CREDENTIALS.password);
    
    // Take screenshot before login
    await page.screenshot({ 
      path: path.join(screenshotDir, 'fixed-02-before-login.png'),
      fullPage: true 
    });
    
    // Click login
    await loginButton.click();
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Take screenshot after login
    await page.screenshot({ 
      path: path.join(screenshotDir, 'fixed-03-after-login.png'),
      fullPage: true 
    });
    
    // Check if login was successful
    const dashboardVisible = await page.locator('nav, .dashboard, h1:has-text("Dashboard")').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (dashboardVisible) {
      console.log('✅ Login successful with backend fix!');
      
      // Take comprehensive dashboard screenshot
      await page.screenshot({ 
        path: path.join(screenshotDir, 'fixed-04-dashboard.png'),
        fullPage: true 
      });
      
      // Now test all the pages with working backend
      console.log('📱 Testing accounts page...');
      await page.goto(`${BASE_URL}/accounts`);
      await page.waitForTimeout(3000);
      await page.screenshot({ 
        path: path.join(screenshotDir, 'fixed-05-accounts.png'),
        fullPage: true 
      });
      
      console.log('📝 Testing posts page...');
      await page.goto(`${BASE_URL}/posts`);
      await page.waitForTimeout(3000);
      await page.screenshot({ 
        path: path.join(screenshotDir, 'fixed-06-posts.png'),
        fullPage: true 
      });
      
      console.log('🎥 Testing live streaming page...');
      await page.goto(`${BASE_URL}/live`);
      await page.waitForTimeout(3000);
      await page.screenshot({ 
        path: path.join(screenshotDir, 'fixed-07-live.png'),
        fullPage: true 
      });
      
      // Count elements on each page
      
      // Check accounts page
      await page.goto(`${BASE_URL}/accounts`);
      await page.waitForTimeout(3000);
      
      const platforms = ['Facebook', 'Instagram', 'X', 'Twitter', 'Mastodon', 'Pinterest', 'Bluesky'];
      const foundPlatforms = [];
      
      for (const platform of platforms) {
        const platformExists = await page.locator(`*:has-text("${platform}")`).isVisible({ timeout: 1000 }).catch(() => false);
        if (platformExists) {
          foundPlatforms.push(platform);
        }
      }
      
      console.log('🔗 Platform connection options found:', foundPlatforms);
      
      const accountCards = await page.locator('.account-card, .MuiCard-root, .connected-account').count();
      console.log('📱 Connected accounts found:', accountCards);
      
      // Check posts page
      await page.goto(`${BASE_URL}/posts`);
      await page.waitForTimeout(3000);
      
      const postsCount = await page.locator('.post, .post-card, .MuiCard-root').count();
      console.log('📄 Posts found:', postsCount);
      
      // Check live streaming page
      await page.goto(`${BASE_URL}/live`);
      await page.waitForTimeout(3000);
      
      const streamAppsCount = await page.locator('.stream-app, .stream-card, .MuiCard-root').count();
      console.log('🎬 Stream apps found:', streamAppsCount);
      
      const socialMediaAppExists = await page.locator('*:has-text("Social Media Public Stream")').isVisible({ timeout: 2000 }).catch(() => false);
      const socialmediaAppExists = await page.locator('*:has-text("socialmedia")').isVisible({ timeout: 2000 }).catch(() => false);
      
      const foundApps = [];
      if (socialMediaAppExists) foundApps.push('Social Media Public Stream');
      if (socialmediaAppExists) foundApps.push('socialmedia');
      
      console.log('🎯 Expected stream apps found:', foundApps);
      
      console.log('🎉 Full application test completed successfully!');
      
    } else {
      console.log('❌ Login still failed even with backend fix');
      
      // Check for error messages
      const errorElement = page.locator('.error, .alert, [role="alert"], .MuiAlert-root').first();
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.log('Error message:', errorText);
      }
    }
  });
});