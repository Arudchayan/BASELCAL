import { test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { loadExampleOutline } from './helpers';

test('write README screenshots', async ({ page }) => {
  test.skip(!process.env.DOCS_SHOTS, 'Set DOCS_SHOTS=1 to refresh docs/screenshots');
  await mkdir('docs/screenshots', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.screenshot({ path: 'docs/screenshots/board-empty.png', fullPage: true });

  await page.getByRole('button', { name: 'Owner login' }).click();
  await page.screenshot({ path: 'docs/screenshots/login.png' });
  await page.getByRole('button', { name: 'Close login' }).click();

  await loadExampleOutline(page);
  await page.screenshot({ path: 'docs/screenshots/board-example.png', fullPage: true });

  await page.getByRole('button', { name: 'Timetable view' }).click();
  await page.screenshot({ path: 'docs/screenshots/timetable.png', fullPage: true });

  await page.getByRole('button', { name: 'Board view' }).click();
  await page.getByRole('button', { name: /Course Discovery/i }).click();
  await page.screenshot({ path: 'docs/screenshots/explorer.png', fullPage: true });
});
