const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-http2'] 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Step 1: Navigating to the course directory...');
    // We try to catch potential HTTP/2 protocol errors by disabling it or handling it gracefully
    await page.goto('https://vorlesungsverzeichnis.unibas.ch/en/home', { waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: 'step1_homepage.png' });
    console.log('Screenshot saved: step1_homepage.png');

    console.log('Step 2: Searching for "Machine Learning"...');
    // The search input on Unibas directory is usually a standard input field.
    // We look for an input field that might be the search bar.
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill('Machine Learning');
    await page.screenshot({ path: 'step2_search_entered.png' });
    console.log('Screenshot saved: step2_search_entered.png');

    console.log('Step 3: Executing search and waiting for results...');
    await searchInput.press('Enter');
    
    // Wait for the results to load (wait for network idle or a specific element)
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'step3_results.png' });
    console.log('Screenshot saved: step3_results.png');

    console.log('Step 4: Clicking on a course...');
    // Click the first link that looks like a course detail page
    const courseLink = page.locator('a[href*="details?id="]').first();
    if (await courseLink.count() > 0) {
      await courseLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'step4_course_details.png' });
      console.log('Screenshot saved: step4_course_details.png');
    } else {
      console.log('No course links found in results.');
    }

  } catch (err) {
    console.error('Error during scraping workflow:', err.message);
    await page.screenshot({ path: 'error_state.png' });
    console.log('Saved error_state.png');
  } finally {
    await browser.close();
    console.log('Workflow complete.');
  }
})();
