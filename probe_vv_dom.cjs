const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const page = await browser.newPage();
  await page.goto('https://vorlesungsverzeichnis.unibas.ch/en/course-directory?search=1&keyword=66096', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForTimeout(4000);

  const data = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')]
      .filter((a) => a.href.includes('id='))
      .map((a) => ({ text: a.innerText.trim().slice(0, 120), href: a.href }));
    const tables = [...document.querySelectorAll('table')].map((t, i) => ({
      i,
      html: t.outerHTML.slice(0, 4000),
      text: t.innerText.slice(0, 2000),
    }));
    return {
      url: location.href,
      links,
      tableCount: tables.length,
      tables,
      bodySnippet: document.body.innerText.slice(0, 5000),
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
