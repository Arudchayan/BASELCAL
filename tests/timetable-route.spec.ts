import { expect, test, type Page } from '@playwright/test';

type SeedPlan = {
  s1?: string[];
  s2?: string[];
  s3?: string[];
  s4?: string[];
};

async function openTimetableWithPlan(page: Page, plan: SeedPlan) {
  await page.addInitScript((seed) => {
    localStorage.setItem('basel-active-programme-v1', 'data-science');
    localStorage.setItem('basel-plan-v7:data-science', JSON.stringify(seed));
  }, plan);
  await page.goto('/');
  await page.getByRole('button', { name: 'Timetable view' }).click();
  await expect(page.getByRole('heading', { name: 'Weekly Timetable Preview' })).toBeVisible();
}

test.describe('timetable and campus route consistency', () => {
  test('sorts the campus route chronologically and calculates breaks from the next class', async ({ page }) => {
    await openTimetableWithPlan(page, {
      s1: ['AD-10489-1', 'S-15731', 'E-55662', 'AD-62060'],
    });

    await page.getByLabel('Timetable week date').fill('2026-09-14');
    await page.locator('.campus-route__days').getByRole('tab', { name: 'Fri' }).click();

    const timeline = page.locator('.campus-route__timeline');
    await expect(timeline.locator('.route-stop__body > strong')).toHaveText([
      'Analysis I',
      'Scientific Computing',
      'Applied Mathematics and Informatics in Drug Discovery',
      'Multimedia Retrieval',
    ]);
    await expect(timeline).toContainText('1h 15m break: University Medical Library');
    await expect(timeline).not.toContainText('5h 15m break');
  });

  test('uses the selected timetable week for campus routes', async ({ page }) => {
    await openTimetableWithPlan(page, {
      s1: ['AD-11037', 'AD-20980'],
    });

    const week = page.getByLabel('Timetable week date');
    await week.fill('2026-09-14');
    await page.locator('.campus-route__days').getByRole('tab', { name: 'Tue' }).click();
    let stops = page.locator('.campus-route__timeline .route-stop__body > strong');
    await expect(stops).toHaveText(['Scientific Computing']);
    await expect(stops).not.toContainText('Analysis I (Standardprogramm)');

    await week.fill('2026-09-21');
    await expect(stops).toHaveText(['Scientific Computing', 'Analysis I (Standardprogramm)']);
  });

  test('keeps an unmapped room visible and does not invent a walking route', async ({ page }) => {
    await openTimetableWithPlan(page, { s2: ['AD-62061'] });
    await page.locator('.segmented').getByRole('button', { name: 'Sem 2' }).click();

    const timeline = page.locator('.campus-route__timeline');
    await expect(timeline).toContainText('Algorithms and Data Structures');
    await expect(timeline).toContainText('Location not mapped');
    await expect(page.locator('.campus-route__notice')).toContainText('Pharmazentrum');
    await expect(page.locator('.campus-route__summary')).toContainText('Route unavailable for this day');
    await expect(timeline.locator('.route-leg')).toHaveCount(0);
  });

  test('hides walking suggestions when classes overlap', async ({ page }) => {
    await openTimetableWithPlan(page, {
      s2: ['AD-10906', 'ML-17165', 'ML-13548'],
    });
    await page.locator('.segmented').getByRole('button', { name: 'Sem 2' }).click();
    await page.locator('.campus-route__days').getByRole('tab', { name: 'Wed' }).click();

    await expect(page.locator('.campus-route__notice')).toContainText('classes overlap on Wednesday');
    await expect(page.locator('.campus-route__summary')).toContainText('Route unavailable for this day');
    await expect(page.locator('.campus-route__timeline .library-break')).toHaveCount(0);
    await expect(page.locator('.campus-route__timeline .route-leg')).toHaveCount(0);
  });
});
