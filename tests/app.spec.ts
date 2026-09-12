import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { loadExampleOutline } from './helpers';

test.describe('BASELCAL App Main Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('clamps stale disabled programme id from localStorage on boot', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('basel-active-programme-v1', 'computer-science');
    });
    await page.goto('/');

    const switcher = page.getByRole('combobox', { name: /programme|degree/i });
    await expect(switcher).toHaveValue('data-science');

    const stored = await page.evaluate(() =>
      localStorage.getItem('basel-active-programme-v1'),
    );
    expect(stored).toBe('data-science');
  });

  test('active DS pack still shows 120 CP rules in progress UI', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.brand-sub')).toContainText('MSc Data Science');
    await expect(page.getByText('Curriculum Progress')).toBeVisible();
    await expect(page.getByText(/MSc ECTS:/i)).toContainText('120');
  });

  test('programme switcher shows DS selected and stubs disabled', async ({ page }) => {
    const switcher = page.getByRole('combobox', { name: /programme|degree/i });
    await expect(switcher).toBeVisible();
    await expect(switcher).toHaveValue('data-science');

    const computerScience = switcher.locator('option[value="computer-science"]');
    const mathematics = switcher.locator('option[value="mathematics"]');
    await expect(computerScience).toBeDisabled();
    await expect(computerScience).toHaveAttribute('title', 'Coming soon');
    await expect(mathematics).toBeDisabled();
    await expect(mathematics).toHaveAttribute('title', 'Coming soon');
  });

  test('should open the Course Explorer', async ({ page }) => {
    // Look for the "Course Discovery" button and click it
    const discoveryBtn = page.getByRole('button', { name: /Course Discovery/i });
    await expect(discoveryBtn).toBeVisible();
    await discoveryBtn.click();
    
    // The explorer should show "Master Thesis Block" text
    const thesisBlock = page.getByText('Master Thesis Block');
    await expect(thesisBlock).toBeVisible();
  });

  test('keeps the nested explorer dialog lifecycle predictable', async ({ page }) => {
    await page.getByRole('button', { name: /Course Discovery/i }).click();

    const explorerDialog = page.getByRole('dialog', { name: 'Degree requirements roadmap' });
    await expect(explorerDialog).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(1);

    await explorerDialog.getByRole('button', { name: /Read Details/i }).first().click();
    await expect(page.getByRole('dialog')).toHaveCount(2);
    await expect(page.getByRole('dialog').last()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(explorerDialog).toBeVisible();

    await explorerDialog.getByRole('button', { name: 'Return to Planner' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'UniBasel DS Planner' })).toBeVisible();
  });

  test('Course Explorer uses the shared details modal for wishlist actions', async ({ page }) => {
    await page.getByRole('button', { name: /Course Discovery/i }).click();

    const detailsButton = page.getByRole('button', { name: /Read Details/i }).first();
    await expect(detailsButton).toBeVisible();
    await detailsButton.click();

    const courseDialog = page.getByRole('dialog').last();
    await expect(courseDialog).toBeVisible();
    await courseDialog.getByRole('button', { name: /Add to Wishlist/i }).click();
    await expect(page.getByRole('button', { name: /Remove from wishlist/i }).first()).toBeVisible();
  });

  test('should open Course Details modal', async ({ page }) => {
    // Find the first "View Course Details" button in the course catalog and click it
    const viewDetailsBtn = page.getByTitle('View Course Details').first();
    
    await expect(viewDetailsBtn).toBeVisible();
    await viewDetailsBtn.click();
    
    // Verify that the course details modal is open.
    // The modal usually has "Prerequisites" or "Exam" info, or we can check for close button
    const closeBtn = page.locator('button', { has: page.locator('.lucide-x') }).last();
    await expect(closeBtn).toBeVisible();
    
    // Close the modal
    await closeBtn.click();
  });

  test('should toggle Timetable view', async ({ page }) => {
    await loadExampleOutline(page);
    const timetableBtn = page.getByRole('button', { name: 'Timetable view' });
    await expect(timetableBtn).toBeVisible();
    await timetableBtn.click();

    const mondayColumn = page.getByText('Monday');
    await expect(mondayColumn).toBeVisible();
    await expect(page.getByRole('heading', { name: /Classes, walks & study breaks/i })).toBeVisible();
    await expect(page.getByText('36 CP').first()).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible();

    await expect(page.getByText(/Home is optional/i)).toBeVisible();
    await expect(page.getByText(/from your local student config/i)).toHaveCount(0);
    await page.getByRole('button', { name: /Set home pin/i }).click();
    await page.locator('.leaflet-container').click({ position: { x: 120, y: 120 } });
    await expect(page.getByText(/custom browser-only home pin/i)).toBeVisible();
    const savedHome = await page.evaluate(() => localStorage.getItem('baselcal-home-v1'));
    expect(savedHome).toMatch(/^\{"lat":-?\d/);
  });

  test('quick-add announces the destination semester', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Search courses').fill('45401');
    const quickAdd = page.locator('button.card-quick-add');
    await expect(quickAdd).toHaveCount(1);
    await quickAdd.click();
    await expect(page.getByText(/Added Bioinformatics Algorithms \(45401\) → Sem 1/i)).toBeVisible();
  });

  test('catalog shows an empty state with a working clear-filters action', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Search courses').fill('zzz-no-such-course');
    await expect(page.getByText('No courses match your filters')).toBeVisible();
    await page.getByRole('button', { name: 'Clear search & filters' }).click();
    await expect(page.getByText('No courses match your filters')).toHaveCount(0);
    await expect(page.locator('.catalog-panel').getByText(/Bioinformatics Algorithms/)).toBeVisible();
  });

  test('explorer can add a course straight to a semester', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Course Discovery/i }).click();
    await page.getByRole('button', { name: /Read Details/i }).first().click();
    const courseDialog = page.getByRole('dialog').last();
    const title = ((await courseDialog.locator('h2').textContent()) ?? '').trim();
    expect(title.length).toBeGreaterThan(0);
    await courseDialog.getByRole('button', { name: 'Add to Sem 1' }).click();
    await expect(page.getByText(/→ Sem 1/)).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(page.locator('.semester-grid').getByText(title)).toBeVisible();
  });

  test('toast Undo button reverts a quick-add', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Search courses').fill('45401');
    await page.locator('button.card-quick-add[aria-label*="Bioinformatics"]').click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.locator('.semester-grid').getByText(/Bioinformatics Algorithms/)).toHaveCount(0);
  });

  test('Ctrl+Z reverts the last plan change', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Search courses').fill('45401');
    await page.locator('button.card-quick-add[aria-label*="Bioinformatics"]').click();
    await expect(page.getByTitle('Undo (1) (Ctrl+Z)')).toBeVisible();
    await page.locator('.semester-grid').click();
    await page.keyboard.press('Control+z');
    await expect(page.locator('.semester-grid').getByText(/Bioinformatics Algorithms/)).toHaveCount(0);
  });

  test('exports the four-semester timetable with official teaching-period end dates', async ({ page }) => {
    await loadExampleOutline(page);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export timetable to calendar (.ics)' }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    const calendar = await readFile(path!, 'utf8');
    expect(calendar).toContain('UNTIL=20261218T235900');
    expect(calendar).toContain('UNTIL=20270604T235900');
    expect(calendar).toContain('UNTIL=20271223T235900');
    expect(calendar).toContain('UNTIL=20280602T235900');
    expect(calendar).toContain('BEGIN:VTIMEZONE');
    expect(calendar).toContain('TZID:Europe/Zurich');
    expect(calendar).toContain('DTSTART;TZID=Europe/Zurich:');
    expect(calendar).toContain('BEGIN:VALARM');
    expect(calendar).toContain('TRIGGER:-PT10M');
    expect(calendar).toContain('SEQUENCE:0');
    expect(calendar).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    expect(calendar).toMatch(/UID:baselcal-[A-Za-z0-9-]+-[A-Z]{2}-\d{4}-\d{4}@baselcal\.local/);
  });

  test('timetable view exports only the active semester', async ({ page }) => {
    await loadExampleOutline(page);
    await page.getByRole('button', { name: 'Timetable view' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Sem 1 (.ics)' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('timetable-s1');
    const path = await download.path();
    const calendar = await readFile(path!, 'utf8');
    expect(calendar).toContain('· S1 ·');
    expect(calendar).not.toContain('· S2 ·');
    expect(calendar).not.toContain('· S3 ·');
    expect(calendar).not.toContain('· S4 ·');
  });

  test('exports selected cross-list allocations in plan JSON v3', async ({ page }) => {
    await loadExampleOutline(page);
    const allocation = page.getByRole('combobox', { name: /Credit allocation for Numerical Methods for Partial Differential Equations/i });
    await allocation.selectOption('Electives in Data Science');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export plan JSON' }).click();
    const download = await downloadPromise;
    const path = await download.path();
    const exported = JSON.parse(await readFile(path!, 'utf8'));
    expect(exported.version).toBe(3);
    expect(exported.plan.s1).toContainEqual({
      id: 'M-12246',
      allocatedModule: 'Electives in Data Science',
    });
  });

  test('export filename carries the programme id', async ({ page }) => {
    await loadExampleOutline(page);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export plan JSON' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('data-science');
  });

  test('share modal previews placements and discloses what the link omits', async ({ page }) => {
    await loadExampleOutline(page);
    await page.getByRole('button', { name: 'Share plan' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/carries .* courses .* with their semester/)).toBeVisible();
    await expect(dialog.getByText(/notes, wishlist, and admission target stay/)).toBeVisible();
    await expect(dialog.getByLabel('QR code for the share link')).toBeVisible();
    await expect(dialog.getByText(/too long for a share link/i)).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('import shows an itemised kept/dropped/duplicates report', async ({ page }, testInfo) => {
    const payload = {
      version: 3,
      plan: { s1: ['ML-45401'], s2: ['ML-45401', 'NOPE-99999'], s3: [], s4: [] },
      notes: {},
      shortlist: [],
      admissionTarget: 0,
    };
    const filePath = testInfo.outputPath('import-plan.json');
    await writeFile(filePath, JSON.stringify(payload));
    page.on('dialog', (dialog) => void dialog.accept());
    await page.locator('input[type="file"]').setInputFiles(filePath);
    const report = page.getByRole('dialog', { name: 'Plan imported' });
    await expect(report).toBeVisible();
    await expect(report.getByText('Kept — 1 course')).toBeVisible();
    await expect(report.getByText('Dropped unknown references — 1')).toBeVisible();
    await expect(report.getByText('Skipped duplicate placements — 1')).toBeVisible();
    await expect(report.getByText('NOPE-99999')).toBeVisible();
    await expect(report.getByText(/Bioinformatics Algorithms \(45401\)/)).toHaveCount(2);
    await report.getByRole('button', { name: 'Close' }).click();
    await expect(report).toHaveCount(0);
  });

  test('oversized share links fall back to plan JSON download', async ({ page }) => {
    await page.goto(`/?${'q'.repeat(2400)}`);
    await loadExampleOutline(page);
    await page.getByRole('button', { name: 'Share plan' }).click();
    const dialog = page.getByRole('dialog', { name: 'Share plan' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/too long for a share link/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Copy link' })).toHaveCount(0);
    await expect(dialog.getByLabel('QR code for the share link')).toHaveCount(0);
    const downloadPromise = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Download plan JSON' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('data-science');
  });
});
