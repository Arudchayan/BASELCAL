import { test, expect } from '@playwright/test';
import { clearPlanStorage, loadExampleOutline } from './helpers';

test.describe('Degree accuracy & storage', () => {
  test('migrates v6 Data Science storage into programme-scoped v7 keys', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'basel-ds-plan-v6',
        JSON.stringify({ s1: ['ML-45401'], s2: [], s3: [], s4: [] }),
      );
      localStorage.setItem('basel-ds-notes', JSON.stringify({ 'ML-45401': 'Keep' }));
      localStorage.setItem('basel-ds-shortlist', JSON.stringify(['E-58920']));
    });
    await page.goto('/');

    const storage = await page.evaluate(() => ({
      plan: localStorage.getItem('basel-plan-v7:data-science'),
      notes: localStorage.getItem('basel-notes-v7:data-science'),
      shortlist: localStorage.getItem('basel-shortlist-v7:data-science'),
      activeProgramme: localStorage.getItem('basel-active-programme-v1'),
      legacyPlan: localStorage.getItem('basel-ds-plan-v6'),
      legacyNotes: localStorage.getItem('basel-ds-notes'),
      legacyShortlist: localStorage.getItem('basel-ds-shortlist'),
    }));

    expect(storage.plan).toContain('ML-45401');
    expect(storage.notes).toContain('Keep');
    expect(storage.shortlist).toContain('E-58920');
    expect(storage.activeProgramme).toBe('data-science');
    expect(storage.legacyPlan).toBeNull();
    expect(storage.legacyNotes).toBeNull();
    expect(storage.legacyShortlist).toBeNull();
  });

  test('exposes programme-scoped storage helpers without cross-programme leakage', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const storage = await import('/src/planStorage.ts');
      const empty = { s1: [], s2: [], s3: [], s4: [] };
      storage.savePlanForProgramme('computer-science', empty);
      storage.saveActiveProgrammeId('mathematics');
      return {
        dsKey: storage.planStorageKey('data-science'),
        csKey: storage.planStorageKey('computer-science'),
        csPlan: localStorage.getItem('basel-plan-v7:computer-science'),
        activeProgramme: storage.loadActiveProgrammeId(),
      };
    });

    expect(result.dsKey).toBe('basel-plan-v7:data-science');
    expect(result.csKey).toBe('basel-plan-v7:computer-science');
    expect(result.csPlan).toBe(JSON.stringify({ s1: [], s2: [], s3: [], s4: [] }));
    expect(result.activeProgramme).toBe('mathematics');
  });

  test('wishlist can exceed the current grand-total target but shows overshoot labeling', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Course Discovery/i }).click();
    await expect(page.getByText(/Need exactly\s+120 CP/i)).toBeVisible();

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
    if (totalCp > 120) {
      await expect(page.getByText(/overshoot/i).first()).toBeVisible();
    }
  });

  test('fresh storage starts with an empty board', async ({ page }) => {
    await page.goto('/');
    await clearPlanStorage(page);
    await page.reload();

    const sem1 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 1/ }).first();
    await expect(sem1.getByText(/Drop courses here/i)).toBeVisible();
    await expect(sem1.getByText(/Bioinformatics Algorithms/i)).toHaveCount(0);
    await expect(page.getByLabel('Admission conditions in CP')).toHaveValue('0');
  });

  test('example outline meets official 120 MSc with no admission package', async ({ page }) => {
    await page.goto('/');
    await loadExampleOutline(page);

    await expect(page.getByText(/MSc ECTS:/i)).toContainText('120 / 120');
    await expect(page.getByText(/All degree buckets satisfied \(120 CP\)/i)).toBeVisible();
    await expect(page.getByLabel('Admission conditions in CP')).toHaveValue('0');
    const sem1 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 1/ }).first();
    await expect(sem1.getByText('Numerical Methods for Partial Differential Equations')).toBeVisible();
    await expect(sem1.getByText('Analysis I', { exact: true })).toHaveCount(0);
  });

  test('example outline matches sample courses, allocations, and thesis gate', async ({ page }) => {
    await page.goto('/');
    await loadExampleOutline(page);

    const sem1 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 1/ }).first();
    await expect(sem1.getByText(/Numerical Methods for Partial Differential Equations/i)).toBeVisible();
    await expect(sem1.getByText(/Analysis I/i)).toHaveCount(0);
    const sem2 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 2/ }).first();
    await expect(sem2.getByText(/Machine Learning Project \(12 CP\)/i)).toBeVisible();
    await expect(sem2.getByText(/High Performance Computing/i)).toBeVisible();
    await expect(sem2.getByText(/Foundations of Artificial Intelligence/i)).toHaveCount(0);
    await expect(sem2.getByText(/Data Science Project \(12 CP\)/i)).toHaveCount(0);
    await expect(sem2.getByText(/Computer Networks/i)).toHaveCount(0);
    await expect(sem2.getByText(/Applied Statistics Using R/i)).toHaveCount(0);
    await expect(sem2.getByText(/Machine Intelligence/i)).toHaveCount(0);
    await expect(sem2.getByText(/Principles of Medical Imaging/i)).toHaveCount(0);
    await expect(sem2.getByText(/Causal Inference/i)).toHaveCount(0);
    const sem3 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 3/ }).first();
    await expect(sem3.getByText(/Mathematics of Data Science/i)).toBeVisible();
    await expect(sem3.getByText(/Foundations of Deep Learning/i)).toBeVisible();
    await expect(sem3.getByText(/Modern Reinforcement Learning|From Agents to LLMs/i)).toHaveCount(0);
    await expect(sem3.getByText(/Randomized Algorithms/i)).toHaveCount(0);
    await expect(sem3.getByText(/Inverse Problems/i)).toHaveCount(0);
    await expect(sem3.getByText(/Machine Learning Project \(6 CP\)/i)).toHaveCount(0);
    const sem4 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 4/ }).first();
    await expect(sem4.getByText(/Master’s thesis/i)).toBeVisible();
    await expect(page.getByText(/80 taught-module CP are complete before Semester 4/i)).toBeVisible();
    await expect(page.getByText(/remaining 4 taught-module CP/i)).toBeVisible();
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
    await expect(page.locator('.semester-grid').getByText(/Bioinformatics Algorithms/i).first()).toBeVisible();
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

  test('legacy v5 ID plans migrate safely to programme-scoped v7', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('basel-ds-plan-v6');
      localStorage.setItem('basel-ds-plan-v5', JSON.stringify({ s1: ['ML-45401'], s2: [], s3: [], s4: [] }));
    });
    await page.reload();
    await expect(page.locator('.semester-grid').getByText(/Bioinformatics Algorithms/i).first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('basel-plan-v7:data-science'))).toContain('ML-45401');
    expect(await page.evaluate(() => localStorage.getItem('basel-ds-plan-v5'))).toBeNull();
  });

  test('saved v6 plans are not rewritten by a public example outline', async ({ page }) => {
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
    await expect(sem2.getByText(/Causal Inference/i)).toBeVisible();
    await expect(sem2.getByText(/Foundations of Artificial Intelligence/i)).toHaveCount(0);
    const sem3 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 3/ }).first();
    await expect(sem3.getByText(/Inverse Problems/i).first()).toBeVisible();
    const sem4 = page.locator('.semester-grid .glass-panel').filter({ hasText: /Sem 4/ }).first();
    await expect(sem4.getByText(/Algorithms and Data Structures/i).first()).toBeVisible();
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
    await expect(page.locator('.semester-grid').getByText(/Inverse Problems: Computational Aspects and Machine Learning/i).first()).toBeVisible();
    await expect(page.getByRole('combobox', { name: /Credit allocation for Inverse Problems/i }))
      .toHaveValue('Electives in Data Science');
    await expect(sem2.getByText(/Foundations of Artificial Intelligence/i)).toHaveCount(0);
  });

  test('degree registry lists DS enabled and stubs disabled', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const mod = await import('/src/degrees/registry.ts');
      const list = mod.listProgrammes();
      return {
        ids: list.map((p: { id: string }) => p.id),
        ds: list.find((p: { id: string }) => p.id === 'data-science')?.enabled,
        cs: list.find((p: { id: string }) => p.id === 'computer-science')?.enabled,
        math: list.find((p: { id: string }) => p.id === 'mathematics')?.enabled,
        defaultId: mod.DEFAULT_PROGRAMME_ID,
      };
    });
    expect(result.ids).toEqual(['data-science', 'computer-science', 'mathematics']);
    expect(result.ds).toBe(true);
    expect(result.cs).toBe(false);
    expect(result.math).toBe(false);
    expect(result.defaultId).toBe('data-science');
  });

  test('rule engine matches DS facade on empty admission example shape', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const { evaluatePlan } = await import('/src/degreeRules.ts');
      const { evaluatePack } = await import('/src/degrees/ruleEngine.ts');
      const { DS_RULES } = await import('/src/degrees/dataSciencePack.ts');
      const { COURSES } = await import('/src/courses.ts');
      const example = await import('/src/examplePlan.json');
      const ids = Object.values(example.plan).flat() as string[];
      const courses = ids.map((id) => COURSES.find((c) => c.id === id)).filter(Boolean);
      const facade = evaluatePlan(courses as never[], 0);
      const engine = evaluatePack(courses as never[], DS_RULES, 0);
      return {
        facadeComplete: facade.isComplete,
        engineComplete: engine.isComplete,
        facadeMsc: facade.stats.mscTotal,
        engineMsc: engine.stats.mscTotal,
        sameIssues: JSON.stringify(facade.issues) === JSON.stringify(engine.issues),
      };
    });
    expect(result.facadeComplete).toBe(true);
    expect(result.engineComplete).toBe(true);
    expect(result.facadeMsc).toBe(120);
    expect(result.engineMsc).toBe(120);
    expect(result.sameIssues).toBe(true);
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
