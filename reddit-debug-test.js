const { chromium } = require('playwright');

async function testRedditPosting() {
  console.log('🚀 Starting Reddit posting debug test...');
  
  // Launch browser with console logging
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true,
    slowMo: 1000 // Slow down for better observation
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: new Date().toISOString()
    };
    consoleLogs.push(logEntry);
    console.log(`[${logEntry.type.toUpperCase()}] ${logEntry.text}`);
  });
  
  // Capture network requests
  const networkLogs = [];
  page.on('request', request => {
    if (request.url().includes('reddit')) {
      networkLogs.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('reddit')) {
      networkLogs.push({
        type: 'response',
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  try {
    console.log('📱 Navigating to localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('🔍 Looking for Reddit tab...');
    // Check if Reddit tab exists
    const redditTab = await page.locator('a[href="#/reddit"], a[href="/reddit"], text=Reddit').first();
    const isRedditTabVisible = await redditTab.isVisible();
    console.log(`Reddit tab visible: ${isRedditTabVisible}`);
    
    if (isRedditTabVisible) {
      console.log('🎯 Clicking Reddit tab...');
      await redditTab.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('🔍 Reddit tab not found, trying direct navigation...');
      await page.goto('http://localhost:3000/#/reddit');
      await page.waitForLoadState('networkidle');
    }
    
    console.log('📋 Current URL:', page.url());
    
    // Wait for Reddit page to load
    await page.waitForTimeout(3000);
    
    console.log('🔍 Looking for Reddit accounts or publish button...');
    
    // Check for various possible selectors for Reddit accounts/publish buttons
    const possibleSelectors = [
      'button:has-text("Publish")',
      'button:has-text("Post")',
      '[data-testid="publish-button"]',
      '.reddit-account',
      '.social-account',
      'button[aria-label*="publish"]',
      'button[aria-label*="post"]'
    ];
    
    let publishButton = null;
    for (const selector of possibleSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        publishButton = element;
        console.log(`✅ Found publish button with selector: ${selector}`);
        break;
      }
    }
    
    if (!publishButton) {
      console.log('❌ No publish button found. Checking page content...');
      const pageContent = await page.content();
      console.log('Page title:', await page.title());
      
      // Log any Reddit-related elements
      const redditElements = await page.locator('*').evaluateAll(elements => 
        elements.filter(el => 
          el.textContent?.toLowerCase().includes('reddit') ||
          el.className?.toLowerCase().includes('reddit') ||
          el.id?.toLowerCase().includes('reddit')
        ).map(el => ({
          tag: el.tagName,
          text: el.textContent?.substring(0, 100),
          className: el.className,
          id: el.id
        }))
      );
      
      console.log('Reddit-related elements found:', redditElements);
      
      // Check if there are any social accounts
      const accountElements = await page.locator('.account, .social-account, [data-testid*="account"]').count();
      console.log(`Account elements found: ${accountElements}`);
      
      if (accountElements === 0) {
        console.log('🔍 No Reddit accounts found. Checking if user needs to connect Reddit first...');
        
        // Look for connect/add account buttons
        const connectButtons = await page.locator('button:has-text("Connect"), button:has-text("Add Account"), button:has-text("Connect Reddit")').count();
        console.log(`Connect buttons found: ${connectButtons}`);
        
        if (connectButtons > 0) {
          console.log('ℹ️ Found connect buttons - user needs to connect Reddit account first');
        }
      }
    } else {
      console.log('🎯 Clicking publish button...');
      await publishButton.click();
      await page.waitForTimeout(2000);
      
      console.log('📝 Looking for title and content fields...');
      
      // Look for title field
      const titleField = page.locator('input[placeholder*="title"], input[name="title"], [data-testid="title-field"]').first();
      const titleFieldVisible = await titleField.isVisible();
      console.log(`Title field visible: ${titleFieldVisible}`);
      
      if (titleFieldVisible) {
        console.log('✍️ Filling title field...');
        await titleField.fill('Test Reddit Post Title - Debug Session');
        
        // Look for content field - could be WYSIWYG editor or textarea
        const contentSelectors = [
          'textarea[placeholder*="content"], textarea[name="content"]',
          '[data-testid="content-field"]',
          '.ql-editor', // Quill editor
          '.DraftEditor-editorContainer', // Draft.js editor
          '[contenteditable="true"]',
          'textarea'
        ];
        
        let contentField = null;
        for (const selector of contentSelectors) {
          const element = page.locator(selector).first();
          if (await element.isVisible()) {
            contentField = element;
            console.log(`✅ Found content field with selector: ${selector}`);
            break;
          }
        }
        
        if (contentField) {
          console.log('✍️ Filling content field...');
          
          // Check if it's a WYSIWYG editor
          const isContentEditable = await contentField.getAttribute('contenteditable');
          if (isContentEditable === 'true') {
            // WYSIWYG editor
            await contentField.click();
            await contentField.fill('This is test content for Reddit post debugging. This should appear in the Reddit post body.');
          } else {
            // Regular textarea
            await contentField.fill('This is test content for Reddit post debugging. This should appear in the Reddit post body.');
          }
          
          // Wait a moment for any auto-save or processing
          await page.waitForTimeout(1000);
          
          console.log('📤 Looking for submit button...');
          const submitButton = page.locator('button:has-text("Submit"), button:has-text("Post"), button:has-text("Publish"), button[type="submit"]').first();
          const submitButtonVisible = await submitButton.isVisible();
          console.log(`Submit button visible: ${submitButtonVisible}`);
          
          if (submitButtonVisible) {
            console.log('🚀 Submitting post...');
            
            // Clear console logs before submission to capture submission-specific logs
            console.log('\n=== CLEARING LOGS BEFORE SUBMISSION ===\n');
            consoleLogs.length = 0;
            networkLogs.length = 0;
            
            await submitButton.click();
            
            // Wait for submission to complete
            await page.waitForTimeout(5000);
            
            console.log('\n=== POST-SUBMISSION ANALYSIS ===\n');
            
            // Check for success/error messages
            const successMessage = await page.locator('text=/success|posted|submitted/i').first().isVisible();
            const errorMessage = await page.locator('text=/error|failed|invalid/i').first().isVisible();
            
            console.log(`Success message visible: ${successMessage}`);
            console.log(`Error message visible: ${errorMessage}`);
            
          } else {
            console.log('❌ Submit button not found');
          }
        } else {
          console.log('❌ Content field not found');
        }
      } else {
        console.log('❌ Title field not found');
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    // Log captured data
    console.log('\n=== CONSOLE LOGS CAPTURED ===\n');
    consoleLogs.forEach((log, index) => {
      console.log(`${index + 1}. [${log.type}] ${log.timestamp}: ${log.text}`);
    });
    
    console.log('\n=== NETWORK LOGS CAPTURED ===\n');
    networkLogs.forEach((log, index) => {
      console.log(`${index + 1}. [${log.type}] ${log.timestamp}: ${log.url} (${log.method || log.status})`);
      if (log.postData) {
        console.log(`   POST Data: ${log.postData}`);
      }
    });
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will remain open for manual inspection. Press Enter to close...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', async () => {
      await browser.close();
      process.exit(0);
    });
  }
}

testRedditPosting().catch(console.error);