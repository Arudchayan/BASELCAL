const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('response', response => {
    if (response.url().includes('api') || response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') {
      console.log('XHR/Fetch:', response.url());
    }
  });

  try {
    await page.goto('https://vorlesungsverzeichnis.unibas.ch/de/vorlesungsverzeichnis', { waitUntil: 'domcontentloaded' });
    
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill('Machine Learning');
    await searchInput.press('Enter');
    
    // Sometimes the search button needs to be clicked
    // Let's try to find a submit or search button
    const searchBtn = page.locator('button[type="submit"], button:has-text("Suchen"), button:has-text("Search")').first();
    if (await searchBtn.count() > 0) {
      await searchBtn.click();
    }
    
    await page.waitForTimeout(3000);
    
  } catch (err) {
    console.error(err.message);
  } finally {
    await browser.close();
  }
})();
