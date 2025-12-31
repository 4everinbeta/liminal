import { test, expect } from '@playwright/test';

test.describe('Quick Capture', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('liminal_token', 'e2e-token');
    });

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
    await page.waitForTimeout(500);
    const openButton = page.getByRole('button', { name: /Add New Task/i });
    await expect(openButton).toBeVisible();
    await openButton.click({ force: true });
    await expect(page.getByText(/Task Title/i)).toBeVisible();
  });

  test('should display Quick Capture input field', async ({ page }) => {
    const input = page.getByPlaceholder(/What needs to be done\?/i);
    await expect(input).toBeVisible();
  });

  test('should allow typing in Quick Capture', async ({ page }) => {
    const input = page.getByPlaceholder(/What needs to be done\?/i);
    await input.fill('Buy groceries');
    await expect(input).toHaveValue('Buy groceries');
  });

  test('should show submit button when input is focused', async ({ page }) => {
    const input = page.getByPlaceholder(/What needs to be done\?/i);

    // Focus the input
    await input.focus();

    // Submit button should appear
    const submitButton = page.getByRole('button', { name: /Add Task/i });
    await expect(submitButton).toBeVisible();
  });

  test('should submit and close form on submission', async ({ page }) => {
    const input = page.getByPlaceholder(/What needs to be done\?/i);

    // Type a task
    await input.fill('Call the dentist');

    // Submit the form
    await page.getByRole('button', { name: /Add Task/i }).click();

    // Form should close back to the entry button
    await expect(page.getByRole('button', { name: /Add New Task/i })).toBeVisible();
  });
});
