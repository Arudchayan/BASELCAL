import { test, expect } from '@playwright/test';

const approved = {
  s1: ['AD-10489-1', 'AD-11037', 'AD-20980', 'AD-62060', 'M-19300', 'ML-45401', 'E-55662', 'E-64323', 'S-15731'],
  s2: ['AD-10489-2', 'AD-11039', 'ML-17165', 'ML-78174', 'E-58920', 'ML-60876', 'E-53822', 'E-PROJ6', 'ML-PROJ6'],
  s3: ['M-66096', 'M-77777', 'S-45402', 'S-PROJ6', 'ML-67343', 'T-PREP'],
  s4: ['T-THESIS', 'AD-10906', 'AD-62061'],
};

test.describe('Degree accuracy & storage', () => {
  test('fresh storage seeds the exact approved 149 CP plan and allocations', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      for (const key of ['basel-ds-plan-v6', 'basel-ds-plan-v5', 'basel-ds-plan-v4', 'basel-ds-plan-v3', 'basel-ds-plan-v2', 'basel-ds-plan']) {
        localStorage.removeItem(key);
      }
    });
    await page.reload();

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('basel-ds-plan-v6') || '{}'));
    const ids = Object.fromEntries(Object.entries(stored).map(([sem, refs]) => [sem, (refs as Array<string | { id: string }>).map((ref) => typeof ref === 'string' ? ref : ref.id)]));
    expect(ids).toEqual(approved);
    expect(stored.s2).toContainEqual({ id: 'ML-60876', allocatedModule: 'Machine Learning Foundations' });
    expect(stored.s3).toContainEqual({ id: 'ML-67343', allocatedModule: 'Machine Learning Foundations' });
    await expect(page.getByText(/MSc ECTS:/i)).toContainText('121 / 120');
    await expect(page.getByText(/grand 149\/148/i)).toBeVisible();
  });

  test('preset keeps official overshoot honest and shows provisional warnings', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/');
    await page.getByRole('button', { name: /Load ML\/PhD Preset/i }).click();

    await expect(page.getByText(/121 MSc \/ 149 overall/i)).toBeVisible();
    await expect(page.getByText(/Provisional from Spring 2027 onward/i)).toBeVisible();
    await expect(page.getByText(/Reinforcement Learning is irregular/i)).toBeVisible();
    await expect(page.getByText(/Inverse Problems is irregular/i)).toBeVisible();
    await expect(page.getByText(/All degree buckets satisfied/i)).toHaveCount(0);
  });

  test('planned cross-listed courses expose and persist their allocation', async ({ page }) => {
    await page.goto('/');
    const allocation = page.getByRole('combobox', { name: /Credit allocation for Mathematical and Computational Biology in Drug Discovery/i });
    await expect(allocation).toHaveValue('Machine Learning Foundations');
    await allocation.selectOption('Electives in Data Science');
    await expect.poll(async () => page.evaluate(() => {
      const plan = JSON.parse(localStorage.getItem('basel-ds-plan-v6') || '{}');
      return plan.s2.find((ref: string | { id: string }) => typeof ref !== 'string' && ref.id === 'ML-60876')?.allocatedModule;
    })).toBe('Electives in Data Science');
  });

  test('the immediately previous default migrates to the approved plan', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('basel-ds-plan-v6', JSON.stringify({
      s1: ['AD-10489-1', 'AD-11037', 'AD-20980', 'AD-62060', 'M-19300', 'ML-45401', 'E-55662', 'E-64323', 'S-15731'],
      s2: ['AD-10489-2', 'AD-11039', 'ML-17165', 'ML-78174', 'S-15728', 'E-58920', 'ML-60876', 'E-49935', 'E-PROJ6'],
      s3: ['M-66096', 'M-77777', 'S-45402', 'S-PROJ6', 'ML-PROJ6', 'T-PREP'],
      s4: ['T-THESIS', 'AD-10906', 'AD-62061'],
    })));
    await page.reload();
    const ids = await page.evaluate(() => Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem('basel-ds-plan-v6') || '{}')).map(([sem, refs]) => [sem, (refs as Array<string | { id: string }>).map((ref) => typeof ref === 'string' ? ref : ref.id)])));
    expect(ids).toEqual(approved);
  });

  test('project variants cannot be counted together', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('basel-ds-plan-v6', JSON.stringify({
      s1: ['ML-PROJ6', 'ML-PROJ12'], s2: [], s3: [], s4: [],
    })));
    await page.reload();
    const sem1 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 1/ }).first();
    await expect(sem1.getByText(/Machine Learning Project \(6 CP\)/i)).toBeVisible();
    await expect(sem1.getByText(/Machine Learning Project \(12 CP\)/i)).toHaveCount(0);
  });

  test('unknown course IDs are dropped on rehydrate', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('basel-ds-plan-v6', JSON.stringify({
      s1: ['NOT-A-REAL-COURSE', 'AD-10489-1'], s2: [], s3: [], s4: [],
    })));
    await page.reload();
    const sem1 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 1/ }).first();
    await expect(sem1.getByText(/Analysis I/i)).toBeVisible();
    await expect(sem1.getByText(/NOT-A-REAL-COURSE/i)).toHaveCount(0);
  });

  test('header shows unofficial planner disclaimer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/not an official University of Basel tool/i)).toBeVisible();
  });
});
