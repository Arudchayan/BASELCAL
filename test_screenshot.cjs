const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);

  console.log('Taking screenshot 1 (home)');
  await page.screenshot({ path: 'screenshot1.png' });

  // Open Course Explorer
  console.log('Clicking Course Discovery...');
  const explorerBtn = page.getByRole('button', { name: /Course Discovery/i });
  if (await explorerBtn.count() > 0) {
    await explorerBtn.click();
    await page.waitForTimeout(1000);
  }

  console.log('Clicking a Read Details button...');
  const buttons = await page.getByRole('button', { name: /Read Details/i }).all();
  if (buttons.length > 0) {
    await buttons[0].click();
    await page.waitForTimeout(1000);
    
    console.log('Taking screenshot 2 (modal open)');
    await page.screenshot({ path: 'screenshot2.png' });
    
    console.log('Clicking the close X button or backdrop...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    console.log('Taking screenshot 3 (modal closed)');
    await page.screenshot({ path: 'screenshot3.png' });
  } else {
    console.log('No Read Details button found.');
  }

  await browser.close();
})();
