const { chromium } = require('playwright');

async function testManualLogin() {
  console.log('Testing with manual token injection...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Get a valid token from the API first
    console.log('Getting valid login token...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'sri.ramanatha@uskfoundation.or.ke',
        password: 'Swamiji@1234'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login API response:', loginData.user ? 'Success' : 'Failed');
    
    if (!loginData.token) {
      throw new Error('Failed to get login token');
    }
    
    // Navigate to the app
    console.log('Navigating to app...');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Inject the token into localStorage
    console.log('Injecting token into localStorage...');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, loginData.token);
    
    // Navigate to dashboard to trigger authenticated state
    console.log('Navigating to dashboard...');
    await page.goto('http://localhost:3001/#/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of dashboard
    await page.screenshot({ path: '/root/social_media/test-results/manual-dashboard.png', fullPage: true });
    
    console.log('Current URL:', page.url());
    const isLoggedIn = !page.url().includes('#/login');
    console.log('Successfully bypassed login:', isLoggedIn);
    
    if (isLoggedIn) {
      console.log('\n=== Testing All App Sections ===');
      
      // Test Accounts Page
      console.log('Testing accounts page...');
      await page.goto('http://localhost:3001/#/accounts');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Allow time for data to load
      await page.screenshot({ path: '/root/social_media/test-results/manual-accounts.png', fullPage: true });
      
      // Check for platform options
      const facebookElements = await page.locator('text=Facebook').count();
      const instagramElements = await page.locator('text=Instagram').count();
      const twitterElements = await page.locator('text=Twitter').count();
      const xElements = await page.locator('text=/\\bX\\b/').count();
      const mastodonElements = await page.locator('text=Mastodon').count();
      const pinterestElements = await page.locator('text=Pinterest').count();
      const connectButtons = await page.locator('button:has-text("Connect")').count();
      
      console.log('Platform options found:');
      console.log('- Facebook:', facebookElements);
      console.log('- Instagram:', instagramElements); 
      console.log('- Twitter:', twitterElements);
      console.log('- X:', xElements);
      console.log('- Mastodon:', mastodonElements);
      console.log('- Pinterest:', pinterestElements);
      console.log('- Connect buttons:', connectButtons);
      
      // Test Posts Page
      console.log('\\nTesting posts page...');
      await page.goto('http://localhost:3001/#/posts');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/root/social_media/test-results/manual-posts.png', fullPage: true });
      
      // Count posts
      const postCards = await page.locator('.MuiCard-root, .post, [data-testid="post"]').count();
      const postElements = await page.locator('text=/post|publish|schedule/i').count();
      console.log('Post-related elements found:', postElements);
      console.log('Post cards found:', postCards);
      
      // Test Live Streaming Page
      console.log('\\nTesting live streaming page...');
      await page.goto('http://localhost:3001/#/live');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/root/social_media/test-results/manual-live.png', fullPage: true });
      
      // Check streaming elements
      const streamApps = await page.locator('text=/stream app|rtmp|nimble/i').count();
      const startStreamButtons = await page.locator('button:has-text("START STREAM"), button:has-text("Create Stream")').count();
      
      console.log('Streaming elements found:');
      console.log('- Stream-related text:', streamApps);
      console.log('- Stream action buttons:', startStreamButtons);
      
      // Test Stream Apps Page
      console.log('\\nTesting stream apps page...');
      try {
        await page.goto('http://localhost:3001/#/stream-apps');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/root/social_media/test-results/manual-stream-apps.png', fullPage: true });
        
        const appCards = await page.locator('.MuiCard-root, .app-card').count();
        console.log('Stream app cards found:', appCards);
      } catch (e) {
        console.log('Stream apps page not accessible');
      }
      
      // Check navigation menu
      console.log('\\nAnalyzing navigation menu...');
      const navLinks = await page.locator('nav a, .nav-link').count();
      console.log('Navigation links found:', navLinks);
      
      // Get all visible text to analyze features
      const pageText = await page.textContent('body');
      const hasLiveStreaming = pageText.includes('live') || pageText.includes('stream');
      const hasSocialConnections = pageText.includes('Connect') || pageText.includes('Facebook') || pageText.includes('Instagram');
      const hasPostManagement = pageText.includes('post') || pageText.includes('publish');
      
      return {
        loginSuccessful: true,
        platforms: {
          facebook: facebookElements > 0,
          instagram: instagramElements > 0,
          twitter: twitterElements > 0,
          x: xElements > 0,
          mastodon: mastodonElements > 0,
          pinterest: pinterestElements > 0
        },
        connectButtons: connectButtons,
        posts: {
          elements: postElements,
          cards: postCards
        },
        streaming: {
          elements: streamApps,
          buttons: startStreamButtons
        },
        features: {
          liveStreaming: hasLiveStreaming,
          socialConnections: hasSocialConnections,
          postManagement: hasPostManagement
        },
        navigation: navLinks
      };
      
    } else {
      return { loginSuccessful: false, error: 'Manual login failed' };
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: '/root/social_media/test-results/manual-error.png', fullPage: true });
    return { loginSuccessful: false, error: error.message };
  } finally {
    await browser.close();
  }
}

// Run test
testManualLogin().then(result => {
  console.log('\\n=== COMPREHENSIVE TEST RESULTS ===');
  console.log('Login successful:', result.loginSuccessful);
  
  if (result.loginSuccessful) {
    console.log('\\n🔗 Platform Connections Available:');
    Object.entries(result.platforms).forEach(([platform, available]) => {
      console.log(`  ${available ? '✅' : '❌'} ${platform.charAt(0).toUpperCase() + platform.slice(1)}`);
    });
    
    console.log('\\n📝 Content Management:');
    console.log(`  Posts found: ${result.posts.elements} elements, ${result.posts.cards} cards`);
    
    console.log('\\n📺 Live Streaming:');
    console.log(`  Streaming elements: ${result.streaming.elements}`);
    console.log(`  Action buttons: ${result.streaming.buttons}`);
    
    console.log('\\n🎛️ App Features:');
    console.log(`  Live streaming functionality: ${result.features.liveStreaming ? '✅' : '❌'}`);
    console.log(`  Social media connections: ${result.features.socialConnections ? '✅' : '❌'}`);
    console.log(`  Post management: ${result.features.postManagement ? '✅' : '❌'}`);
    
    console.log(`\\n🧭 Navigation: ${result.navigation} links found`);
    console.log(`\\n🔗 Connect buttons: ${result.connectButtons} found`);
  } else {
    console.log('❌ Error:', result.error);
  }
}).catch(console.error);