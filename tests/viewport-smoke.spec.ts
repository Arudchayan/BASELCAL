import { test, expect } from '@playwright/test';
import { clearPlanStorage, loadExampleOutline } from './helpers';

/**
 * Critical UI smoke across phone / phablet / tablet widths (360 / 390 / 768).
 * Bound to the viewport-* Playwright projects in playwright.config.ts.
 */
test.describe('viewport critical UI smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPlanStorage(page);
    await page.reload();
  });

  test('shell, progress, and primary nav remain usable', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'UniBasel DS Planner' })).toBeVisible();
    await expect(page.getByText('Curriculum Progress')).toBeVisible();
    await expect(page.getByRole('button', { name: /Course Discovery/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Timetable view' })).toBeVisible();

    const discovery = page.getByRole('button', { name: /Course Discovery/i });
    await discovery.click();
    await expect(page.getByRole('dialog', { name: 'Degree requirements roadmap' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Degree requirements roadmap' })).toHaveCount(0);
  });

  test('timetable agenda path works after loading a plan', async ({ page }) => {
    await loadExampleOutline(page);
    await page.getByRole('button', { name: 'Timetable view' }).click();
    await expect(page.getByRole('heading', { name: /Weekly Timetable Preview/i })).toBeVisible();

    const width = page.viewportSize()?.width ?? 1280;
    if (width <= 720) {
      await expect(page.getByLabel('Day-by-day agenda view')).toBeVisible();
    } else {
      await expect(page.locator('.timetable-grid')).toBeVisible();
    }
  });

  test('course code copy control is distinct from title link', async ({ page }) => {
    await loadExampleOutline(page);
    const codeBtn = page.getByRole('button', { name: /Copy course code/i }).first();
    await expect(codeBtn).toBeVisible();
    const titleLink = page.locator('.course-card h4 a').first();
    await expect(titleLink).toBeVisible();
    await expect(titleLink).toHaveAttribute('title', /opens official course page$/i);
  });
});
