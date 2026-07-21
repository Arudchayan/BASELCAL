const { chromium } = require('playwright');
const fs = require('fs');

async function testScraper() {
  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to course directory...');
    await page.goto('https://vorlesungsverzeichnis.unibas.ch/de/vorlesungsverzeichnis', { waitUntil: 'domcontentloaded' });
    
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Test with one specific course title
    const searchTitle = "Foundations of Artificial Intelligence";
    console.log(`Searching for: ${searchTitle}`);
    await searchInput.fill(searchTitle);
    
    // Press enter and also try to click submit if available
    await searchInput.press('Enter');
    
    console.log('Waiting for results to load...');
    await page.waitForTimeout(3000); // Give it time to search

    // Try to find the result link. The Unibas directory usually links to details?id=...
    const courseLink = page.locator('a[href*="details?id="]').first();
    
    if (await courseLink.count() > 0) {
      console.log('Found course link, clicking...');
      await courseLink.click();
      await page.waitForLoadState('networkidle');
      
      console.log('Extracting text...');
      // Extract all text on the page to see where the description is
      const text = await page.locator('body').innerText();
      console.log('Extracted text (first 500 chars):', text.substring(0, 500));
      
      fs.writeFileSync('scraped_course_test.txt', text);
    } else {
      console.log('No course link found for the search query.');
      // Take screenshot of what happened
      await page.screenshot({ path: 'search_failed.png' });
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

testScraper();
