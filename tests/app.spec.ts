import { test, expect } from '@playwright/test';

test.describe('BASELCAL App Main Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open the Course Explorer', async ({ page }) => {
    // Look for the "Course Discovery" button and click it
    const discoveryBtn = page.getByRole('button', { name: /Course Discovery/i });
    await expect(discoveryBtn).toBeVisible();
    await discoveryBtn.click();
    
    // The explorer should show "Master Thesis Block" text
    const thesisBlock = page.getByText('Master Thesis Block');
    await expect(thesisBlock).toBeVisible();
  });

  test('keeps the nested explorer dialog lifecycle predictable', async ({ page }) => {
    await page.getByRole('button', { name: /Course Discovery/i }).click();

    const explorerDialog = page.getByRole('dialog', { name: 'Degree requirements roadmap' });
    await expect(explorerDialog).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(1);

    await explorerDialog.getByRole('button', { name: /Read Details/i }).first().click();
    await expect(page.getByRole('dialog')).toHaveCount(2);
    await expect(page.getByRole('dialog').last()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(explorerDialog).toBeVisible();

    await explorerDialog.getByRole('button', { name: 'Return to Planner' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'MSc Data Science Curriculum Architect' })).toBeVisible();
  });

  test('Course Explorer uses the shared details modal for wishlist actions', async ({ page }) => {
    await page.getByRole('button', { name: /Course Discovery/i }).click();

    const detailsButton = page.getByRole('button', { name: /Read Details/i }).first();
    await expect(detailsButton).toBeVisible();
    await detailsButton.click();

    const courseDialog = page.getByRole('dialog').last();
    await expect(courseDialog).toBeVisible();
    await courseDialog.getByRole('button', { name: /Add to Wishlist/i }).click();
    await expect(page.getByRole('button', { name: /Remove from wishlist/i }).first()).toBeVisible();
  });

  test('should open Course Details modal', async ({ page }) => {
    // Find the first "View Course Details" button in the course catalog and click it
    const viewDetailsBtn = page.getByTitle('View Course Details').first();
    
    await expect(viewDetailsBtn).toBeVisible();
    await viewDetailsBtn.click();
    
    // Verify that the course details modal is open.
    // The modal usually has "Prerequisites" or "Exam" info, or we can check for close button
    const closeBtn = page.locator('button', { has: page.locator('.lucide-x') }).last();
    await expect(closeBtn).toBeVisible();
    
    // Close the modal
    await closeBtn.click();
  });

  test('should toggle Timetable view', async ({ page }) => {
    // Look for the "Timetable" button and click it
    const timetableBtn = page.getByRole('button', { name: /Timetable/i });
    await expect(timetableBtn).toBeVisible();
    await timetableBtn.click();
    
    // It should now render days of the week like "Monday"
    const mondayColumn = page.getByText('Monday');
    await expect(mondayColumn).toBeVisible();
  });
});
