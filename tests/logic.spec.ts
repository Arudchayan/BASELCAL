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

  test('fresh storage seeds the confirmed Fall 2026 selections', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('basel-ds-plan-v5');
      localStorage.removeItem('basel-ds-plan-v6');
      localStorage.removeItem('basel-ds-plan-v4');
      localStorage.removeItem('basel-ds-plan-v3');
      localStorage.removeItem('basel-ds-plan-v2');
      localStorage.removeItem('basel-ds-plan');
    });
    await page.reload();

    const sem1 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 1/ }).first();
    await expect(sem1.getByText(/Applied Mathematics and Informatics in Drug Discovery/i)).toBeVisible();
    await expect(sem1.getByText(/Applied Programming Projects/i)).toBeVisible();
    await expect(sem1.getByText(/Bioinformatics Algorithms/i)).toBeVisible();
    await expect(sem1.getByText(/Planning and Optimization/i)).toHaveCount(0);
    const sem2 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 2/ }).first();
    await expect(sem2.getByText(/Machine Learning/i).first()).toBeVisible();
    await expect(sem2.getByText(/Foundations of Artificial Intelligence/i)).toBeVisible();
    await expect(sem2.getByText(/Data Science Project \(12 CP\)/i)).toBeVisible();
    await expect(page.getByText(/MSc ECTS:/i)).toContainText('120 / 120');
  });

  test('ML/PhD preset meets the approved exact 120/148 totals', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto('/');
    await page.getByRole('button', { name: /Load ML\/PhD Preset/i }).click();

    await expect(page.getByText(/MSc ECTS:/i)).toContainText('120 / 120');
    await expect(page.getByText(/All degree buckets satisfied \(148 CP\)/i)).toBeVisible();
    await expect(page.getByText(/Grand Total: 149\/148/i)).toHaveCount(0);
  });

  test('ML/PhD preset matches the approved course revision, allocations, and thesis gate', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto('/');
    await page.getByRole('button', { name: /Load ML\/PhD Preset/i }).click();

    const sem2 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 2/ }).first();
    await expect(sem2.getByText(/Foundations of Artificial Intelligence/i)).toBeVisible();
    await expect(sem2.getByText(/Data Science Project \(12 CP\)/i)).toBeVisible();
    await expect(sem2.getByText(/Computer Networks/i)).toHaveCount(0);
    await expect(sem2.getByText(/Applied Statistics Using R/i)).toHaveCount(0);
    await expect(sem2.getByText(/Machine Intelligence/i)).toHaveCount(0);
    await expect(sem2.getByText(/Principles of Medical Imaging/i)).toHaveCount(0);
    await expect(sem2.getByText(/Causal Inference/i)).toHaveCount(0);
    const sem3 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 3/ }).first();
    await expect(sem3.getByText(/Modern Reinforcement Learning|From Agents to LLMs/i)).toBeVisible();
    await expect(sem3.getByText(/Randomized Algorithms/i)).toBeVisible();
    await expect(sem3.getByText(/Inverse Problems/i)).toHaveCount(0);
    await expect(sem3.getByText(/Machine Learning Project \(6 CP\)/i)).toHaveCount(0);
    const sem4 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 4/ }).first();
    await expect(sem4.getByText(/Master’s thesis/i)).toBeVisible();
    await expect(page.getByRole('combobox', { name: /Credit allocation for Mathematical and Computational Biology/i }))
      .toHaveValue('Machine Learning Foundations');
    await expect.poll(async () => page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('basel-ds-plan-v6') || '{}');
      return stored.s4.find((ref: string | { id: string }) => typeof ref !== 'string' && ref.id === 'E-53822')?.allocatedModule;
    })).toBe('Electives in Data Science');
    await expect(page.getByText(/79 taught-module CP are complete before Semester 4/i)).toBeVisible();
    await expect(page.getByText(/remaining 5 taught-module CP/i)).toBeVisible();
    await expect(page.getByText(/Reinforcement Learning is irregular and must be confirmed/i)).toBeVisible();
    await expect(page.getByText(/Randomized Algorithms is irregular and must be confirmed/i)).toBeVisible();
  });

  test('spring-only course in Fall shows offering mismatch', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'basel-ds-plan-v6',
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
        'basel-ds-plan-v6',
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

  test('ML-45401 confirmed cross-listing is no longer shown as a dispute', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'basel-ds-plan-v6',
        JSON.stringify({ s1: ['ML-45401'], s2: [], s3: [], s4: [] }),
      );
    });
    await page.reload();
    await expect(page.getByText(/Disputed module membership/i)).toHaveCount(0);
    await expect(page.getByText(/Bioinformatics Algorithms/i).first()).toBeVisible();
  });

  test('cross-listed allocation survives v6 persistence', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'basel-ds-plan-v6',
        JSON.stringify({
          s1: [{ id: 'ML-45401', allocatedModule: 'Electives in Data Science' }],
          s2: [], s3: [], s4: [],
        }),
      );
    });
    await page.reload();

    const allocation = page.getByRole('combobox', { name: /Credit allocation for Bioinformatics Algorithms/i });
    await expect(allocation).toHaveValue('Electives in Data Science');
    await allocation.selectOption('Machine Learning Foundations');
    await page.reload();
    await expect(page.getByRole('combobox', { name: /Credit allocation for Bioinformatics Algorithms/i }))
      .toHaveValue('Machine Learning Foundations');
  });

  test('legacy v5 ID plans migrate safely to v6', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('basel-ds-plan-v6');
      localStorage.setItem('basel-ds-plan-v5', JSON.stringify({ s1: ['ML-45401'], s2: [], s3: [], s4: [] }));
    });
    await page.reload();
    await expect(page.getByText(/Bioinformatics Algorithms/i).first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('basel-ds-plan-v6'))).toContain('ML-45401');
  });

  test('the immediately previous v6 default migrates to the approved exact 148-CP revision', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('basel-ds-plan-v6', JSON.stringify({
        s1: ['AD-10489-1', 'AD-11037', 'AD-20980', 'AD-62060', 'M-19300', 'ML-45401', 'E-55662', 'E-64323', 'S-15731'],
        s2: ['AD-10489-2', 'AD-11039', 'ML-17165', 'ML-78174', 'E-58920', { id: 'ML-60876', allocatedModule: 'Machine Learning Foundations' }, 'E-53822', 'E-PROJ6', 'ML-PROJ6'],
        s3: ['M-66096', 'M-77777', 'S-45402', 'S-PROJ6', { id: 'ML-67343', allocatedModule: 'Machine Learning Foundations' }, 'T-PREP'],
        s4: ['T-THESIS', 'AD-10906', 'AD-62061'],
      }));
    });
    await page.reload();
    const sem2 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 2/ }).first();
    await expect(sem2.getByText(/Foundations of Artificial Intelligence/i)).toBeVisible();
    await expect(sem2.getByText(/Data Science Project \(12 CP\)/i)).toBeVisible();
    await expect(sem2.getByText(/Causal Inference/i)).toHaveCount(0);
    const sem3 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 3/ }).first();
    await expect(sem3.getByText(/Modern Reinforcement Learning/i)).toBeVisible();
    const sem4 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 4/ }).first();
    await expect(sem4.getByText(/Deep Learning for Medical Image Analysis/i)).toBeVisible();
    await expect(page.getByRole('combobox', { name: /Credit allocation for Mathematical and Computational Biology/i }))
      .toHaveValue('Machine Learning Foundations');
  });

  test('custom v6 plans are never overwritten by default migration', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('basel-ds-plan-v6', JSON.stringify({
      s1: ['ML-45401'], s2: [], s3: [], s4: ['E-58920'],
    })));
    await page.reload();
    const sem1 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 1/ }).first();
    const sem2 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 2/ }).first();
    const sem4 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 4/ }).first();
    await expect(sem1.getByText(/Bioinformatics Algorithms/i)).toBeVisible();
    await expect(sem4.getByText(/Causal Inference/i)).toBeVisible();
    await expect(sem2.getByText(/Foundations of Artificial Intelligence/i)).toHaveCount(0);
  });

  test('allocation-only customizations are not mistaken for a prior default', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('basel-ds-plan-v6', JSON.stringify({
      s1: ['AD-10489-1', 'AD-11037', 'AD-20980', 'AD-62060', 'M-19300', 'ML-45401', 'E-55662', 'E-64323', 'S-15731'],
      s2: ['AD-10489-2', 'AD-11039', 'ML-17165', 'ML-78174', 'E-58920', { id: 'ML-60876', allocatedModule: 'Machine Learning Foundations' }, 'E-53822', 'E-PROJ6', 'ML-PROJ6'],
      s3: ['M-66096', 'M-77777', 'S-45402', 'S-PROJ6', { id: 'ML-67343', allocatedModule: 'Electives in Data Science' }, 'T-PREP'],
      s4: ['T-THESIS', 'AD-10906', 'AD-62061'],
    })));
    await page.reload();
    const sem2 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 2/ }).first();
    await expect(page.getByText(/Inverse Problems: Computational Aspects and Machine Learning/i).first()).toBeVisible();
    await expect(page.getByRole('combobox', { name: /Credit allocation for Inverse Problems/i }))
      .toHaveValue('Electives in Data Science');
    await expect(sem2.getByText(/Foundations of Artificial Intelligence/i)).toHaveCount(0);
  });

  test('project CP variants cannot be double-counted on rehydrate', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'basel-ds-plan-v6',
        JSON.stringify({ s1: [], s2: ['ML-PROJ6', 'ML-PROJ12'], s3: [], s4: [] }),
      );
    });
    await page.reload();
    const sem2 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 2/ }).first();
    await expect(sem2.getByText('Machine Learning Project (6 CP)')).toBeVisible();
    await expect(sem2.getByText('Machine Learning Project (12 CP)')).toHaveCount(0);
  });
});
