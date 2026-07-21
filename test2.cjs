const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  let crashed = false;
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Error]: ${msg.text()}`);
      crashed = true;
    }
  });
  
  page.on('pageerror', error => {
    console.log(`[Page Exception]: ${error.message}`);
    crashed = true;
  });

  console.log('Navigating to http://localhost:5173/');
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);

  const expandButtons = await page.locator('button[title="View Course Details"]').all();
  console.log(`Found ${expandButtons.length} details buttons. Clicking them all one by one...`);
  
  for (let i = 0; i < expandButtons.length; i++) {
    await expandButtons[i].click();
    await page.waitForTimeout(100);
    
    // click backdrop to close
    await page.mouse.click(10, 10);
    await page.waitForTimeout(100);
    
    if (crashed) {
      console.log(`CRASHED ON BUTTON ${i}!`);
      break;
    }
  }

  if (!crashed) {
    console.log('Successfully clicked all buttons without crashing!');
  }

  await browser.close();
})();
