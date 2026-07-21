const { chromium } = require('playwright');
const fs = require('fs');

// Try older semesters where courses may still be listed
const SEMESTERS = [
  'https://vorlesungsverzeichnis.unibas.ch/de/vorlesungsverzeichnis?semester=20252', // FS2025
  'https://vorlesungsverzeichnis.unibas.ch/de/vorlesungsverzeichnis?semester=20251', // HS2025
  'https://vorlesungsverzeichnis.unibas.ch/de/vorlesungsverzeichnis?semester=20242', // FS2024
];

const SAMPLE_CODES = ['10489', '66096', '17165', '45402', '20980', '10906', '77777', '77778'];

async function tryDetailPage(page, code) {
  const urls = [
    `https://vorlesungsverzeichnis.unibas.ch/de/details?id=${code}`,
    `https://vorlesungsverzeichnis.unibas.ch/en/details?id=${code}`,
  ];
  for (const url of urls) {
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const text = await page.locator('body').innerText();
      if (res?.status() === 200 && !text.includes('404') && !text.includes('nicht gefunden')) {
        return { url, status: res.status(), text: text.slice(0, 3000) };
      }
    } catch (_) {}
  }
  return null;
}

async function trySearch(page, code, semesterUrl) {
  await page.goto(semesterUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1500);

  // Try semester selector if present
  const semSelect = page.locator('select').first();
  if (await semSelect.count()) {
    // leave default
  }

  const input = page.locator('input[name="keyword"], input[type="text"], input[type="search"]').first();
  if (!(await input.count())) return null;

  await input.fill(code);
  await input.press('Enter');
  await page.waitForTimeout(2500);

  const body = await page.locator('body').innerText();
  const links = await page.locator('a[href*="details"]').all();
  const hrefs = [];
  for (const l of links.slice(0, 5)) {
    hrefs.push(await l.getAttribute('href'));
  }

  return { bodyPreview: body.slice(0, 1500), links: hrefs, hasResults: !body.includes('Keine Resultate') && links.length > 0 };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const page = await browser.newPage();
  const results = { detailPages: {}, searches: {} };

  console.log('=== LIVE UNIBAS DATA VERIFICATION ===\n');

  for (const code of SAMPLE_CODES) {
    console.log(`Code ${code}:`);
    const detail = await tryDetailPage(page, code);
    if (detail) {
      console.log(`  ✓ Detail page found: ${detail.url}`);
      results.detailPages[code] = { found: true, snippet: detail.text.slice(0, 500) };
      // Try to extract CP/ECTS from text
      const cpMatch = detail.text.match(/(\d+)\s*(CP|ECTS|Credits)/i);
      if (cpMatch) console.log(`    CP mention: ${cpMatch[0]}`);
    } else {
      console.log(`  ✗ No detail page (404)`);
      results.detailPages[code] = { found: false };
    }
  }

  console.log('\n--- Semester search attempts ---');
  for (const semUrl of SEMESTERS) {
    console.log(`\nSemester: ${semUrl}`);
    for (const code of ['66096', '77778']) {
      const r = await trySearch(page, code, semUrl);
      console.log(`  ${code}: ${r ? (r.hasResults ? `found ${r.links.length} links` : 'no results') : 'search failed'}`);
      if (r?.links?.length) console.log(`    links: ${r.links.join(', ')}`);
    }
  }

  await browser.close();
  fs.writeFileSync('live_verify_results.json', JSON.stringify(results, null, 2));
  console.log('\nSaved live_verify_results.json');
})();
