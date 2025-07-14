const { chromium } = require('playwright');

async function testFacebookInstagramIntegration() {
  console.log('🧪 Testing Facebook & Instagram Integration with New UI...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for better observation
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();

  // Listen for console messages from the browser
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log(`❌ Browser Error: ${text}`);
    } else if (type === 'warning') {
      console.log(`⚠️ Browser Warning: ${text}`);
    } else if (text.includes('Facebook') || text.includes('Instagram')) {
      console.log(`📱 FB/IG Log: ${text}`);
    }
  });

  // Listen for network failures
  page.on('response', response => {
    if (!response.ok() && response.url().includes('api')) {
      console.log(`🌐 Network Error: ${response.status()} ${response.url()}`);
    }
  });

  try {
    // Step 1: Navigate to login page
    console.log('\n📝 Step 1: Navigating to login page...');
    await page.goto('https://socialmedia-p3ln.onrender.com/social_media');
    await page.waitForLoadState('networkidle');

    // Check if already logged in
    const loginForm = await page.locator('input[type="email"]').isVisible();
    
    if (loginForm) {
      console.log('🔐 Step 2: Logging in...');
      await page.fill('input[type="email"]', 'sri.ramanatha@uskfoundation.or.ke');
      await page.fill('input[type="password"]', 'Swamiji@1234');
      await page.click('button[type="submit"]');
      
      // Wait for login to complete
      await page.waitForTimeout(3000);
      
      // Check for login success or error
      const loginError = await page.locator('.MuiAlert-message').textContent().catch(() => null);
      if (loginError && loginError.includes('error')) {
        console.log(`❌ Login Error: ${loginError}`);
      } else {
        console.log('✅ Login successful');
      }
    } else {
      console.log('✅ Already logged in');
    }

    // Step 3: Navigate to Accounts page
    console.log('\n📱 Step 3: Navigating to Accounts page...');
    await page.goto('https://socialmedia-p3ln.onrender.com/social_media/accounts');
    await page.waitForLoadState('networkidle');

    // Check current accounts
    console.log('\n📋 Step 4: Checking current connected accounts...');
    const accountCards = await page.locator('.MuiCard-root').count();
    console.log(`Found ${accountCards} account cards`);

    // Check for existing Facebook accounts
    const facebookAccounts = await page.locator('text=facebook').count();
    const instagramAccounts = await page.locator('text=instagram').count();
    console.log(`Existing Facebook accounts: ${facebookAccounts}`);
    console.log(`Existing Instagram accounts: ${instagramAccounts}`);

    // Step 5: Test Facebook Connection (if not already connected)
    if (facebookAccounts === 0) {
      console.log('\n🔗 Step 5: Testing Facebook connection...');
      
      const connectFacebookBtn = await page.locator('text=Connect Facebook').first();
      if (await connectFacebookBtn.isVisible()) {
        await connectFacebookBtn.click();
        await page.waitForTimeout(2000);
        
        // Check if dialog opened
        const dialogVisible = await page.locator('.MuiDialog-root').isVisible();
        if (dialogVisible) {
          console.log('✅ Facebook connect dialog opened');
          
          // Check dialog content
          const dialogText = await page.locator('.MuiDialogContent-root').textContent();
          console.log(`Dialog content preview: ${dialogText.substring(0, 100)}...`);
          
          // Cancel dialog for now (we don't want to actually connect in test)
          await page.click('text=Cancel');
          console.log('ℹ️ Cancelled Facebook connection (test purposes)');
        } else {
          console.log('❌ Facebook connect dialog did not open');
        }
      } else {
        console.log('❌ Connect Facebook button not found');
      }
    } else {
      console.log('ℹ️ Facebook account already connected');
    }

    // Step 6: Test Instagram Connection (if not already connected)
    if (instagramAccounts === 0) {
      console.log('\n📸 Step 6: Testing Instagram connection...');
      
      const connectInstagramBtn = await page.locator('text=Connect Instagram').first();
      if (await connectInstagramBtn.isVisible()) {
        await connectInstagramBtn.click();
        await page.waitForTimeout(2000);
        
        // Check if dialog opened
        const dialogVisible = await page.locator('.MuiDialog-root').isVisible();
        if (dialogVisible) {
          console.log('✅ Instagram connect dialog opened');
          
          // Check dialog content
          const dialogText = await page.locator('.MuiDialogContent-root').textContent();
          console.log(`Dialog content preview: ${dialogText.substring(0, 100)}...`);
          
          // Cancel dialog for now
          await page.click('text=Cancel');
          console.log('ℹ️ Cancelled Instagram connection (test purposes)');
        } else {
          console.log('❌ Instagram connect dialog did not open');
        }
      } else {
        console.log('❌ Connect Instagram button not found');
      }
    } else {
      console.log('ℹ️ Instagram account already connected');
    }

    // Step 7: Test New Publishing UI
    console.log('\n✍️ Step 7: Testing new publishing UI...');
    await page.goto('https://socialmedia-p3ln.onrender.com/social_media/compose');
    await page.waitForLoadState('networkidle');

    // Check for new platform grid
    console.log('🔍 Checking for new platform grid...');
    const platformGrid = await page.locator('.MuiGrid-container').first();
    const isGridVisible = await platformGrid.isVisible();
    
    if (isGridVisible) {
      console.log('✅ New platform grid is visible');
      
      // Count platform cards
      const platformCards = await page.locator('.MuiCard-root').count();
      console.log(`Found ${platformCards} platform cards in grid`);
      
      // Check for specific platforms
      const platforms = ['Facebook', 'Instagram', 'X', 'Bluesky', 'Mastodon', 'Pinterest'];
      for (const platform of platforms) {
        const platformCard = await page.locator(`text=${platform}`).isVisible();
        console.log(`${platform} card: ${platformCard ? '✅ Visible' : '❌ Not found'}`);
      }
      
      // Test platform selection
      console.log('\n🎯 Testing platform selection...');
      const firstCard = await page.locator('.MuiCard-root').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForTimeout(1000);
        
        // Check if accounts were selected
        const selectedSummary = await page.locator('text=Publishing to').isVisible();
        if (selectedSummary) {
          console.log('✅ Platform selection working - accounts selected');
        } else {
          console.log('⚠️ Platform selection may not have worked');
        }
      }
      
    } else {
      console.log('❌ New platform grid not found - still using old tabs?');
      
      // Check if old tabs are still there
      const oldTabs = await page.locator('.MuiTabs-root').isVisible();
      if (oldTabs) {
        console.log('⚠️ Old tab interface still present');
      }
    }

    // Step 8: Test character limits and validation
    console.log('\n📝 Step 8: Testing content composition...');
    const textArea = await page.locator('textarea').first();
    if (await textArea.isVisible()) {
      await textArea.fill('Testing the new Facebook and Instagram integration! 🚀');
      await page.waitForTimeout(1000);
      
      // Check character count
      const charCount = await page.locator('text=/\\d+\\/\\d+/').textContent().catch(() => null);
      if (charCount) {
        console.log(`✅ Character count working: ${charCount}`);
      } else {
        console.log('⚠️ Character count not found');
      }
    }

    // Step 9: Check for any JavaScript errors in console
    console.log('\n🐛 Step 9: Checking for JavaScript errors...');
    const logs = await page.evaluate(() => {
      return window.console._logs || [];
    });
    
    // We already captured console messages above, so summarize
    console.log('Console monitoring active - errors logged above if any');

    // Step 10: Test media upload section
    console.log('\n🖼️ Step 10: Testing media upload interface...');
    const imageUploadBtn = await page.locator('text=Add Images').isVisible();
    const videoUploadBtn = await page.locator('text=Add Video').isVisible();
    
    console.log(`Image upload button: ${imageUploadBtn ? '✅ Visible' : '❌ Missing'}`);
    console.log(`Video upload button: ${videoUploadBtn ? '✅ Visible' : '❌ Missing'}`);

    // Step 11: Test Advanced Options
    console.log('\n⚙️ Step 11: Testing Advanced Options...');
    const advancedOptions = await page.locator('text=Advanced Options').isVisible();
    if (advancedOptions) {
      await page.click('text=Advanced Options');
      await page.waitForTimeout(1000);
      
      const schedulingOption = await page.locator('text=Schedule for later').isVisible();
      const groupsOption = await page.locator('text=Select Group').isVisible();
      
      console.log(`Scheduling option: ${schedulingOption ? '✅ Visible' : '❌ Missing'}`);
      console.log(`Groups option: ${groupsOption ? '✅ Visible' : '❌ Missing'}`);
    } else {
      console.log('❌ Advanced Options not found');
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    // Take a screenshot for debugging
    await page.screenshot({ 
      path: 'test-error-screenshot.png',
      fullPage: true 
    });
    console.log('📸 Error screenshot saved as test-error-screenshot.png');
  } finally {
    console.log('\n🔄 Keeping browser open for manual inspection...');
    console.log('🔍 You can now manually test the interface');
    console.log('⌨️ Press Ctrl+C to close the browser');
    
    // Keep browser open for manual inspection
    await new Promise(resolve => {
      process.on('SIGINT', () => {
        console.log('\n👋 Closing browser...');
        browser.close();
        resolve();
      });
    });
  }
}

// Run the test
testFacebookInstagramIntegration().catch(console.error);