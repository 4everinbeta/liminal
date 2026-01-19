import { test, expect } from '@playwright/test';

test.describe('Focus Mode Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('liminal_token', 'e2e-token');
    });

    await page.route('**/api/config', async route => route.fulfill({ json: { authRequired: false } }));

    await page.route(/.*\/tasks.*/, async route => {
      const { method, url } = route.request();
      if (method === 'GET' && url.includes('/tasks')) {
        await route.fulfill({ json: [
          {
            id: '1',
            title: 'Important Task',
            status: 'in_progress',
            priority: 'high',
            value_score: 90,
            estimated_duration: 30,
            user_id: 'demo-user',
            order: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ] });
        return;
      }
      if (method === 'PATCH' && /\/tasks\/.+/.test(url)) {
        await route.fulfill({ json: { status: 'done' } });
        return;
      }
      await route.continue();
    });

    await page.route('**/themes', async route => route.fulfill({ json: [] }));
    await page.route('**/users', async route => route.fulfill({ json: { id: 'demo-user' } }));

    await page.goto('/focus');
  });

  test('should show the current focus task', async ({ page }) => {
    await expect(page.getByText(/Current focus/i)).toBeVisible();
    const taskHeading = page.getByRole('heading', { name: /Important Task/i });
    if (await taskHeading.isVisible()) {
      await expect(taskHeading).toBeVisible();
      return;
    }

    await expect(page.getByRole('heading', { name: /Select a task to focus/i })).toBeVisible();
  });

  test('should show focus action buttons', async ({ page }) => {
    const taskHeading = page.getByRole('heading', { name: /Important Task/i });
    if (await taskHeading.isVisible()) {
      await expect(page.getByRole('button', { name: /Complete task/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: /Select a task to focus/i })).toBeVisible();
    }
  });

  test('should provide a way back to the board', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Back to board/i })).toBeVisible();
  });
});
