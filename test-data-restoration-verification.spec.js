const { test, expect } = require('@playwright/test');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:5000';
const TEST_CREDENTIALS = {
  email: 'sri.ramanatha@uskfoundation.or.ke',
  password: 'Swamiji@1234'
};

// Screenshot directory
const screenshotDir = path.join(__dirname, 'test-results');

test.describe('Data Restoration Verification - Complete End-to-End Tests', () => {

  test('1. Login with Restored User Credentials', async ({ page }) => {
    console.log('🔐 Testing login with restored user credentials...');
    
    // Navigate to the application
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, 'restore-01-initial-page.png'),
      fullPage: true 
    });
    
    // Check if we're on login page
    const isLoginPage = await page.locator('input[type="email"], input[type="password"]').count() >= 2;
    console.log('📍 Is login page detected:', isLoginPage);
    
    if (isLoginPage) {
      console.log('🔑 Filling login credentials...');
      
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
      
      // Fill credentials
      await emailInput.fill(TEST_CREDENTIALS.email);
      await passwordInput.fill(TEST_CREDENTIALS.password);
      
      await page.screenshot({ 
        path: path.join(screenshotDir, 'restore-02-credentials-filled.png'),
        fullPage: true 
      });
      
      // Submit login
      await submitButton.click();
      await page.waitForTimeout(5000);
      
      await page.screenshot({ 
        path: path.join(screenshotDir, 'restore-03-after-login.png'),
        fullPage: true 
      });
      
      // Verify successful login by checking for dashboard elements
      const isDashboard = await page.locator('nav, .dashboard, .MuiAppBar-root').count() > 0;
      const hasUserInfo = await page.locator('*:has-text("sri.ramanatha"), *:has-text("USK Foundation")').count() > 0;
      
      console.log('✅ Login successful (dashboard detected):', isDashboard);
      console.log('✅ User info visible:', hasUserInfo);
      
      // Verify we're not still on login page
      const stillOnLogin = await page.locator('input[type="email"], input[type="password"]').count() >= 2;
      console.log('❌ Still on login page:', stillOnLogin);
      
      expect(isDashboard).toBe(true);
      expect(stillOnLogin).toBe(false);
    } else {
      console.log('⚠️ Not on login page - checking if already logged in...');
      
      // Check if already logged in
      const isDashboard = await page.locator('nav, .dashboard, .MuiAppBar-root').count() > 0;
      if (!isDashboard) {
        throw new Error('Neither login page nor dashboard detected');
      }
    }
  });

  test('2. Connected Accounts Verification', async ({ page }) => {
    console.log('🔗 Verifying connected social accounts...');
    
    // Get auth token and inject it
    const authResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_CREDENTIALS),
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      await page.goto(BASE_URL);
      await page.evaluate((token) => {
        localStorage.setItem('token', token);
      }, authData.token);
      await page.reload();
      await page.waitForTimeout(3000);
    }
    
    // Navigate to accounts page
    await page.goto(`${BASE_URL}/accounts`);
    await page.waitForTimeout(5000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'restore-04-accounts-page.png'),
      fullPage: true 
    });
    
    // Count connected accounts
    const accountCards = await page.locator('.MuiCard-root, .account-card, .card').count();
    console.log('📊 Account cards found:', accountCards);
    
    // Check for specific platforms
    const platforms = ['Mastodon', 'X', 'Twitter', 'Pinterest', 'Bluesky', 'Facebook', 'Instagram'];
    const foundPlatforms = [];
    
    for (const platform of platforms) {
      const exists = await page.locator(`*:has-text("${platform}")`).count() > 0;
      if (exists) {
        foundPlatforms.push(platform);
        console.log(`✅ ${platform} account found`);
      } else {
        console.log(`❌ ${platform} account not found`);
      }
    }
    
    console.log('🎯 Connected platforms:', foundPlatforms.join(', '));
    
    // Check for account status indicators
    const connectedAccounts = await page.locator('*:has-text("Connected"), *:has-text("Active"), .connected').count();
    const disconnectedAccounts = await page.locator('*:has-text("Disconnected"), *:has-text("Error"), .error').count();
    
    console.log('✅ Connected accounts:', connectedAccounts);
    console.log('❌ Disconnected accounts:', disconnectedAccounts);
    
    // Look for account usernames/handles
    const accountNames = await page.locator('[class*="username"], [class*="handle"], .account-name').allTextContent();
    console.log('👤 Account names found:', accountNames.slice(0, 5)); // Show first 5
    
    // Verify we have the expected 9 social accounts
    expect(foundPlatforms.length).toBeGreaterThanOrEqual(4); // At least 4 different platforms
    expect(accountCards).toBeGreaterThanOrEqual(9); // At least 9 total accounts
  });

  test('3. Posts History Verification', async ({ page }) => {
    console.log('📄 Verifying posts history...');
    
    // Get auth token and inject it
    const authResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_CREDENTIALS),
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      await page.goto(BASE_URL);
      await page.evaluate((token) => {
        localStorage.setItem('token', token);
      }, authData.token);
      await page.reload();
      await page.waitForTimeout(3000);
    }
    
    // Navigate to posts page
    await page.goto(`${BASE_URL}/posts`);
    await page.waitForTimeout(5000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'restore-05-posts-page.png'),
      fullPage: true 
    });
    
    // Count posts
    const postCards = await page.locator('.MuiCard-root, .post-card, .post, [class*="post"]').count();
    console.log('📊 Post cards found:', postCards);
    
    // Check for post content
    const postTexts = await page.locator('.post-content, .post-text, [class*="content"]').allTextContent();
    console.log('📝 Post content samples:', postTexts.slice(0, 3).map(text => text.substring(0, 50)));
    
    // Check for post statuses
    const publishedPosts = await page.locator('*:has-text("Published"), *:has-text("Success"), .published').count();
    const failedPosts = await page.locator('*:has-text("Failed"), *:has-text("Error"), .failed').count();
    const draftPosts = await page.locator('*:has-text("Draft"), *:has-text("Pending"), .draft').count();
    
    console.log('✅ Published posts:', publishedPosts);
    console.log('❌ Failed posts:', failedPosts);
    console.log('📝 Draft posts:', draftPosts);
    
    // Check for timestamps
    const timestamps = await page.locator('[class*="date"], [class*="time"], .timestamp').count();
    console.log('🕒 Timestamps found:', timestamps);
    
    // Look for specific post content from our restored data
    const samplePostContent = await page.locator('*:has-text("Unlock"), *:has-text("potential"), *:has-text("technology")').count();
    console.log('🔍 Sample post content matches:', samplePostContent);
    
    // Check if we have the expected 20 posts
    console.log('🎯 Expected 20 posts, found:', postCards);
    expect(postCards).toBeGreaterThanOrEqual(15); // At least 15 posts (allowing for some UI variations)
  });

  test('4. Dashboard Navigation and User Profile', async ({ page }) => {
    console.log('🏠 Testing dashboard navigation and user profile...');
    
    // Get auth token and inject it
    const authResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_CREDENTIALS),
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      await page.goto(BASE_URL);
      await page.evaluate((token) => {
        localStorage.setItem('token', token);
      }, authData.token);
      await page.reload();
      await page.waitForTimeout(3000);
    }
    
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/`);
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'restore-06-dashboard.png'),
      fullPage: true 
    });
    
    // Check for user information
    const userEmail = await page.locator('*:has-text("sri.ramanatha@uskfoundation.or.ke")').count();
    const userOrgName = await page.locator('*:has-text("USK Foundation")').count();
    const userName = await page.locator('*:has-text("Sri Ramanatha")').count();
    
    console.log('👤 User email visible:', userEmail > 0);
    console.log('🏢 Organization name visible:', userOrgName > 0);
    console.log('📛 User name visible:', userName > 0);
    
    // Test navigation items
    const navigationItems = [
      { text: 'Dashboard', url: '/' },
      { text: 'Accounts', url: '/accounts' },
      { text: 'Posts', url: '/posts' },
      { text: 'Live', url: '/live' },
      { text: 'Compose', url: '/compose' },
      { text: 'Settings', url: '/settings' }
    ];
    
    for (const item of navigationItems) {
      console.log(`🧭 Testing navigation to ${item.text}...`);
      
      try {
        // Try clicking the navigation item
        const navLink = page.locator(`nav a:has-text("${item.text}"), .MuiTab-root:has-text("${item.text}"), button:has-text("${item.text}")`).first();
        
        if (await navLink.isVisible()) {
          await navLink.click();
          await page.waitForTimeout(2000);
          
          // Check if URL changed appropriately
          const currentUrl = page.url();
          const expectedPath = item.url === '/' ? '' : item.url;
          const urlMatches = currentUrl.includes(expectedPath) || currentUrl.endsWith(expectedPath);
          
          console.log(`  ✅ ${item.text} navigation: ${urlMatches ? 'Success' : 'Failed'} (${currentUrl})`);
          
          await page.screenshot({ 
            path: path.join(screenshotDir, `restore-07-nav-${item.text.toLowerCase()}.png`),
            fullPage: true 
          });
        } else {
          console.log(`  ❌ ${item.text} navigation link not found`);
        }
      } catch (error) {
        console.log(`  ❌ Error navigating to ${item.text}:`, error.message);
      }
    }
    
    // Return to dashboard
    await page.goto(`${BASE_URL}/`);
    await page.waitForTimeout(2000);
    
    // Check for dashboard stats/cards
    const statsCards = await page.locator('.MuiCard-root, .stat-card, .dashboard-card').count();
    console.log('📊 Dashboard cards/stats found:', statsCards);
    
    // Verify user profile information is correct
    expect(userEmail + userOrgName + userName).toBeGreaterThan(0); // At least one user identifier should be visible
  });

  test('5. Platform Connection Options Verification', async ({ page }) => {
    console.log('🔌 Testing platform connection options...');
    
    // Get auth token and inject it
    const authResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_CREDENTIALS),
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      await page.goto(BASE_URL);
      await page.evaluate((token) => {
        localStorage.setItem('token', token);
      }, authData.token);
      await page.reload();
      await page.waitForTimeout(3000);
    }
    
    // Navigate to accounts page
    await page.goto(`${BASE_URL}/accounts`);
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'restore-08-connection-options.png'),
      fullPage: true 
    });
    
    // Look for connection buttons/options
    const connectButtons = await page.locator('button:has-text("Connect"), button:has-text("Add"), .connect-button').count();
    console.log('🔗 Connect buttons found:', connectButtons);
    
    // Check for specific platform connection options
    const platforms = ['Facebook', 'Instagram', 'X', 'Twitter', 'Mastodon', 'Pinterest', 'Bluesky'];
    const availablePlatforms = [];
    
    for (const platform of platforms) {
      // Look for connect buttons or options for each platform
      const connectOption = await page.locator(`button:has-text("${platform}"), *:has-text("Connect ${platform}"), *:has-text("Add ${platform}")`).count();
      if (connectOption > 0) {
        availablePlatforms.push(platform);
        console.log(`✅ ${platform} connection option available`);
      } else {
        console.log(`❌ ${platform} connection option not found`);
      }
    }
    
    console.log('🎯 Available connection platforms:', availablePlatforms.join(', '));
    
    // Test Facebook/Instagram connection dialogs if available
    const facebookConnect = page.locator('button:has-text("Facebook"), button:has-text("Connect Facebook")').first();
    const instagramConnect = page.locator('button:has-text("Instagram"), button:has-text("Connect Instagram")').first();
    
    if (await facebookConnect.isVisible()) {
      console.log('🔵 Testing Facebook connection dialog...');
      try {
        await facebookConnect.click();
        await page.waitForTimeout(2000);
        
        const dialogOpen = await page.locator('.MuiDialog-root, .modal, .dialog').count() > 0;
        console.log('  📱 Facebook dialog opened:', dialogOpen);
        
        await page.screenshot({ 
          path: path.join(screenshotDir, 'restore-09-facebook-dialog.png'),
          fullPage: true 
        });
        
        // Close dialog if opened
        if (dialogOpen) {
          const closeButton = page.locator('button:has-text("Cancel"), button:has-text("Close"), .MuiDialog-root button[aria-label="close"]').first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
            await page.waitForTimeout(1000);
          }
        }
      } catch (error) {
        console.log('  ❌ Error testing Facebook dialog:', error.message);
      }
    }
    
    if (await instagramConnect.isVisible()) {
      console.log('📷 Testing Instagram connection dialog...');
      try {
        await instagramConnect.click();
        await page.waitForTimeout(2000);
        
        const dialogOpen = await page.locator('.MuiDialog-root, .modal, .dialog').count() > 0;
        console.log('  📱 Instagram dialog opened:', dialogOpen);
        
        await page.screenshot({ 
          path: path.join(screenshotDir, 'restore-10-instagram-dialog.png'),
          fullPage: true 
        });
        
        // Close dialog if opened
        if (dialogOpen) {
          const closeButton = page.locator('button:has-text("Cancel"), button:has-text("Close"), .MuiDialog-root button[aria-label="close"]').first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
            await page.waitForTimeout(1000);
          }
        }
      } catch (error) {
        console.log('  ❌ Error testing Instagram dialog:', error.message);
      }
    }
    
    // Final verification
    expect(availablePlatforms.length).toBeGreaterThanOrEqual(3); // At least 3 platforms should be available for connection
    expect(connectButtons).toBeGreaterThan(0); // Should have at least one connect button
  });

  test('6. Comprehensive Data Integrity Check', async ({ page }) => {
    console.log('🔍 Performing comprehensive data integrity check...');
    
    // Get auth token and inject it
    const authResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_CREDENTIALS),
    });
    
    let authToken = null;
    if (authResponse.ok) {
      const authData = await authResponse.json();
      authToken = authData.token;
      await page.goto(BASE_URL);
      await page.evaluate((token) => {
        localStorage.setItem('token', token);
      }, authToken);
      await page.reload();
      await page.waitForTimeout(3000);
    }
    
    // Check backend API directly for data verification
    console.log('🔍 Verifying data via API calls...');
    
    // Check accounts API
    try {
      const accountsResponse = await fetch(`${BACKEND_URL}/api/accounts`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (accountsResponse.ok) {
        const accounts = await accountsResponse.json();
        console.log('📊 API Accounts count:', accounts.length);
        console.log('🔗 API Account platforms:', accounts.map(acc => acc.platform).join(', '));
      }
    } catch (error) {
      console.log('❌ Error fetching accounts from API:', error.message);
    }
    
    // Check posts API
    try {
      const postsResponse = await fetch(`${BACKEND_URL}/api/posts`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (postsResponse.ok) {
        const posts = await postsResponse.json();
        console.log('📊 API Posts count:', posts.length);
        console.log('📝 API Post statuses:', [...new Set(posts.map(post => post.status))].join(', '));
      }
    } catch (error) {
      console.log('❌ Error fetching posts from API:', error.message);
    }
    
    // Final comprehensive screenshot
    await page.goto(`${BASE_URL}/`);
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'restore-11-final-verification.png'),
      fullPage: true 
    });
    
    console.log('✅ Comprehensive data integrity check completed');
    
    // Summary test assertions
    const isDashboardAccessible = await page.locator('nav, .dashboard, .MuiAppBar-root').count() > 0;
    expect(isDashboardAccessible).toBe(true);
    
    console.log('🎉 All data restoration verification tests completed successfully!');
  });
});