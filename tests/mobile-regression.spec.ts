import { test, expect, type Page, type Locator } from '@playwright/test';
import { clearPlanStorage, loadExampleOutline } from './helpers';

/**
 * Mobile regression (P1–P4): collapsed header / More sheet, touch-first
 * catalog + accordions, G2 resize re-open, 16px inputs, agenda view,
 * boot ConfirmDialog (no native dialogs), and @designer screenshot set.
 *
 * Viewport-agnostic: branches on the runtime width so the same file passes
 * under any project (360 / 390 / 768 / touch). Run via the temp config
 * (see env notes) — the committed viewport-* projects only match
 * viewport-smoke.spec.ts.
 */
test.describe('mobile regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearPlanStorage(page);
    await page.reload();
  });

  const widthOf = async (page: Page) => page.viewportSize()?.width ?? 1280;
  const isNarrow = async (page: Page) => (await widthOf(page)) <= 720;

  async function tapOrClick(target: Locator) {
    if (test.info().project.use.hasTouch === true) {
      await target.tap();
    } else {
      await target.click();
    }
  }

  async function openMore(page: Page) {
    const toggle = page.getByRole('button', { name: /^(More|Close)$/ });
    await expect(toggle).toBeVisible();
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click();
    }
    await expect(page.locator('#topnav-more-panel.is-open')).toBeVisible();
  }

  test('(a) collapsed header, board in first viewport, no h-overflow', async ({ page }) => {
    const width = await widthOf(page);
    const viewport = page.viewportSize() ?? { width: 1280, height: 800 };
    if (await isNarrow(page)) {
      await expect(page.getByRole('button', { name: /^More$/ })).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: /^(More|Close)$/ })).toHaveCount(0);
    }
    const planBox = await page.locator('.plan-column').boundingBox();
    const catalogBox = await page.locator('details.catalog-panel').boundingBox();
    expect(planBox, 'plan column renders').not.toBeNull();
    expect(catalogBox, 'catalog panel renders').not.toBeNull();
    // Plan-first order on narrow screens, catalog-first (order:-1) on desktop:
    // board content starts inside the first viewport either way.
    expect(Math.min(planBox!.y, catalogBox!.y)).toBeLessThan(viewport.height);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(overflow, `no horizontal overflow at ${width}px`).toBe(true);
  });

  test('(b) More sheet: labeled actions, Escape/backdrop close, Share dismisses', async ({
    page,
  }) => {
    test.skip(!(await isNarrow(page)), 'More sheet is a narrow-viewport pattern');
    const toggle = page.getByRole('button', { name: /^(More|Close)$/ });

    await openMore(page);
    const panel = page.locator('#topnav-more-panel.is-open');
    await expect(panel.getByRole('button', { name: 'Share plan' })).toBeVisible();
    await expect(panel.getByRole('button', { name: /Print/i })).toBeVisible();
    await expect(panel.getByRole('button', { name: /Export plan/i })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#topnav-more-panel.is-open')).toHaveCount(0);
    await expect(toggle).toBeFocused();

    await openMore(page);
    // The bottom-anchored sheet covers the backdrop's center point, so invoke
    // the dim layer directly (real users tap the visible dim area above it).
    await page.locator('.topnav-sheet-backdrop').evaluate((el) => (el as HTMLElement).click());
    await expect(page.locator('#topnav-more-panel.is-open')).toHaveCount(0);
    await expect(toggle).toBeFocused();

    // Activating an overflow action dismisses the sheet (G1 dismiss-then-act).
    await openMore(page);
    await page.locator('#topnav-more-panel.is-open').getByRole('button', { name: 'Share plan' }).click();
    await expect(page.locator('#topnav-more-panel.is-open')).toHaveCount(0);
    await expect(page.locator('.toast')).toContainText('Nothing to share');
  });

  test('(c) catalog starts collapsed, sticky search, 2-tap add-to-plan', async ({ page }) => {
    test.skip(!(await isNarrow(page)), 'collapsed catalog is a narrow-viewport pattern');
    const catalog = page.locator('details.catalog-panel');
    await expect(catalog).toHaveJSProperty('open', false);

    // Tap 1: expand the catalog.
    await tapOrClick(page.locator('summary.catalog-summary'));
    await expect(catalog).toHaveJSProperty('open', true);
    const searchPosition = await page
      .locator('.catalog-search')
      .evaluate((el) => getComputedStyle(el).position);
    expect(searchPosition).toBe('sticky');

    // Tap 2: labeled Add to plan (touch-mode button).
    const addButton = page.locator('.card-add-labeled').first();
    await expect(addButton).toBeVisible();
    await tapOrClick(addButton);
    await expect(page.locator('.toast')).toContainText('Added');
  });

  test('(d) empty semesters collapsed, semesters with courses open', async ({ page }) => {
    test.skip(!(await isNarrow(page)), 'collapsible semesters are a narrow-viewport pattern');
    const semesters = page.locator('details.semester-card');
    for (const semId of ['s1', 's2', 's3', 's4']) {
      await expect(semesters.nth(['s1', 's2', 's3', 's4'].indexOf(semId))).toHaveJSProperty('open', false);
    }
    await loadExampleOutline(page);
    const openness = await page.evaluate(() =>
      Array.from(document.querySelectorAll('details.semester-card')).map((d) => ({
        open: (d as HTMLDetailsElement).open,
        cards: d.querySelectorAll('.course-card').length,
      })),
    );
    expect(openness.some((s) => s.cards > 0 && s.open), 'semester with courses is open').toBe(true);
    for (const s of openness) {
      if (s.cards > 0) expect(s.open, 'non-empty semester open').toBe(true);
    }
  });

  test('(e) resize narrow→wide re-opens catalog and semesters (G2)', async ({ page }) => {
    // Reload at narrow width so accordion state initializes collapsed.
    await page.setViewportSize({ width: 360, height: 800 });
    await page.reload();
    await expect(page.locator('details.catalog-panel')).toHaveJSProperty('open', false);
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(page.locator('details.catalog-panel')).toHaveJSProperty('open', true);
    const semestersOpen = await page.evaluate(() =>
      Array.from(document.querySelectorAll('details.semester-card')).map(
        (d) => (d as HTMLDetailsElement).open,
      ),
    );
    expect(semestersOpen.length).toBeGreaterThan(0);
    for (const open of semestersOpen) expect(open).toBe(true);
  });

  test('(f) inputs stay 16px at 360px (no iOS zoom)', async ({ page }) => {
    test.skip((await widthOf(page)) > 720, '16px rule applies at <=720px');
    await tapOrClick(page.locator('summary.catalog-summary'));
    const fontSize = await page
      .getByLabel('Search courses')
      .evaluate((el) => getComputedStyle(el).fontSize);
    expect(fontSize).toBe('16px');
  });

  test('(g) agenda view after loading example outline', async ({ page }) => {
    await loadExampleOutline(page);
    await page.getByRole('button', { name: 'Timetable view' }).click();
    await expect(page.getByRole('heading', { name: /Weekly Timetable Preview/i })).toBeVisible();
    if (await isNarrow(page)) {
      await expect(page.getByLabel('Day-by-day agenda view')).toBeVisible();
    } else {
      await expect(page.locator('.timetable-grid')).toBeVisible();
    }
  });

  test('(h) no native dialogs block the flow; page stays interactive', async ({ page }) => {
    let nativeDialogs = 0;
    page.on('dialog', (dialog) => {
      nativeDialogs += 1;
      void dialog.dismiss();
    });
    await loadExampleOutline(page);
    await page.getByRole('button', { name: 'Timetable view' }).click();
    await expect(page.getByRole('heading', { name: /Weekly Timetable Preview/i })).toBeVisible();
    await page.getByRole('button', { name: 'Board view' }).click();
    await expect(page.locator('.plan-column')).toBeVisible();
    expect(nativeDialogs).toBe(0);
  });

  test('(shots) mobile screenshot set for @designer review', async ({ page }) => {
    const width = await widthOf(page);
    test.skip(width !== 360 && width !== 768, 'screenshots captured at 360 and 768 only');
    const shot = (name: string) =>
      page.screenshot({ path: `shots/mobile/${name}.png`, animations: 'disabled' });

    if (width === 360) {
      await page.waitForTimeout(400);
      await shot('board-360-collapsed');

      await openMore(page);
      await page.waitForTimeout(300);
      await shot('more-sheet-open-360');
      await page.keyboard.press('Escape');

      await tapOrClick(page.locator('summary.catalog-summary'));
      await expect(page.locator('details.catalog-panel')).toHaveJSProperty('open', true);
      await shot('catalog-open-360');

      await loadExampleOutline(page);
      await page.getByRole('button', { name: 'Timetable view' }).click();
      await expect(page.getByLabel('Day-by-day agenda view')).toBeVisible();
      await page.waitForTimeout(400);
      await shot('timetable-agenda-360');

      await page.getByRole('button', { name: 'Board view' }).click();
      await page.getByRole('button', { name: /Course Discovery/i }).click();
      const explorer = page.getByRole('dialog', { name: 'Degree requirements roadmap' });
      await expect(explorer).toBeVisible();
      await expect(page.locator('h1')).toHaveCount(1);
      await page.waitForTimeout(300);
      await shot('explorer-dialog-360');
    } else {
      await loadExampleOutline(page);
      await page.waitForTimeout(400);
      await shot('board-768');

      await page.getByRole('button', { name: 'Timetable view' }).click();
      await expect(page.locator('.timetable-grid')).toBeVisible();
      await page.waitForTimeout(600);
      await shot('timetable-768');
    }
  });
});
