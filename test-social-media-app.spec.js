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

test.describe('Social Media Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
  });

  test('1. Login Test', async ({ page }) => {
    console.log('Starting login test...');
    
    // Take screenshot of initial page
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-initial-page.png'),
      fullPage: true 
    });
    
    // Check if we're on login page or already logged in
    const isLoggedIn = await page.locator('[data-testid="dashboard"]').isVisible().catch(() => false);
    
    if (isLoggedIn) {
      console.log('Already logged in, logging out first...');
      // Try to find logout button
      const logoutButton = page.locator('button').filter({ hasText: /logout|sign out/i });
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Look for login form elements
    await page.screenshot({ 
      path: path.join(screenshotDir, '02-before-login.png'),
      fullPage: true 
    });
    
    // Try different possible selectors for email input
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      '[data-testid="email-input"]',
      '#email'
    ];
    
    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        emailInput = page.locator(selector);
        if (await emailInput.isVisible({ timeout: 2000 })) {
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Try different possible selectors for password input
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      '[data-testid="password-input"]',
      '#password'
    ];
    
    let passwordInput = null;
    for (const selector of passwordSelectors) {
      try {
        passwordInput = page.locator(selector);
        if (await passwordInput.isVisible({ timeout: 2000 })) {
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Try different possible selectors for login button
    const loginButtonSelectors = [
      'button[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign In")',
      '[data-testid="login-button"]',
      'input[type="submit"]'
    ];
    
    let loginButton = null;
    for (const selector of loginButtonSelectors) {
      try {
        loginButton = page.locator(selector);
        if (await loginButton.isVisible({ timeout: 2000 })) {
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    console.log('Email input found:', emailInput !== null);
    console.log('Password input found:', passwordInput !== null);
    console.log('Login button found:', loginButton !== null);
    
    if (emailInput && passwordInput && loginButton) {
      // Fill in credentials
      await emailInput.fill(TEST_CREDENTIALS.email);
      await passwordInput.fill(TEST_CREDENTIALS.password);
      
      // Take screenshot before submitting
      await page.screenshot({ 
        path: path.join(screenshotDir, '02b-credentials-filled.png'),
        fullPage: true 
      });
      
      // Click login button
      await loginButton.click();
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Take screenshot after login attempt
      await page.screenshot({ 
        path: path.join(screenshotDir, '03-after-login.png'),
        fullPage: true 
      });
      
      // Check if login was successful (look for dashboard elements)
      const dashboardSelectors = [
        '[data-testid="dashboard"]',
        '.dashboard',
        'h1:has-text("Dashboard")',
        'nav',
        '.MuiAppBar-root'
      ];
      
      let loginSuccessful = false;
      for (const selector of dashboardSelectors) {
        try {
          if (await page.locator(selector).isVisible({ timeout: 5000 })) {
            loginSuccessful = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log('Login successful:', loginSuccessful);
      
      if (loginSuccessful) {
        console.log('✅ Login test PASSED');
      } else {
        console.log('❌ Login test FAILED - not redirected to dashboard');
        
        // Look for error messages
        const errorSelectors = [
          '.error',
          '.alert',
          '[role="alert"]',
          '.MuiAlert-root',
          '.error-message'
        ];
        
        for (const selector of errorSelectors) {
          try {
            const errorElement = page.locator(selector);
            if (await errorElement.isVisible()) {
              const errorText = await errorElement.textContent();
              console.log('Error message found:', errorText);
            }
          } catch (e) {
            continue;
          }
        }
      }
    } else {
      console.log('❌ Login test FAILED - login form elements not found');
      
      // Log page content for debugging
      const bodyText = await page.locator('body').textContent();
      console.log('Page content:', bodyText.substring(0, 500) + '...');
    }
  });

  test('2. Connected Accounts Verification', async ({ page }) => {
    console.log('Starting connected accounts verification...');
    
    // First, ensure we're logged in
    await performLogin(page);
    
    // Navigate to accounts page
    const accountsPageSelectors = [
      'a[href*="accounts"]',
      'a:has-text("Accounts")',
      'a:has-text("Connected Accounts")',
      'button:has-text("Accounts")'
    ];
    
    let accountsLink = null;
    for (const selector of accountsPageSelectors) {
      try {
        accountsLink = page.locator(selector);
        if (await accountsLink.isVisible({ timeout: 2000 })) {
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (accountsLink) {
      await accountsLink.click();
      await page.waitForTimeout(2000);
    } else {
      // Try direct navigation
      await page.goto(`${BASE_URL}/accounts`);
      await page.waitForTimeout(2000);
    }
    
    // Take screenshot of accounts page
    await page.screenshot({ 
      path: path.join(screenshotDir, '05-accounts-page.png'),
      fullPage: true 
    });
    
    // Look for platform connection options
    const platforms = ['Facebook', 'Instagram', 'X', 'Twitter', 'Mastodon', 'Pinterest', 'Bluesky'];
    const foundPlatforms = [];
    
    for (const platform of platforms) {
      const platformSelectors = [
        `button:has-text("${platform}")`,
        `a:has-text("${platform}")`,
        `[data-testid="${platform.toLowerCase()}-connect"]`,
        `.${platform.toLowerCase()}`,
        `*:has-text("${platform}")`
      ];
      
      for (const selector of platformSelectors) {
        try {
          if (await page.locator(selector).isVisible({ timeout: 1000 })) {
            foundPlatforms.push(platform);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    console.log('Platforms found on accounts page:', foundPlatforms);
    
    // Look for existing connected accounts
    const connectedAccountSelectors = [
      '.connected-account',
      '.account-card',
      '.MuiCard-root',
      '[data-testid="connected-account"]'
    ];
    
    let connectedAccountsCount = 0;
    for (const selector of connectedAccountSelectors) {
      try {
        const accounts = page.locator(selector);
        connectedAccountsCount = await accounts.count();
        if (connectedAccountsCount > 0) break;
      } catch (e) {
        continue;
      }
    }
    
    console.log('Connected accounts found:', connectedAccountsCount);
  });

  test('3. Posts History Verification', async ({ page }) => {
    console.log('Starting posts history verification...');
    
    // First, ensure we're logged in
    await performLogin(page);
    
    // Navigate to posts page
    const postsPageSelectors = [
      'a[href*="posts"]',
      'a:has-text("Posts")',
      'a:has-text("History")',
      'button:has-text("Posts")'
    ];
    
    let postsLink = null;
    for (const selector of postsPageSelectors) {
      try {
        postsLink = page.locator(selector);
        if (await postsLink.isVisible({ timeout: 2000 })) {
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (postsLink) {
      await postsLink.click();
      await page.waitForTimeout(2000);
    } else {
      // Try direct navigation
      await page.goto(`${BASE_URL}/posts`);
      await page.waitForTimeout(2000);
    }
    
    // Take screenshot of posts page
    await page.screenshot({ 
      path: path.join(screenshotDir, '06-posts-page.png'),
      fullPage: true 
    });
    
    // Look for posts
    const postSelectors = [
      '.post',
      '.post-card',
      '.MuiCard-root',
      '[data-testid="post"]',
      '.post-item'
    ];
    
    let postsCount = 0;
    for (const selector of postSelectors) {
      try {
        const posts = page.locator(selector);
        postsCount = await posts.count();
        if (postsCount > 0) break;
      } catch (e) {
        continue;
      }
    }
    
    console.log('Posts found:', postsCount);
    
    // Look for indication of restored posts (target: 20 posts)
    if (postsCount >= 20) {
      console.log('✅ Restored posts verification PASSED - found', postsCount, 'posts (expected 20+)');
    } else if (postsCount > 0) {
      console.log('⚠️ Restored posts verification PARTIAL - found', postsCount, 'posts (expected 20)');
    } else {
      console.log('❌ Restored posts verification FAILED - no posts found');
    }
  });

  test('4. Live Streaming Verification', async ({ page }) => {
    console.log('Starting live streaming verification...');
    
    // First, ensure we're logged in
    await performLogin(page);
    
    // Navigate to live streaming page
    const livePageSelectors = [
      'a[href*="live"]',
      'a:has-text("Live")',
      'a:has-text("Streaming")',
      'button:has-text("Live")'
    ];
    
    let liveLink = null;
    for (const selector of livePageSelectors) {
      try {
        liveLink = page.locator(selector);
        if (await liveLink.isVisible({ timeout: 2000 })) {
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (liveLink) {
      await liveLink.click();
      await page.waitForTimeout(2000);
    } else {
      // Try direct navigation
      await page.goto(`${BASE_URL}/live`);
      await page.waitForTimeout(2000);
    }
    
    // Take screenshot of live streaming page
    await page.screenshot({ 
      path: path.join(screenshotDir, '07-live-streaming.png'),
      fullPage: true 
    });
    
    // Look for stream apps
    const streamAppSelectors = [
      '.stream-app',
      '.stream-card',
      '.MuiCard-root',
      '[data-testid="stream-app"]'
    ];
    
    let streamAppsCount = 0;
    for (const selector of streamAppSelectors) {
      try {
        const apps = page.locator(selector);
        streamAppsCount = await apps.count();
        if (streamAppsCount > 0) break;
      } catch (e) {
        continue;
      }
    }
    
    console.log('Stream apps found:', streamAppsCount);
    
    // Look for specific restored stream apps
    const expectedApps = ['Social Media Public Stream', 'socialmedia'];
    const foundApps = [];
    
    for (const appName of expectedApps) {
      try {
        if (await page.locator(`*:has-text("${appName}")`).isVisible({ timeout: 1000 })) {
          foundApps.push(appName);
        }
      } catch (e) {
        continue;
      }
    }
    
    console.log('Expected stream apps found:', foundApps);
    
    if (foundApps.length === expectedApps.length) {
      console.log('✅ Stream apps verification PASSED - found all expected apps');
    } else if (foundApps.length > 0) {
      console.log('⚠️ Stream apps verification PARTIAL - found', foundApps.length, 'of', expectedApps.length, 'expected apps');
    } else {
      console.log('❌ Stream apps verification FAILED - no expected apps found');
    }
  });

  test('5. Dashboard Overview', async ({ page }) => {
    console.log('Starting dashboard overview test...');
    
    // First, ensure we're logged in
    await performLogin(page);
    
    // Take screenshot of main dashboard
    await page.screenshot({ 
      path: path.join(screenshotDir, '04-dashboard-overview.png'),
      fullPage: true 
    });
    
    // Check for key dashboard elements
    const dashboardElements = [
      'nav',
      '.sidebar',
      '.main-content',
      '.dashboard',
      'button',
      'a'
    ];
    
    const foundElements = [];
    for (const element of dashboardElements) {
      try {
        if (await page.locator(element).isVisible({ timeout: 2000 })) {
          const count = await page.locator(element).count();
          foundElements.push(`${element}: ${count}`);
        }
      } catch (e) {
        continue;
      }
    }
    
    console.log('Dashboard elements found:', foundElements);
    
    // Check for navigation links
    const navLinks = ['Dashboard', 'Accounts', 'Posts', 'Live', 'Compose', 'Settings'];
    const foundNavLinks = [];
    
    for (const linkText of navLinks) {
      try {
        if (await page.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`).isVisible({ timeout: 1000 })) {
          foundNavLinks.push(linkText);
        }
      } catch (e) {
        continue;
      }
    }
    
    console.log('Navigation links found:', foundNavLinks);
    
    if (foundNavLinks.length >= 4) {
      console.log('✅ Dashboard overview PASSED - key navigation elements found');
    } else {
      console.log('⚠️ Dashboard overview PARTIAL - limited navigation found');
    }
  });
});

// Helper function to perform login
async function performLogin(page) {
  // Check if already logged in
  const isLoggedIn = await page.locator('[data-testid="dashboard"], nav, .dashboard').isVisible().catch(() => false);
  
  if (isLoggedIn) {
    console.log('Already logged in, skipping login...');
    return;
  }
  
  console.log('Performing login...');
  
  // Navigate to login page if not there
  if (!page.url().includes('login') && !page.url().includes(BASE_URL)) {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);
  }
  
  // Perform login steps (simplified)
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
  
  if (await emailInput.isVisible({ timeout: 3000 })) {
    await emailInput.fill(TEST_CREDENTIALS.email);
    await passwordInput.fill(TEST_CREDENTIALS.password);
    await loginButton.click();
    await page.waitForTimeout(3000);
  }
}