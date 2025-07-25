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

test.describe('Social Media Application - Quick Verification', () => {
  
  test('Complete Application Test', async ({ page }) => {
    console.log('🚀 Starting comprehensive application test...');
    
    // Navigate to the application
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    // Take screenshot of initial page
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-initial-page.png'),
      fullPage: true 
    });
    
    console.log('📱 Initial page loaded');
    
    // === LOGIN TEST ===
    console.log('🔑 Testing login functionality...');
    
    // Look for login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    
    const emailVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
    const passwordVisible = await passwordInput.isVisible({ timeout: 2000 }).catch(() => false);
    const buttonVisible = await loginButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    console.log('Form elements found:', { email: emailVisible, password: passwordVisible, button: buttonVisible });
    
    if (emailVisible && passwordVisible && buttonVisible) {
      // Fill in credentials
      await emailInput.fill(TEST_CREDENTIALS.email);
      await passwordInput.fill(TEST_CREDENTIALS.password);
      
      // Take screenshot before submitting
      await page.screenshot({ 
        path: path.join(screenshotDir, '02-before-login.png'),
        fullPage: true 
      });
      
      // Click login button
      await loginButton.click();
      
      // Wait for response
      await page.waitForTimeout(5000);
      
      // Take screenshot after login attempt
      await page.screenshot({ 
        path: path.join(screenshotDir, '03-after-login.png'),
        fullPage: true 
      });
      
      // Check for error messages first
      const errorElements = await page.locator('.error, .alert, [role="alert"], .MuiAlert-root').all();
      for (const element of errorElements) {
        if (await element.isVisible()) {
          const errorText = await element.textContent();
          console.log('❌ Login error:', errorText);
        }
      }
      
      // Check if login was successful
      const dashboardVisible = await page.locator('nav, .dashboard, h1:has-text("Dashboard")').isVisible({ timeout: 3000 }).catch(() => false);
      
      if (dashboardVisible) {
        console.log('✅ Login successful!');
        
        // === DASHBOARD OVERVIEW ===
        console.log('📊 Capturing dashboard overview...');
        await page.screenshot({ 
          path: path.join(screenshotDir, '04-dashboard-overview.png'),
          fullPage: true 
        });
        
        // === ACCOUNTS PAGE TEST ===
        console.log('👥 Testing accounts page...');
        try {
          // Try to navigate to accounts page
          const accountsLink = page.locator('a[href*="accounts"], a:has-text("Accounts")').first();
          if (await accountsLink.isVisible({ timeout: 3000 })) {
            await accountsLink.click();
            await page.waitForTimeout(3000);
          } else {
            await page.goto(`${BASE_URL}/accounts`);
            await page.waitForTimeout(3000);
          }
          
          await page.screenshot({ 
            path: path.join(screenshotDir, '05-accounts-page.png'),
            fullPage: true 
          });
          
          // Look for platform connection options
          const platforms = ['Facebook', 'Instagram', 'X', 'Twitter', 'Mastodon', 'Pinterest', 'Bluesky'];
          const foundPlatforms = [];
          
          for (const platform of platforms) {
            const platformExists = await page.locator(`*:has-text("${platform}")`).isVisible({ timeout: 1000 }).catch(() => false);
            if (platformExists) {
              foundPlatforms.push(platform);
            }
          }
          
          console.log('🔗 Platform connection options found:', foundPlatforms);
          
          // Count connected accounts
          const accountCards = await page.locator('.account-card, .MuiCard-root, .connected-account').count();
          console.log('📱 Connected accounts found:', accountCards);
          
        } catch (e) {
          console.log('⚠️ Accounts page error:', e.message);
        }
        
        // === POSTS PAGE TEST ===
        console.log('📝 Testing posts page...');
        try {
          const postsLink = page.locator('a[href*="posts"], a:has-text("Posts")').first();
          if (await postsLink.isVisible({ timeout: 3000 })) {
            await postsLink.click();
            await page.waitForTimeout(3000);
          } else {
            await page.goto(`${BASE_URL}/posts`);
            await page.waitForTimeout(3000);
          }
          
          await page.screenshot({ 
            path: path.join(screenshotDir, '06-posts-page.png'),
            fullPage: true 
          });
          
          // Count posts
          const postsCount = await page.locator('.post, .post-card, .MuiCard-root').count();
          console.log('📄 Posts found:', postsCount);
          
          if (postsCount >= 20) {
            console.log('✅ Posts verification PASSED - found', postsCount, 'posts (expected 20+)');
          } else if (postsCount > 0) {
            console.log('⚠️ Posts verification PARTIAL - found', postsCount, 'posts (expected 20)');
          } else {
            console.log('❌ Posts verification FAILED - no posts found');
          }
          
        } catch (e) {
          console.log('⚠️ Posts page error:', e.message);
        }
        
        // === LIVE STREAMING TEST ===
        console.log('🎥 Testing live streaming page...');
        try {
          const liveLink = page.locator('a[href*="live"], a:has-text("Live")').first();
          if (await liveLink.isVisible({ timeout: 3000 })) {
            await liveLink.click();
            await page.waitForTimeout(3000);
          } else {
            await page.goto(`${BASE_URL}/live`);
            await page.waitForTimeout(3000);
          }
          
          await page.screenshot({ 
            path: path.join(screenshotDir, '07-live-streaming.png'),
            fullPage: true 
          });
          
          // Count stream apps
          const streamAppsCount = await page.locator('.stream-app, .stream-card, .MuiCard-root').count();
          console.log('🎬 Stream apps found:', streamAppsCount);
          
          // Look for specific restored stream apps
          const socialMediaAppExists = await page.locator('*:has-text("Social Media Public Stream")').isVisible({ timeout: 2000 }).catch(() => false);
          const socialmediaAppExists = await page.locator('*:has-text("socialmedia")').isVisible({ timeout: 2000 }).catch(() => false);
          
          const foundApps = [];
          if (socialMediaAppExists) foundApps.push('Social Media Public Stream');
          if (socialmediaAppExists) foundApps.push('socialmedia');
          
          console.log('🎯 Expected stream apps found:', foundApps);
          
          if (foundApps.length === 2) {
            console.log('✅ Stream apps verification PASSED - found all expected apps');
          } else if (foundApps.length > 0) {
            console.log('⚠️ Stream apps verification PARTIAL - found', foundApps.length, 'of 2 expected apps');
          } else {
            console.log('❌ Stream apps verification FAILED - no expected apps found');
          }
          
        } catch (e) {
          console.log('⚠️ Live streaming page error:', e.message);
        }
        
        console.log('🎉 Application testing completed!');
        
      } else {
        console.log('❌ Login failed - not redirected to dashboard');
      }
      
    } else {
      console.log('❌ Login form not found');
      
      // Capture page content for debugging
      const bodyText = await page.locator('body').textContent();
      console.log('Page content preview:', bodyText.substring(0, 300) + '...');
    }
  });
});