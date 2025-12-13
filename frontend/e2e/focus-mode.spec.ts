import { test, expect } from '@playwright/test';

test.describe('Focus Mode Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API
    await page.route('**/tasks', async route => {
        await route.fulfill({ json: [
            { id: '1', title: 'Important Task', status: 'in_progress', priority: 'high', value_score: 90, estimated_duration: 30, created_at: new Date().toISOString() }
        ] });
    });
    
    await page.route('**/users', async route => route.fulfill({ json: { id: 'demo-user' } }));
    await page.route('**/auth/login', async route => route.fulfill({ json: { access_token: 'fake-jwt' } }));

    await page.goto('/');
  });

  test('should start in planning mode by default', async ({ page }) => {
    const focusButton = page.getByRole('button', { name: /Planning Mode/i });
    await expect(focusButton).toBeVisible();

    // Should show "Prioritized Queue" heading
    await expect(page.getByText(/Prioritized Queue/i)).toBeVisible();
  });

  test('should toggle to focus mode', async ({ page }) => {
    // Click the focus toggle button
    await page.getByRole('button', { name: /Planning Mode/i }).click();

    // Button should change to "Focus Mode On"
    await expect(page.getByRole('button', { name: /Focus Mode On/i })).toBeVisible();

    // Heading should change to "Highest Impact Task"
    await expect(page.getByText(/Highest Impact Task/i)).toBeVisible();
  });

  test('should hide sidebar in focus mode', async ({ page }) => {
    // Sidebar should be visible initially (Ranking Logic)
    await expect(page.getByText(/Ranking Logic/i)).toBeVisible();

    // Toggle to focus mode
    await page.getByRole('button', { name: /Planning Mode/i }).click();

    // Sidebar should be hidden
    await expect(page.getByText(/Ranking Logic/i)).not.toBeVisible();
  });

  test('should make Quick Capture less prominent in focus mode', async ({ page }) => {
    // Toggle to focus mode
    await page.getByRole('button', { name: /Planning Mode/i }).click();

    // Form should have reduced opacity class
    // Hierarchy: Wrapper(opacity-50) > QuickCapture > div > form
    // So we find the form, then go up 3 levels? 
    // Or better: find the div that wraps QuickCapture in page.tsx
    // The wrapper in page.tsx has `transition-opacity`
    const wrapper = page.locator('div.transition-opacity');
    
    await expect(wrapper).toHaveClass(/opacity-50/);
  });
});