const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);

  console.log('Clicking Maximize2 button...');
  const expandButtons = await page.locator('button[title="View Course Details"]').all();
  if (expandButtons.length > 0) {
    await expandButtons[0].click();
    await page.waitForTimeout(1000);
    
    console.log('Taking screenshot of modal from main planner');
    await page.screenshot({ path: 'C:\\Users\\DELL\\.gemini\\antigravity-cli\\brain\\495c701d-f9f6-4b0e-a178-81bda709c1ef\\screenshot_planner_modal.png' });
  }

  await browser.close();
})();
