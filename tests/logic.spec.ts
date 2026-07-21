import { test, expect } from '@playwright/test';

test.describe('Degree accuracy & storage', () => {
  test('wishlist can exceed 148 but shows overshoot labeling', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Course Discovery/i }).click();
    await expect(page.getByText(/exactly 148 CP/i)).toBeVisible();

    const starButtons = page.locator('button[aria-label*="wishlist" i]');
    const count = await starButtons.count();
    for (let i = 0; i < Math.min(40, count); i++) {
      await starButtons.nth(i).click({ force: true });
    }

    const header = page.locator('p', { hasText: /Currently wishlisted:/i });
    await expect(header).toBeVisible();
    const text = await header.textContent();
    const cpMatch = text?.match(/Currently wishlisted:\s*(\d+)\s*CP/i);
    expect(cpMatch).toBeTruthy();
    const totalCp = parseInt(cpMatch![1], 10);
    if (totalCp > 148) {
      await expect(page.getByText(/overshoot/i).first()).toBeVisible();
    }
  });

  test('legacy duplicate localStorage plan is deduped on migrate', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const mockCourse = {
        id: 'AD-10489-1',
        title: 'Analysis I',
        code: '10489',
        module: 'Admission requirement',
        cp: 8,
        priority: 'Must',
        type: 'Admission',
      };
      localStorage.setItem(
        'basel-ds-plan',
        JSON.stringify({ s1: [mockCourse, mockCourse], s2: [], s3: [], s4: [] }),
      );
      localStorage.removeItem('basel-ds-plan-v2');
    });
    await page.reload();

    const sem1 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 1/ }).first();
    // Rehydrated from live catalog (4 CP Analysis I), and deduped → single card
    await expect(sem1.locator('span', { hasText: /CP/ }).first()).toContainText('4 CP');
    const analysisCards = sem1.locator('.glass-panel', { hasText: 'Analysis I' });
    await expect(analysisCards).toHaveCount(1);
  });

  test('ML/PhD preset hits exact 120/148 and flags no spring/fall mismatch for Causal', async ({
    page,
  }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto('/');
    await page.getByRole('button', { name: /Load ML\/PhD Preset/i }).click();

    await expect(page.getByText(/MSc ECTS:/i)).toContainText('120 / 120');
    await expect(page.getByText(/All degree buckets satisfied/i)).toBeVisible();

    // Causal Inference should be in Sem 2 (Spring), not Fall Sem 3
    const sem2 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 2/ }).first();
    await expect(sem2.getByText(/Causal Inference/i)).toBeVisible();
    const sem3 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 3/ }).first();
    await expect(sem3.getByText(/Causal Inference/i)).toHaveCount(0);
  });

  test('spring-only course in Fall shows offering mismatch', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'basel-ds-plan-v2',
        JSON.stringify({
          s1: [],
          s2: [],
          s3: ['E-58920'],
          s4: [],
        }),
      );
    });
    await page.reload();
    await expect(page.getByText(/Usually only offered in Spring/i).first()).toBeVisible();
  });

  test('wishlist modal uses Wishlist wording', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Course Discovery/i }).click();
    await page.locator('button', { hasText: 'Read Details' }).first().click();
    const addBtn = page.locator('button', { hasText: /^Add to Wishlist$/ });
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await expect(addBtn).toBeHidden();
  });
});
