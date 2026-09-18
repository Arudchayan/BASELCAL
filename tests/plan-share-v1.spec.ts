import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { clearPlanStorage } from './helpers';

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

test.describe('v1 share/import blob — QA Hard FAILs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPlanStorage(page);
    await page.reload();
  });

  test('1. unknown or disabled programmeId is rejected; CS/Math cannot be enabled', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { importPlanPayload, PLAN_DISCLAIMER, PLAN_KIND } = await import('/src/planStorage.ts');
      const { listProgrammes } = await import('/src/degrees/registry.ts');
      const plan = { s1: ['ML-45401'], s2: [], s3: [], s4: [] };
      const base = {
        v: 1 as const,
        kind: PLAN_KIND,
        admissionTarget: 0,
        plan,
        disclaimer: PLAN_DISCLAIMER,
      };
      const cs = importPlanPayload({ ...base, programmeId: 'computer-science' });
      const math = importPlanPayload({ ...base, programmeId: 'mathematics' });
      const unknown = importPlanPayload({ ...base, programmeId: 'physics' });
      const ds = importPlanPayload({ ...base, programmeId: 'data-science' });
      const programmes = listProgrammes();
      return {
        cs,
        math,
        unknown,
        dsKept: ds?.plan.s1.map((c: { id: string }) => c.id) ?? null,
        dsEnabled: programmes.find((p: { id: string }) => p.id === 'data-science')?.enabled,
        csEnabled: programmes.find((p: { id: string }) => p.id === 'computer-science')?.enabled,
        mathEnabled: programmes.find((p: { id: string }) => p.id === 'mathematics')?.enabled,
      };
    });

    expect(result.cs).toBeNull();
    expect(result.math).toBeNull();
    expect(result.unknown).toBeNull();
    expect(result.dsKept).toEqual(['ML-45401']);
    expect(result.dsEnabled).toBe(true);
    expect(result.csEnabled).toBe(false);
    expect(result.mathEnabled).toBe(false);

    const switcher = page.getByRole('combobox', { name: /programme|degree/i });
    await expect(switcher).toHaveValue('data-science');
    await expect(switcher.locator('option[value="computer-science"]')).toBeDisabled();
    await expect(switcher.locator('option[value="mathematics"]')).toBeDisabled();
    expect(await page.evaluate(() => localStorage.getItem('basel-plan-v7:computer-science'))).toBeNull();
  });

  test('2. missing or non-canonical disclaimer rejects the whole import', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { importPlanPayload, PLAN_DISCLAIMER, PLAN_KIND } = await import('/src/planStorage.ts');
      const plan = { s1: ['ML-45401'], s2: [], s3: [], s4: [] };
      const base = {
        v: 1 as const,
        kind: PLAN_KIND,
        programmeId: 'data-science',
        admissionTarget: 0,
        plan,
      };
      return {
        missing: importPlanPayload(base),
        empty: importPlanPayload({ ...base, disclaimer: '' }),
        shortLine: importPlanPayload({
          ...base,
          disclaimer: 'Unofficial — verify in VV before enrol',
        }),
        canonical: importPlanPayload({ ...base, disclaimer: PLAN_DISCLAIMER })?.plan.s1[0]?.id ?? null,
      };
    });

    expect(result.missing).toBeNull();
    expect(result.empty).toBeNull();
    expect(result.shortLine).toBeNull();
    expect(result.canonical).toBe('ML-45401');
  });

  test('3. admissionTarget clamped [0, 30]; AD courses do not change the imported target', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { importPlanPayload, PLAN_DISCLAIMER, PLAN_KIND } = await import('/src/planStorage.ts');
      const adPlan = {
        s1: ['AD-10489-1', 'AD-11037', 'AD-20980', 'AD-62060'],
        s2: ['AD-10489-2', 'AD-11039'],
        s3: [],
        s4: ['AD-10906', 'AD-62061'],
      };
      const blob = (admissionTarget: unknown) =>
        importPlanPayload({
          v: 1,
          kind: PLAN_KIND,
          programmeId: 'data-science',
          admissionTarget,
          plan: adPlan,
          disclaimer: PLAN_DISCLAIMER,
        });
      const zero = blob(0);
      return {
        zero: zero?.admissionTarget,
        keptAd: zero ? [...zero.plan.s1, ...zero.plan.s2, ...zero.plan.s4].map((c: { id: string }) => c.id) : [],
        eighty: blob(80)?.admissionTarget,
        thirtyOne: blob(31)?.admissionTarget,
        neg: blob(-4)?.admissionTarget,
        missing: blob(undefined)?.admissionTarget,
      };
    });

    expect(result.zero).toBe(0);
    expect(result.keptAd.length).toBeGreaterThan(4);
    expect(result.eighty).toBe(30);
    expect(result.thirtyOne).toBe(30);
    expect(result.neg).toBe(0);
    expect(result.missing).toBe(0);
  });

  test('4. allocatedModule not cross-listed drops that entry (does not keep a cleared course)', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { importPlanPayload, PLAN_DISCLAIMER, PLAN_KIND } = await import('/src/planStorage.ts');
      const imported = importPlanPayload({
        v: 1,
        kind: PLAN_KIND,
        programmeId: 'data-science',
        admissionTarget: 0,
        plan: {
          s1: [
            { id: 'M-12246', allocatedModule: 'Thesis' },
            { id: 'ML-45401', allocatedModule: 'Electives in Data Science' },
            'AD-10489-1',
          ],
          s2: [],
          s3: [],
          s4: [],
        },
        disclaimer: PLAN_DISCLAIMER,
      });
      return {
        ids: imported?.plan.s1.map((c: { id: string }) => c.id) ?? null,
        modules: imported?.plan.s1.map((c: { id: string; allocatedModule?: string }) => ({
          id: c.id,
          allocatedModule: c.allocatedModule ?? null,
        })) ?? null,
        dropped: imported?.droppedIds ?? null,
      };
    });

    expect(result.ids).toEqual(['ML-45401', 'AD-10489-1']);
    expect(result.modules).toEqual([
      { id: 'ML-45401', allocatedModule: 'Electives in Data Science' },
      { id: 'AD-10489-1', allocatedModule: null },
    ]);
    expect(result.dropped).toEqual(['M-12246']);
  });

  test('5. unknown course IDs are dropped', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { importPlanPayload, PLAN_DISCLAIMER, PLAN_KIND } = await import('/src/planStorage.ts');
      const imported = importPlanPayload({
        v: 1,
        kind: PLAN_KIND,
        programmeId: 'data-science',
        admissionTarget: 0,
        plan: {
          s1: ['ML-45401', 'NOPE-99999', 'ALSO-FAKE'],
          s2: [],
          s3: [],
          s4: [],
        },
        disclaimer: PLAN_DISCLAIMER,
      });
      return {
        ids: imported?.plan.s1.map((c: { id: string }) => c.id) ?? null,
        dropped: imported?.droppedIds ?? null,
      };
    });

    expect(result.ids).toEqual(['ML-45401']);
    expect(result.dropped).toEqual(['NOPE-99999', 'ALSO-FAKE']);
  });

  test('6. replace only after confirm; export has no accounts/PII/server fields', async ({ page }, testInfo) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'basel-plan-v7:data-science',
        JSON.stringify({ s1: ['ML-45401'], s2: [], s3: [], s4: [] }),
      );
    });
    await page.reload();
    await expect(page.getByText(/Bioinformatics Algorithms/i).first()).toBeVisible();

    const blob = await page.evaluate(async () => {
      const { PLAN_DISCLAIMER, PLAN_KIND } = await import('/src/planStorage.ts');
      return {
        v: 1 as const,
        kind: PLAN_KIND,
        programmeId: 'data-science',
        admissionTarget: 0,
        plan: { s1: ['M-12246'], s2: [], s3: [], s4: [] },
        disclaimer: PLAN_DISCLAIMER,
      };
    });

    const filePath = testInfo.outputPath('v1-replace.json');
    await writeFile(filePath, JSON.stringify(blob));
    page.once('dialog', (dialog) => void dialog.dismiss());
    await page.locator('input[type="file"]').setInputFiles(filePath);
    await expect(page.getByText(/Bioinformatics Algorithms/i).first()).toBeVisible();
    await expect(page.getByText(/Numerical Methods for Partial Differential Equations/i)).toHaveCount(0);

    page.once('dialog', (dialog) => void dialog.accept());
    await page.locator('input[type="file"]').setInputFiles([]);
    await page.locator('input[type="file"]').setInputFiles(filePath);
    const report = page.getByRole('dialog', { name: 'Plan imported' });
    await expect(report).toBeVisible();
    await expect(page.getByText(/Numerical Methods for Partial Differential Equations/i).first()).toBeVisible();
    await expect(page.getByText(/Bioinformatics Algorithms/i)).toHaveCount(0);
    await report.getByRole('button', { name: 'Close' }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export plan JSON' }).click();
    const download = await downloadPromise;
    const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
    expect(Object.keys(exported).sort()).toEqual([
      'admissionTarget',
      'disclaimer',
      'kind',
      'plan',
      'programmeId',
      'v',
    ]);
    expect(exported.kind).toBe('baselcal-plan');
    expect(exported).not.toHaveProperty('notes');
    expect(exported).not.toHaveProperty('shortlist');
    expect(exported).not.toHaveProperty('email');
    expect(exported).not.toHaveProperty('user');
    expect(exported).not.toHaveProperty('password');
    expect(JSON.stringify(exported)).not.toMatch(/@/);
  });

  test('6b. hash reopen confirms before replace; missing-disclaimer hash never prompts', async ({ page }) => {
    const { disclaimer, kind } = await page.evaluate(async () => {
      const { PLAN_DISCLAIMER, PLAN_KIND } = await import('/src/planStorage.ts');
      return { disclaimer: PLAN_DISCLAIMER, kind: PLAN_KIND };
    });

    const good = {
      v: 1,
      kind,
      programmeId: 'data-science',
      admissionTarget: 8,
      plan: { s1: ['M-12246'], s2: [], s3: [], s4: [] },
      disclaimer,
    };
    const bad = { ...good, disclaimer: undefined };
    delete (bad as { disclaimer?: string }).disclaimer;

    await page.addInitScript(() => {
      localStorage.setItem(
        'basel-plan-v7:data-science',
        JSON.stringify({ s1: ['ML-45401'], s2: [], s3: [], s4: [] }),
      );
      localStorage.setItem('basel-ds-admission-target', '12');
    });

    let sawDialog = false;
    page.once('dialog', async (dialog) => {
      sawDialog = true;
      await dialog.dismiss();
    });
    await page.goto(`/?n=dismiss#p=${toBase64Url(JSON.stringify(good))}`);
    await expect(page.getByText(/Bioinformatics Algorithms/i).first()).toBeVisible();
    await expect(page.getByLabel('Admission conditions in CP')).toHaveValue('12');
    expect(sawDialog).toBe(true);

    page.once('dialog', (dialog) => void dialog.accept());
    await page.goto(`/?n=accept#p=${toBase64Url(JSON.stringify(good))}`);
    await expect(page.getByText(/Numerical Methods for Partial Differential Equations/i).first()).toBeVisible();
    await expect(page.getByText(/Bioinformatics Algorithms/i)).toHaveCount(0);
    await expect(page.getByLabel('Admission conditions in CP')).toHaveValue('8');

    let prompted = false;
    page.on('dialog', async (dialog) => {
      prompted = true;
      await dialog.dismiss();
    });
    await page.addInitScript(() => {
      localStorage.setItem(
        'basel-plan-v7:data-science',
        JSON.stringify({ s1: ['ML-45401'], s2: [], s3: [], s4: [] }),
      );
    });
    await page.goto(`/?n=missing#p=${toBase64Url(JSON.stringify(bad))}`);
    await expect(page.getByText(/Bioinformatics Algorithms/i).first()).toBeVisible();
    expect(prompted).toBe(false);
  });
});
