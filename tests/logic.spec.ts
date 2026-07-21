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

  test('fresh storage seeds ML/PhD default preset', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('basel-ds-plan-v3');
      localStorage.removeItem('basel-ds-plan-v2');
      localStorage.removeItem('basel-ds-plan');
    });
    await page.reload();

    const sem1 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 1/ }).first();
    await expect(sem1.getByText(/Planning and Optimization/i)).toBeVisible();
    const sem2 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 2/ }).first();
    await expect(sem2.getByText(/Machine Learning/i).first()).toBeVisible();
    await expect(page.getByText(/MSc ECTS:/i)).toContainText('120 / 120');
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

  test('ML/PhD preset includes ML-78174 and Sem 1 timetable conflicts', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto('/');
    await page.getByRole('button', { name: /Load ML\/PhD Preset/i }).click();

    await expect(page.getByText(/Modern Reinforcement Learning|From Agents to LLMs/i)).toBeVisible();
    await expect(page.getByText(/Mandatory timetable conflicts/i)).toBeVisible();
    await expect(page.getByText(/Verify VV offering before enrolling/i)).toHaveCount(0);
  });

  test('spring-only course in Fall shows offering mismatch', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'basel-ds-plan-v3',
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

  test('unknown course IDs are dropped on rehydrate', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'basel-ds-plan-v3',
        JSON.stringify({
          s1: ['NOT-A-REAL-COURSE', 'AD-10489-1'],
          s2: [],
          s3: [],
          s4: [],
        }),
      );
    });
    await page.reload();
    const sem1 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 1/ }).first();
    await expect(sem1.getByText(/Analysis I/i)).toBeVisible();
    await expect(sem1.getByText(/NOT-A-REAL-COURSE/i)).toHaveCount(0);
  });

  test('header shows unofficial planner disclaimer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/not an official University of Basel tool/i)).toBeVisible();
  });

  test('ML-45401 disputed module surfaces when in plan', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'basel-ds-plan-v3',
        JSON.stringify({ s1: ['ML-45401'], s2: [], s3: [], s4: [] }),
      );
    });
    await page.reload();
    await expect(page.getByText(/Disputed module membership/i)).toBeVisible();
    await expect(page.getByText(/Bioinformatics Algorithms/i).first()).toBeVisible();
  });
});
