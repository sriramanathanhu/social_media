const { chromium } = require('playwright');

async function testProductionManual() {
  console.log('🔍 Manual production test with better element detection...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  // Capture all console messages
  page.on('console', msg => {
    console.log(`🔍 Console [${msg.type().toUpperCase()}]:`, msg.text());
  });
  
  // Capture network issues
  page.on('requestfailed', request => {
    console.log('❌ Request failed:', request.url(), request.failure().errorText);
  });
  
  try {
    console.log('📱 Navigating to production site...');
    await page.goto('https://sriramanathanhu.github.io/social_media', { 
      waitUntil: 'networkidle' 
    });
    
    // Wait for page to fully load
    await page.waitForTimeout(5000);
    
    // Get all available input elements
    console.log('🔍 Searching for input elements...');
    const inputs = await page.$$eval('input', inputs => 
      inputs.map(input => ({
        type: input.type,
        placeholder: input.placeholder,
        name: input.name,
        id: input.id,
        className: input.className
      }))
    );
    console.log('📋 Found inputs:', inputs);
    
    // Try multiple selectors for email input
    const emailSelectors = [
      'input[type="email"]',
      'input[placeholder*="Email"]',
      'input[placeholder*="email"]',
      'input:first-of-type'
    ];
    
    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        emailInput = page.locator(selector);
        const count = await emailInput.count();
        console.log(`🔍 Selector "${selector}": ${count} elements found`);
        if (count > 0) {
          console.log(`✅ Using selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`❌ Selector "${selector}" failed:`, e.message);
      }
    }
    
    if (emailInput && await emailInput.count() > 0) {
      console.log('📧 Found email input, attempting login...');
      
      // Fill email
      await emailInput.fill('sri.ramanatha@uskfoundation.or.ke');
      console.log('✅ Email filled');
      
      // Find password input
      const passwordInput = page.locator('input[type="password"]');
      const passwordCount = await passwordInput.count();
      console.log('🔐 Password inputs found:', passwordCount);
      
      if (passwordCount > 0) {
        await passwordInput.fill('Swamiji@1234');
        console.log('✅ Password filled');
        
        // Find and click sign in button
        const signInSelectors = [
          'button:has-text("SIGN IN")',
          'button[type="submit"]',
          'button:contains("Sign")',
          '.signin-button',
          '[role="button"]:has-text("SIGN IN")'
        ];
        
        let signInButton = null;
        for (const selector of signInSelectors) {
          try {
            signInButton = page.locator(selector);
            const count = await signInButton.count();
            console.log(`🔍 Button selector "${selector}": ${count} elements found`);
            if (count > 0) {
              console.log(`✅ Using button selector: ${selector}`);
              break;
            }
          } catch (e) {
            console.log(`❌ Button selector "${selector}" failed:`, e.message);
          }
        }
        
        if (signInButton && await signInButton.count() > 0) {
          console.log('🔐 Clicking sign in button...');
          await signInButton.click();
          
          // Wait for response
          console.log('⏳ Waiting for login response...');
          await page.waitForTimeout(8000);
          
          // Check URL change
          const currentUrl = page.url();
          console.log('🌐 Current URL:', currentUrl);
          
          // Look for error messages
          const pageContent = await page.content();
          const hasNetworkError = pageContent.includes('Network error') || pageContent.includes('Unable to connect');
          console.log('🚨 Has network error message:', hasNetworkError);
          
          if (hasNetworkError) {
            console.log('❌ Network error detected in page content');
          }
          
          // Test API directly from browser
          console.log('🔧 Testing API call from browser...');
          const apiResult = await page.evaluate(async (credentials) => {
            try {
              console.log('Making API call with credentials:', credentials.email);
              
              const response = await fetch('https://socialmedia-p3ln.onrender.com/api/auth/login', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(credentials)
              });
              
              console.log('Response status:', response.status);
              console.log('Response headers:', Object.fromEntries(response.headers.entries()));
              
              const text = await response.text();
              console.log('Response body:', text);
              
              return {
                status: response.status,
                ok: response.ok,
                body: text,
                headers: Object.fromEntries(response.headers.entries())
              };
            } catch (error) {
              console.error('API call error:', error);
              return {
                error: error.message,
                name: error.name
              };
            }
          }, { 
            email: 'sri.ramanatha@uskfoundation.or.ke', 
            password: 'Swamiji@1234' 
          });
          
          console.log('🖥️ API Test Result:', JSON.stringify(apiResult, null, 2));
        } else {
          console.log('❌ Sign in button not found');
        }
      } else {
        console.log('❌ Password input not found');
      }
    } else {
      console.log('❌ Email input not found');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'production-manual-result.png' });
    console.log('📸 Screenshot saved');
    
    console.log('🔍 Browser staying open for manual inspection...');
    console.log('📝 Try manually logging in to see what happens');
    await page.waitForTimeout(120000); // 2 minutes
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'production-manual-error.png' });
  } finally {
    await browser.close();
  }
}

testProductionManual();