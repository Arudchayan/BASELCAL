import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
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
});
