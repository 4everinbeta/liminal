import { test, expect } from '@playwright/test';

test.describe('Horizon View - Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API
    await page.route('**/tasks', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({ json: [
                { id: '1', title: 'Backlog Task 1', status: 'backlog', priority: 'medium', value_score: 10, estimated_duration: 30, created_at: new Date().toISOString() },
                { id: '2', title: 'Theme Task 1', status: 'in_progress', theme_id: 'theme-1', priority: 'high', value_score: 80, estimated_duration: 60, created_at: new Date().toISOString() }
            ] });
        } else {
            await route.continue();
        }
    });

    await page.route('**/themes', async route => {
        await route.fulfill({ json: [
            { id: 'theme-1', title: 'AI Enablement', color: '#4F46E5', user_id: 'u1' },
            { id: 'theme-2', title: 'Team Building', color: '#10B981', user_id: 'u1' }
        ] });
    });
    
    await page.route('**/users', async route => route.fulfill({ json: { id: 'demo-user' } }));
    await page.route('**/auth/login', async route => route.fulfill({ json: { access_token: 'fake-jwt' } }));

    await page.goto('/board');
  });

  test('should display board title and description', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Horizon View' })).toBeVisible();
    await expect(page.getByText('Align work to themes. Clear the Threshold.')).toBeVisible();
  });

  test('should display The Threshold and Theme columns', async ({ page }) => {
    // "The Threshold" is the backlog
    await expect(page.getByText('The Threshold')).toBeVisible();
    
    // Default themes
    await expect(page.getByText('AI Enablement')).toBeVisible();
    await expect(page.getByText('Team Building')).toBeVisible();
  });

  test('should show task counts in column headers', async ({ page }) => {
    // Just check that the badge exists
    const thresholdHeader = page.locator('div').filter({ hasText: 'The Threshold' }).first();
    await expect(thresholdHeader.locator('span')).toBeVisible();
  });

  test('should have link back to Focus Mode', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Focus Mode' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/');
  });
});