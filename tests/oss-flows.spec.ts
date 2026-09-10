import { test, expect } from '@playwright/test';
import { clearPlanStorage, loadExampleOutline } from './helpers';

test.describe('OSS flows', () => {
  test('empty board, then example outline stays Master’s-only at 120 CP', async ({ page }) => {
    await page.goto('/');
    await clearPlanStorage(page);
    await page.reload();

    await expect(page.getByLabel('Admission conditions in CP')).toHaveValue('0');
    await expect(page.getByText(/Drop courses here/i).first()).toBeVisible();
    await expect(page.getByText(/All degree buckets satisfied/i)).toHaveCount(0);

    await loadExampleOutline(page);
    await expect(page.getByLabel('Admission conditions in CP')).toHaveValue('0');
    await expect(page.getByText(/All degree buckets satisfied \(120 CP\)/i)).toBeVisible();
    await expect(page.getByText(/MSc ECTS:/i)).toContainText('120 / 120');
    const sem1 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 1/ }).first();
    await expect(sem1.getByText('Numerical Methods for Partial Differential Equations')).toBeVisible();
    await expect(sem1.getByText('Analysis I', { exact: true })).toHaveCount(0);
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

  test('owner sign-out clears notes, shortlist, admission, and home', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem('basel-ds-unlock-v1', JSON.stringify({ admissionTarget: 12, seedPlan: false }));
      localStorage.setItem('basel-notes-v7:data-science', JSON.stringify({ 'M-1': 'private note' }));
      localStorage.setItem('basel-shortlist-v7:data-science', JSON.stringify(['M-1']));
      localStorage.setItem('basel-notes-v7:computer-science', JSON.stringify({ 'CS-1': 'other' }));
      localStorage.setItem('basel-ds-admission-target', '12');
      localStorage.setItem('baselcal-home-v1', JSON.stringify({ lat: 47.5, lng: 7.5, label: 'Home' }));
      localStorage.setItem(
        'basel-plan-v7:data-science',
        JSON.stringify({ s1: ['M-1'], s2: [], s3: [], s4: [] }),
      );
    });
    await page.reload();

    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page.getByRole('button', { name: 'Owner login' })).toBeVisible();
    // Allow post-reload persist effects to settle (they may rewrite empty notes/shortlist).
    await page.waitForTimeout(400);
    const leftover = await page.evaluate(() => ({
      unlock: sessionStorage.getItem('basel-ds-unlock-v1'),
      notesDs: localStorage.getItem('basel-notes-v7:data-science'),
      notesCs: localStorage.getItem('basel-notes-v7:computer-science'),
      shortlist: localStorage.getItem('basel-shortlist-v7:data-science'),
      admission: localStorage.getItem('basel-ds-admission-target'),
      home: localStorage.getItem('baselcal-home-v1'),
      plan: localStorage.getItem('basel-plan-v7:data-science'),
    }));
    expect(leftover.unlock).toBeNull();
    expect(leftover.admission).toBeNull();
    expect(leftover.home).toBeNull();
    expect(leftover.notesCs).toBeNull();
    expect(JSON.parse(leftover.notesDs || '{}')).toEqual({});
    expect(JSON.parse(leftover.shortlist || '[]')).toEqual([]);
    expect(JSON.stringify(leftover)).not.toContain('private note');
    expect(JSON.stringify(leftover)).not.toContain('M-1');
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
