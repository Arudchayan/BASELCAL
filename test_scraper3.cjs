const { chromium } = require('playwright');
const fs = require('fs');

async function testScraper() {
  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://vorlesungsverzeichnis.unibas.ch/de/vorlesungsverzeichnis', { waitUntil: 'domcontentloaded' });
    
    // Find the keyword input box specifically
    const keywordInput = page.locator('input[name="keyword"]').first();
    await keywordInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Test with one specific course title
    const searchTitle = "Foundations of Artificial Intelligence";
    console.log(`Searching for: ${searchTitle}`);
    await keywordInput.fill(searchTitle);
    
    // Submit the form
    await page.evaluate(() => {
      document.querySelector('form[name="searchform"]').submit();
    });
    
    console.log('Waiting for results to load...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); 

    const courseLink = page.locator('a[href*="details?id="]').first();
    
    if (await courseLink.count() > 0) {
      console.log('Found course link, clicking...');
      await courseLink.click();
      await page.waitForLoadState('networkidle');
      
      const text = await page.locator('body').innerText();
      console.log('Extracted text (first 500 chars):', text.substring(0, 500));
      
      // Save it
      fs.writeFileSync('german_course_text.txt', text);
    } else {
      console.log('No course link found for the search query.');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

testScraper();
