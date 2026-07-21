const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const page = await browser.newPage();
  await page.goto('https://vorlesungsverzeichnis.unibas.ch/en/course-directory?id=302796', { waitUntil: 'networkidle' });
  await page.click('text=Admission Requirements');
  await page.waitForTimeout(1000);
  const text = await page.evaluate(() => ({
    cond: document.querySelector('#cond')?.innerText,
    active: document.querySelector('.tab-pane.active, .tab-pane.in.active')?.id,
    allPanes: [...document.querySelectorAll('.tab-pane')].map(p => ({ id: p.id, text: p.innerText.slice(0, 500) })),
  }));
  console.log(JSON.stringify(text, null, 2));
  await browser.close();
})();
