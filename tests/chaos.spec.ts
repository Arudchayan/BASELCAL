import { test, expect } from '@playwright/test';

test.describe('Chaos Monkey Tests', () => {
  test('rapid toggling of dark/light mode and views', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.getByRole('button', { name: /Toggle theme/i });
    const boardBtn = page.getByRole('button', { name: /Board/i });
    const timetableBtn = page.getByRole('button', { name: 'Timetable view' });

    for (let i = 0; i < 20; i++) {
      await themeToggle.click();
    }

    for (let i = 0; i < 20; i++) {
      if (i % 2 === 0) {
        await timetableBtn.click();
      } else {
        await boardBtn.click();
      }
    }

    await boardBtn.click();
    await expect(page.getByText('Curriculum Progress')).toBeVisible();
  });

  test('interact with UI elements during animations', async ({ page }) => {
    await page.goto('/');

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    const discoveryBtn = page.getByRole('button', { name: /Course Discovery/i });
    const loadPresetBtn = page.getByRole('button', { name: /Load ML\/PhD Preset/i });

    await Promise.all([
      loadPresetBtn.click(),
      discoveryBtn.click(),
      page.keyboard.press('Escape'),
      page.getByRole('button', { name: /Toggle theme/i }).click(),
    ]);

    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');

    const viewDetailsBtn = page.getByTitle('View Course Details').first();
    for (let i = 0; i < 5; i++) {
      await viewDetailsBtn.click();
      await page.keyboard.press('Escape');
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('simultaneous drag and drop with view switching', async ({ page }) => {
    await page.goto('/');

    const timetableBtn = page.getByRole('button', { name: 'Timetable view' });
    const firstCourseCard = page
      .locator('.glass-panel')
      .filter({ has: page.locator('a[href*="vorlesungsverzeichnis"], a[href*="unibas.ch"]') })
      .first();
    const destDroppable = page.locator('.semester-grid .glass-panel').filter({ hasText: 'Sem 1' }).locator('> div').nth(1);

    const cardBox = await firstCourseCard.boundingBox();
    const destBox = await destDroppable.boundingBox();

    if (cardBox && destBox) {
      await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(cardBox.x + cardBox.width / 2 + 10, cardBox.y + cardBox.height / 2 + 10);
      await timetableBtn.click({ force: true });
      await page.mouse.move(destBox.x + destBox.width / 2, destBox.y + destBox.height / 2);
      await page.mouse.up();
    }

    await expect(page.getByText('Weekly Timetable Preview')).toBeVisible();
  });

  test('rapid text input in search while toggling wishlist and presets', async ({ page }) => {
    await page.goto('/');

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    const searchInput = page.getByRole('textbox', { name: /Search courses/i });
    const shortlistToggle = page.locator('input[type="checkbox"]');
    const loadPresetBtn = page.getByRole('button', { name: /Load ML\/PhD Preset/i });

    for (let i = 0; i < 15; i++) {
      await searchInput.fill(`search test ${i}`);
      await shortlistToggle.click({ force: true });
      if (i % 5 === 0) {
        await loadPresetBtn.click({ force: true });
      }
    }

    await searchInput.fill('');
    await expect(page.getByText('Curriculum Progress')).toBeVisible();
  });
});
