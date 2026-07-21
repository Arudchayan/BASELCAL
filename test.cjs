const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);

  const html = await page.content();
  const fs = require('fs');
  fs.writeFileSync('C:\\Users\\DELL\\.gemini\\antigravity-cli\\brain\\495c701d-f9f6-4b0e-a178-81bda709c1ef\\page.html', html);
  
  const buttons = await page.getByRole('button').allInnerTexts();
  console.log('Buttons:', buttons);

  await browser.close();
})();
