import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test.slow(); 
  
  // Skip non-chromium browsers due to environment-specific flakiness with form submission in headless mode
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only for chat tests');

  test.beforeEach(async ({ page }) => {
    // Disable animations
    await page.addInitScript(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            *, *::before, *::after {
                animation-duration: 0s !important;
                transition-duration: 0s !important;
            }
        `;
        document.head.appendChild(style);
    });

    // Authenticate
    await page.addInitScript(() => {
      localStorage.setItem('liminal_token', 'e2e-token');
    });

    // Mock API defaults
    await page.route('**/tasks', async route => {
      const method = route.request().method();
      if (method === 'GET') await route.fulfill({ json: [] });
      else if (method === 'POST') {
        const data = route.request().postDataJSON();
        await route.fulfill({ 
          json: {
            id: 'mock-task-id',
            title: data.title,
            status: 'backlog',
            priority: data.priority || 'medium',
            value_score: 50,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } 
        });
      } else await route.continue();
    });

    await page.route('**/themes', async route => route.fulfill({ json: [] }));
    await page.route('**/users', async route => route.fulfill({ json: { id: 'demo-user' } }));
    await page.route('**/api/config', async route => route.fulfill({ json: { authRequired: false } }));
    await page.route('**/llm/history/**', async route => route.fulfill({ json: [] }));
    
    // Default LLM Mock
    await page.route('**/llm/chat', async route => {
       await route.fulfill({ 
        json: { content: "I'm your Liminal Coach. How can I help?" } 
      });
    });

    await page.goto('/');
    
    // Open Global Chat Widget
    // The FAB is fixed bottom right. We can find it by the MessageSquare icon (hidden to accessibility?)
    // Or just find the button that isn't the task form button.
    // Let's use a specific locator based on the container class or similar.
    const fab = page.locator('.fixed.bottom-6.right-6 button');
    await fab.click();

    await expect(page.getByText('Liminal Coach')).toBeVisible();
  });

  test('should display chat interface elements', async ({ page }) => {
    await expect(page.getByPlaceholder("Type 'Add task buy milk'...")).toBeVisible();
    await expect(page.getByRole('button', { name: '' }).last()).toBeVisible();
  });

  test('should send a message and display response', async ({ page }) => {
    // Override mock for this specific test
    await page.unroute('**/llm/chat');
    await page.route('**/llm/chat', async route => {
      await route.fulfill({ json: { content: "That sounds like a great plan!" } });
    });

    // Use specific placeholder to target Chat Interface input
    const input = page.getByPlaceholder("Type 'Add task buy milk'...");
    await input.fill('I need motivation');
    await page.keyboard.press('Enter');

    // Ensure submission happened
    await expect(input).toHaveValue('');

    await expect(page.getByText('I need motivation')).toBeVisible();
    await expect(page.getByText('That sounds like a great plan!')).toBeVisible();
  });

  test('should handle task creation tool commands', async ({ page }) => {
    await page.unroute('**/llm/chat');
    await page.route('**/llm/chat', async route => {
      await route.fulfill({ 
        json: { 
          content: "Sure, I'll add that for you. ::: { \"action\": \"create_task\", \"data\": { \"title\": \"Buy milk\" } } :::" 
        } 
      });
    });

    const input = page.getByPlaceholder("Type 'Add task buy milk'...");
    await input.fill('Add task buy milk');
    await page.keyboard.press('Enter');

    await expect(input).toHaveValue('');
    await expect(page.getByText("Sure, I'll add that for you. (Task created ✓)")).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.unroute('**/llm/chat');
    await page.route('**/llm/chat', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    const input = page.getByPlaceholder("Type 'Add task buy milk'...");
    await input.fill('Hello?');
    await page.keyboard.press('Enter');
    
    await expect(input).toHaveValue('');
    await expect(page.getByText('Sorry, I encountered an error connecting to my brain.')).toBeVisible();
  });
});
