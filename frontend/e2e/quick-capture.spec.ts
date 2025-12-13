import { test, expect } from '@playwright/test';

test.describe('Quick Capture', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API
    await page.route('**/tasks', async route => {
      if (route.request().method() === 'POST') {
        const json = {
            id: 'mock-id-1',
            title: 'Test task',
            status: 'backlog',
            priority: 'medium',
            value_score: 50,
            created_at: new Date().toISOString()
        };
        await route.fulfill({ json });
      } else if (route.request().method() === 'GET') {
        await route.fulfill({ json: [] });
      } else {
        await route.continue();
      }
    });

    await page.route('**/themes', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: [] });
      } else {
        await route.continue();
      }
    });

    await page.route('**/users', async route => route.fulfill({ json: { id: 'demo-user' } }));
    await page.route('**/auth/login', async route => route.fulfill({ json: { access_token: 'fake-jwt' } }));

    await page.goto('/');
  });

  test('should display Quick Capture input field', async ({ page }) => {
    const input = page.getByPlaceholder(/New Task/i);
    await expect(input).toBeVisible();
  });

  test('should allow typing in Quick Capture', async ({ page }) => {
    const input = page.getByPlaceholder(/New Task/i);
    await input.fill('Buy groceries');
    await expect(input).toHaveValue('Buy groceries');
  });

  test('should show submit button when input is focused', async ({ page }) => {
    const input = page.getByPlaceholder(/New Task/i);

    // Focus the input
    await input.focus();

    // Submit button should appear
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should submit and clear input on form submission', async ({ page }) => {
    const input = page.getByPlaceholder(/New Task/i);

    // Type a task
    await input.fill('Call the dentist');

    // Submit the form
    await page.keyboard.press('Enter');

    // Wait for input to be cleared (implies success)
    await expect(input).toHaveValue('', { timeout: 5000 });
  });

  test('should show success message "Added to Threshold"', async ({ page }) => {
    const input = page.getByPlaceholder(/New Task/i);

    await input.fill('Test task success');
    await page.keyboard.press('Enter');

    // Should show success message
    await expect(page.getByText(/Added to Threshold/i)).toBeVisible({ timeout: 5000 });
  });
});
