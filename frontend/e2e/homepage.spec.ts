import { test, expect } from '@playwright/test';

test.describe('Homepage - Task List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display page title and task counts', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Liminal Focus/i })).toBeVisible();
    // Task count text will be dynamic based on actual tasks
    // "active items" or "in Threshold"
    await expect(page.getByText(/items/i)).toBeVisible();
  });

  test('should display heading based on mode', async ({ page }) => {
    // Should show "Prioritized Queue" heading in planning mode
    await expect(page.getByText(/Prioritized Queue/i)).toBeVisible();
  });

  test('should display sidebar with ranking logic', async ({ page }) => {
    // Should show ranking explanation in sidebar
    await expect(page.getByText(/Ranking Logic/i)).toBeVisible();
    await expect(page.getByText(/ROI/i)).toBeVisible();
  });

  test('should show Quick Capture input', async ({ page }) => {
    const input = page.getByPlaceholder(/New Task/i);
    await expect(input).toBeVisible();
    await expect(input).toBeEditable();
  });

  test('should have navigation to board page', async ({ page }) => {
    const boardLink = page.getByRole('link', { name: /Exec Board/i });
    await expect(boardLink).toBeVisible();
    await expect(boardLink).toHaveAttribute('href', '/board');
  });
});