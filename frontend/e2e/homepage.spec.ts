import { test, expect } from '@playwright/test';

test.describe('Homepage - Task List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('liminal_token', 'e2e-token');
    });

    await page.route('**/tasks', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: [] });
        return;
      }
      await route.continue();
    });

    await page.goto('/');
    await page.waitForTimeout(500);
  });

  test('should display page header and urgent queue', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Today.?s board/i })).toBeVisible();
    await expect(page.getByText(/Urgent queue/i)).toBeVisible();
  });

  test('should show quick capture form when opened', async ({ page }) => {
    const openButton = page.getByRole('button', { name: /Add New Task/i });
    await expect(openButton).toBeVisible();
    await openButton.click({ force: true });

    await expect(page.getByText(/Task Title/i)).toBeVisible();
    const input = page.getByPlaceholder(/What needs to be done\?/i);
    await expect(input).toBeVisible();
  });

  test('should have navigation to focus mode page', async ({ page }) => {
    const focusLink = page.getByRole('link', { name: /Focus mode/i });
    await expect(focusLink).toBeVisible();
    await expect(focusLink).toHaveAttribute('href', '/focus');
  });
});
