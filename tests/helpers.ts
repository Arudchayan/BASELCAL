import { type Page } from '@playwright/test';

export async function loadExampleOutline(page: Page) {
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /Load example outline/i }).click();
}

export async function clearPlanStorage(page: Page) {
  await page.evaluate(() => {
    const exactKeys = [
      'basel-ds-plan-v6',
      'basel-ds-plan-v5',
      'basel-ds-plan-v4',
      'basel-ds-plan-v3',
      'basel-ds-plan-v2',
      'basel-ds-plan',
      'basel-ds-admission-target',
      'baselcal-home-v1',
      'basel-active-programme-v1',
    ];
    for (const key of Object.keys(localStorage)) {
      if (
        exactKeys.includes(key) ||
        key.startsWith('basel-plan-v7:') ||
        key.startsWith('basel-notes-v7:') ||
        key.startsWith('basel-shortlist-v7:')
      ) {
        localStorage.removeItem(key);
      }
    }
    sessionStorage.removeItem('basel-ds-unlock-v1');
  });
}
