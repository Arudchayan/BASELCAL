const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const page = await browser.newPage();
  await page.goto('https://vorlesungsverzeichnis.unibas.ch/en/course-directory?id=301338', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    const panels = [...document.querySelectorAll('.panel, .accordion, [id*="collapse"], .tab-pane, section')].map((el) => ({
      tag: el.tagName,
      id: el.id,
      class: el.className,
      text: el.innerText?.slice(0, 1500),
    }));
    const tables = [...document.querySelectorAll('table')].map((t) => t.innerText.slice(0, 3000));
    return {
      title: document.querySelector('h2')?.innerText,
      body: document.body.innerText.slice(0, 8000),
      tables,
      panels: panels.filter((p) => p.text && p.text.length > 20).slice(0, 15),
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
