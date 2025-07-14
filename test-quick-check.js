const { chromium } = require('playwright');

async function quickCheck() {
  console.log('🔍 Quick check of current deployment...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ Browser Error: ${msg.text()}`);
    }
  });

  try {
    console.log('📍 Checking homepage...');
    await page.goto('https://socialmedia-p3ln.onrender.com/social_media');
    await page.waitForTimeout(3000);

    // Check what's actually on the page
    const title = await page.title();
    console.log(`Page title: ${title}`);

    const isLoginPage = await page.locator('input[type="email"]').isVisible();
    const isDashboard = await page.locator('text=Dashboard').isVisible();
    
    console.log(`Login form visible: ${isLoginPage}`);
    console.log(`Dashboard visible: ${isDashboard}`);

    if (isLoginPage) {
      console.log('🔐 Attempting login...');
      await page.fill('input[type="email"]', 'sri.ramanatha@uskfoundation.or.ke');
      await page.fill('input[type="password"]', 'Swamiji@1234');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Check if redirected to dashboard
      const currentUrl = page.url();
      console.log(`Current URL after login: ${currentUrl}`);
    }

    // Check accounts page directly
    console.log('📱 Checking accounts page...');
    await page.goto('https://socialmedia-p3ln.onrender.com/social_media/accounts');
    await page.waitForTimeout(3000);

    const accountsPageContent = await page.locator('body').textContent();
    console.log(`Accounts page loaded: ${accountsPageContent.includes('Connect') || accountsPageContent.includes('Account')}`);

    // Check if new Facebook/Instagram buttons exist
    const connectButtons = await page.locator('button').allTextContents();
    console.log('Available buttons:', connectButtons.filter(text => text.includes('Connect')));

    // Check compose page
    console.log('✍️ Checking compose page...');
    await page.goto('https://socialmedia-p3ln.onrender.com/social_media/compose');
    await page.waitForTimeout(3000);

    const composePageLoaded = await page.locator('text=Compose Post').isVisible();
    console.log(`Compose page loaded: ${composePageLoaded}`);

    if (composePageLoaded) {
      // Check for new grid vs old tabs
      const hasNewGrid = await page.locator('.MuiGrid-container').isVisible();
      const hasOldTabs = await page.locator('.MuiTabs-root').isVisible();
      console.log(`New platform grid: ${hasNewGrid}`);
      console.log(`Old tabs interface: ${hasOldTabs}`);
    }

    console.log('\n✅ Quick check completed');
    console.log('Browser will stay open for manual inspection...');
    
    // Keep open for inspection
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

quickCheck().catch(console.error);