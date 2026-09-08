import { test, expect } from '@playwright/test';
import { clearPlanStorage, loadExampleOutline } from './helpers';

test.describe('OSS flows', () => {
  test('empty board, then example outline, then admission 0 overshoots', async ({ page }) => {
    await page.goto('/');
    await clearPlanStorage(page);
    await page.reload();

    await expect(page.getByLabel('Admission conditions in CP')).toHaveValue('0');
    await expect(page.getByText(/Drop courses here/i).first()).toBeVisible();
    await expect(page.getByText(/All degree buckets satisfied/i)).toHaveCount(0);

    await loadExampleOutline(page);
    await expect(page.getByLabel('Admission conditions in CP')).toHaveValue('28');
    await expect(page.getByText(/All degree buckets satisfied \(148 CP\)/i)).toBeVisible();
    await expect(page.getByText(/MSc ECTS:/i)).toContainText('120 / 120');

    await page.getByLabel('Admission conditions in CP').fill('0');
    await expect(page.getByLabel('Admission conditions in CP')).toHaveValue('0');
    await expect(page.getByText(/Admission overshoot/i)).toBeVisible();
    await expect(page.getByText(/All degree buckets satisfied \(148 CP\)/i)).toHaveCount(0);
  });

  test('empty timetable still renders', async ({ page }) => {
    await page.goto('/');
    await clearPlanStorage(page);
    await page.reload();
    await page.getByRole('button', { name: 'Timetable view' }).click();
    await expect(page.getByRole('heading', { name: /Weekly Timetable Preview/i })).toBeVisible();
    await expect(page.getByText(/No courses in this semester/i)).toBeVisible();
  });

  test('catalog details modal opens on an empty board', async ({ page }) => {
    await page.goto('/');
    await clearPlanStorage(page);
    await page.reload();

    await page.getByTitle('View Course Details').first().click();
    await expect(page.getByRole('button', { name: /Close course details/i })).toBeVisible();
    await page.getByRole('button', { name: /Close course details/i }).click();
    await expect(page.getByRole('button', { name: /Close course details/i })).toHaveCount(0);
  });

  test('owner login dialog opens without creating an account', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Owner login' }).click();
    const dialog = page.getByRole('dialog', { name: 'Owner login' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/create account/i)).toHaveCount(0);
    await dialog.getByLabel('Username').fill('demo');
    await dialog.getByLabel('Password').fill('demo');
    await dialog.getByRole('button', { name: 'Sign in' }).click();
    await expect(dialog.getByText(/Owner login is only available|Invalid login|Could not reach/i)).toBeVisible();
  });

  test('empty board share explains that the link would not load', async ({ page }) => {
    await page.goto('/');
    await clearPlanStorage(page);
    await page.reload();
    await page.getByRole('button', { name: 'Copy share link' }).click();
    await expect(page.getByText(/Nothing to share/i)).toBeVisible();
  });

  test('share copies a link on the example outline', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await loadExampleOutline(page);
    await page.getByRole('button', { name: 'Copy share link' }).click();
    await expect(page.getByText(/Share link copied/i)).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('#p=');
  });
});
