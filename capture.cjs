const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:5179';
const OUT = process.env.OUT_DIR || 'shots';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false, slowMo: 120 });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('dialog', (d) => d.accept());
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // 1. Board view top
  await page.screenshot({ path: `${OUT}/01-board-top.png` });

  // 2. Board view full page
  await page.screenshot({ path: `${OUT}/02-board-full.png`, fullPage: true });

  // 3. Catalog scrolled with a course card visible
  await page.getByTitle('View Course Details').first().waitFor();
  await page.screenshot({ path: `${OUT}/03-catalog.png` });

  // 4. Course details modal
  await page.getByTitle('View Course Details').first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/04-details-modal.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 5. Timetable view
  await page.getByRole('button', { name: /Timetable/i }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/05-timetable.png`, fullPage: true });

  // back to board
  await page.getByRole('button', { name: /Board/i }).click();
  await page.waitForTimeout(500);

  // 6. Explorer
  await page.getByRole('button', { name: /Course Discovery/i }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/06-explorer.png` });
  await page.screenshot({ path: `${OUT}/07-explorer-full.png`, fullPage: true });

  // 8. Explorer details modal
  await page.getByRole('button', { name: /Read Details/i }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/08-explorer-modal.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Return to Planner' }).click();
  await page.waitForTimeout(400);

  // 9. Quick tips
  await page.getByRole('button', { name: /Open quick tips/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/09-quicktips.png` });
  await page.keyboard.press('Escape');

  // 10. Light theme board
  await page.getByRole('button', { name: /Toggle theme/i }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/10-light-top.png` });

  // 11. Light timetable
  await page.getByRole('button', { name: /Timetable/i }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/11-light-timetable.png` });

  await browser.close();
  if (errors.length) {
    console.log('PAGE ERRORS:\n' + errors.join('\n'));
  } else {
    console.log('NO PAGE ERRORS');
  }
  console.log('DONE');
})().catch((e) => {
  console.error('CAPTURE FAILED:', e.message);
  process.exit(1);
});
