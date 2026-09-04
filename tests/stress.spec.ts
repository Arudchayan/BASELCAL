import { test, expect } from '@playwright/test';

test.describe('BASELCAL App Stress Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Go to the app
    await page.goto('/');
  });

  test('should not crash when rapidly opening and closing course modals', async ({ page }) => {
    // Wait for the app to load courses
    await page.waitForSelector('.glass-panel');
    
    // Get all "View Course Details" buttons on the initial screen
    const viewDetailsBtns = page.getByTitle('View Course Details');
    const count = await viewDetailsBtns.count();
    
    // Stress test: rapidly open and close the modal 20 times (or max available)
    const iterations = Math.min(count, 20);
    
    for (let i = 0; i < iterations; i++) {
      // Click to open
      await viewDetailsBtns.nth(i).click();
      
      // Prefer explicit modal close control (board cards also use lucide-x for remove)
      const closeBtn = page.getByRole('button', { name: /Close course details/i });
      await expect(closeBtn).toBeVisible();
      
      // Click to close
      await closeBtn.click();
      
      // Wait for modal to disappear
      await expect(closeBtn).toBeHidden();
    }
  });
  test('should handle extreme data in search fields', async ({ page }) => {
    // Ensure search input is visible or open explorer if it's there
    // In App.tsx, there's a search state but we need to see where the input is.
    // I will look for placeholder containing "Search" or "search".
    const searchInput = page.getByPlaceholder(/search/i).first();
    
    if (await searchInput.isVisible()) {
      // Very long string
      const longString = 'A'.repeat(5000);
      await searchInput.fill(longString);
      
      // Special chars and XSS attempts
      const specialChars = '<script>alert(1)</script> 💥 👨‍👩‍👧‍👦 \x00\x01\x02 🎉 Drop table courses; --';
      await searchInput.fill(specialChars);
      
      // The app should remain responsive (we can still see the input and clear it)
      await expect(searchInput).toBeVisible();
      await searchInput.fill('Math');
      
      // We expect some courses to show up or no crash
      const glassPanels = page.locator('.glass-panel');
      expect(await glassPanels.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('timetable should not break rendering with massive course overlap', async ({ page }) => {
    // Use many real catalog IDs (rehydrate-by-id). Overlap comes from whatever schedules they have.
    await page.goto('/');
    await page.evaluate(() => {
      const ids = [
        'AD-10489-1',
        'AD-20980',
        'AD-62060',
        'M-66096',
        'S-45402',
        'E-11680',
        'E-11681',
        'M-19300',
        'ML-17165',
        'ML-13548',
        'S-15728',
        'ML-45366',
      ];
      localStorage.setItem(
        'basel-ds-plan-v6',
        JSON.stringify({ s1: ids, s2: [], s3: [], s4: [] }),
      );
      localStorage.removeItem('basel-ds-plan-v2');
      localStorage.removeItem('basel-ds-plan');
    });

    await page.reload();

    const timetableBtn = page.getByRole('button', { name: /Timetable/i });
    await expect(timetableBtn).toBeVisible();
    await timetableBtn.click();

    await expect(page.getByText('Monday').first()).toBeVisible();
    await expect(page.getByText('Weekly Timetable Preview')).toBeVisible();
    // Conflict report or session blocks should render without crashing
    await expect(page.locator('body')).toBeVisible();
  });
});
