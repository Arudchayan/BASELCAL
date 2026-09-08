import { type Page } from '@playwright/test';

export async function loadExampleOutline(page: Page) {
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /Load example outline/i }).click();
}

export async function clearPlanStorage(page: Page) {
  await page.evaluate(() => {
    for (const key of [
      'basel-ds-plan-v6',
      'basel-ds-plan-v5',
      'basel-ds-plan-v4',
      'basel-ds-plan-v3',
      'basel-ds-plan-v2',
      'basel-ds-plan',
      'basel-ds-admission-target',
      'baselcal-home-v1',
    ]) {
      localStorage.removeItem(key);
    }
  });
}
