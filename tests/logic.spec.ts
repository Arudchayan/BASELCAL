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
    await expect(page.getByText(/MSc ECTS:/i)).toContainText('121 / 120');
  });

  test('ML/PhD preset keeps the approved 121/149 overshoot and Causal in Spring', async ({
    page,
  }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto('/');
    await page.getByRole('button', { name: /Load ML\/PhD Preset/i }).click();

    await expect(page.getByText(/MSc ECTS:/i)).toContainText('121 / 120');
    await expect(page.getByText(/Grand Total: 149\/148 \(over by 1\)/i)).toBeVisible();
    await expect(page.getByText(/All degree buckets satisfied/i)).toHaveCount(0);

    // Causal Inference should be in Sem 2 (Spring), not Fall Sem 3
    const sem2 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 2/ }).first();
    await expect(sem2.getByText(/Causal Inference/i)).toBeVisible();
    const sem3 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 3/ }).first();
    await expect(sem3.getByText(/Causal Inference/i)).toHaveCount(0);
  });

  test('ML/PhD preset includes the approved 149-CP ML revision and provisional warnings', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto('/');
    await page.getByRole('button', { name: /Load ML\/PhD Preset/i }).click();

    const sem2 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 2/ }).first();
    await expect(sem2.getByText(/Modern Reinforcement Learning|From Agents to LLMs/i)).toBeVisible();
    await expect(sem2.getByText(/Deep Learning for Medical Image Analysis/i)).toBeVisible();
    await expect(sem2.getByText(/Machine Learning Project \(6 CP\)/i)).toBeVisible();
    await expect(sem2.getByText(/Computer Networks/i)).toHaveCount(0);
    await expect(sem2.getByText(/Applied Statistics Using R/i)).toHaveCount(0);
    await expect(sem2.getByText(/Machine Intelligence/i)).toHaveCount(0);
    await expect(sem2.getByText(/Principles of Medical Imaging/i)).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: /Credit allocation for Mathematical and Computational Biology/i }))
      .toHaveValue('Machine Learning Foundations');
    const sem3 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 3/ }).first();
    await expect(sem3.getByText(/Inverse Problems: Computational Aspects and Machine Learning/i)).toBeVisible();
    await expect(sem3.getByText(/Machine Learning Project \(6 CP\)/i)).toHaveCount(0);
    await expect(page.getByText(/Mandatory timetable conflicts/i)).toBeVisible();
    await expect(page.getByText(/Machine Learning vs Deep Learning for Medical Image Analysis/i)).toBeVisible();
    await expect(page.getByText(/Mathematics of Data Science vs Inverse Problems/i)).toBeVisible();
    await expect(page.getByText(/Reinforcement Learning is irregular and must be confirmed/i)).toBeVisible();
    await expect(page.getByText(/Inverse Problems is irregular and must be confirmed/i)).toBeVisible();
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

  test('the immediately previous v6 default migrates to the approved 149-CP revision', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('basel-ds-plan-v6', JSON.stringify({
        s1: ['AD-10489-1', 'AD-11037', 'AD-20980', 'AD-62060', 'M-19300', 'ML-45401', 'E-55662', 'E-64323', 'S-15731'],
        s2: ['AD-10489-2', 'AD-11039', 'ML-17165', 'ML-78174', 'S-15728', 'E-58920', { id: 'ML-60876', allocatedModule: 'Electives in Data Science' }, 'E-49935', 'E-PROJ6'],
        s3: ['M-66096', 'M-77777', 'S-45402', 'S-PROJ6', 'ML-PROJ6', 'T-PREP'],
        s4: ['T-THESIS', 'AD-10906', 'AD-62061'],
      }));
    });
    await page.reload();
    const sem2 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 2/ }).first();
    await expect(sem2.getByText(/Modern Reinforcement Learning/i)).toBeVisible();
    await expect(sem2.getByText(/Deep Learning for Medical Image Analysis/i)).toBeVisible();
    await expect(sem2.getByText(/Computer Networks/i)).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: /Credit allocation for Mathematical and Computational Biology/i }))
      .toHaveValue('Machine Learning Foundations');
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
