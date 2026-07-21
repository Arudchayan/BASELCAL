const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const page = await browser.newPage();

  for (const url of [
    'https://vorlesungsverzeichnis.unibas.ch/en/course-directory?search=1&keyword=77778',
    'https://vorlesungsverzeichnis.unibas.ch/en/course-directory?periode=202605&search=1&keyword=77778',
    'https://vorlesungsverzeichnis.unibas.ch/en/course-directory?periode=2026005&search=1&keyword=77778',
  ]) {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    const count = await page.locator('#resultTable tbody tr').count();
    const sem = await page.locator('select, [role=combobox]').first().innerText().catch(() => 'n/a');
    console.log(url.split('?')[1], 'rows', count, 'sem', sem.slice(0, 40));
  }

  // Try selecting spring via UI
  await page.goto('https://vorlesungsverzeichnis.unibas.ch/en/course-directory?search=1&keyword=77778', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const selects = await page.evaluate(() => [...document.querySelectorAll('select')].map(s => ({name: s.name, id: s.id, options: [...s.options].map(o => ({v:o.value, t:o.text}))})));
  console.log('selects', JSON.stringify(selects, null, 2));

  await browser.close();
})();
