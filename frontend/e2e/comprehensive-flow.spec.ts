
import { test, expect, request } from '@playwright/test';
import jwt from 'jsonwebtoken';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const SECRET_KEY = process.env.SECRET_KEY || 'change-me-in-prod';

// Helper to generate a local dev token compatible with backend
function generateToken(userId: string, email: string) {
  return jwt.sign(
    { 
      sub: userId, 
      email: email,
      iss: 'liminal-local', // Matches backend logic
      name: 'E2E Test User'
    },
    SECRET_KEY,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

test.describe('Full System Task Flow', () => {
  let authToken: string;
  let userId: string;
  let uniqueId: string;
  const userEmail = `e2e-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

  test.beforeAll(async ({ request }) => {
    // 1. Create a User via API (Real Backend)
    // We assume ENABLE_LOCAL_AUTH=1 is set on backend
    const response = await request.post(`${API_URL}/users`, {
      data: {
        email: userEmail,
        password: 'password123',
        name: 'E2E Tester'
      }
    });

    if (response.status() === 404) {
      console.warn("Backend local auth not enabled or unreachable. Skipping setup.");
      // Fallback: If we can't create, we generate a random ID and hope JIT provisioning (if enabled) or mocked state works?
      // No, for "True" E2E, we need the backend.
      // If 400, maybe user exists.
    }
    
    if (response.ok()) {
      const body = await response.json();
      userId = body.id;
    } else if (response.status() === 400) {
      // User might exist, but we don't know the ID easily without login.
      // For this test, unique emails prevent this.
      throw new Error(`Failed to create test user: ${response.statusText()}`);
    } else {
       throw new Error(`Backend error: ${response.status()} ${response.statusText()}`);
    }

    // 2. Generate Token
    authToken = generateToken(userId, userEmail);
  });

  test.beforeEach(async ({ page }) => {
    // Inject token into local storage before page loads
    await page.addInitScript((token) => {
      localStorage.setItem('liminal_token', token);
    }, authToken);
  });

  test('Flow A: Quick Add Task -> Horizon Verification', async ({ page, request }) => {
    uniqueId = `QA-${Date.now()}`;
    const taskTitle = `Buy Groceries ${uniqueId}`;

    // 1. Visit Home
    await page.goto('/');

    // 2. Open Quick Capture
    // Assuming the main input on homepage acts as quick capture or there is a button
    // Based on previous tests: "Add New Task" button
    const addButton = page.getByRole('button', { name: /Add New Task/i });
    if (await addButton.isVisible()) {
        await addButton.click();
    }
    
    // 3. Fill Task
    const input = page.getByPlaceholder(/What needs to be done/i);
    await expect(input).toBeVisible();
    await input.fill(taskTitle);
    
    // 4. Submit
    const submitBtn = page.getByRole('button', { name: /Add Task/i });
    await submitBtn.click();

    // 5. Verify UI Feedback (Optional Toast?)
    // Checking if input cleared is a good proxy
    await expect(input).not.toBeVisible(); // Form closes

    // 6. Go to Horizon (Board)
    await page.goto('/board');
    await expect(page.getByRole('heading', { name: 'Horizon View' })).toBeVisible();

    // 7. Verify Task Card Exists
    const taskCard = page.getByText(taskTitle);
    await expect(taskCard).toBeVisible();

    // 8. Verify DB Persistence via API
    const tasksRes = await request.get(`${API_URL}/tasks`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(tasksRes.ok()).toBeTruthy();
    const tasks = await tasksRes.json();
    const found = tasks.find((t: any) => t.title === taskTitle);
    expect(found).toBeDefined();
    expect(found.title).toBe(taskTitle);
  });

  test('Flow B: Chat Agent Task Creation -> Horizon Verification', async ({ page, request }) => {
    test.setTimeout(60000); // Chat can be slow
    uniqueId = `Chat-${Date.now()}`;
    const taskTitle = `Book Flights ${uniqueId}`;

    // 1. Visit Home
    await page.goto('/');

    // 2. Open Chat Widget
    const chatFab = page.locator('.fixed.bottom-6.right-6 button');
    await chatFab.click();
    await expect(page.getByText('Liminal Coach')).toBeVisible();

    // 3. Send Instruction
    const chatInput = page.getByPlaceholder(/Type/i);
    await chatInput.fill(`Create a task named "${taskTitle}"`);
    await page.keyboard.press('Enter');

    // 4. Handle Confirmation
    // The agent should ask for confirmation.
    // We wait for the "pending_confirmation" marker logic or the text asking for "yes"
    // Note: The UI strips the raw JSON marker, so we look for the text.
    await expect(page.getByText(/confirm/i)).toBeVisible({ timeout: 15000 });
    
    // 5. Confirm
    await chatInput.fill('yes');
    await page.keyboard.press('Enter');

    // 6. Wait for Completion
    await expect(page.getByText(/Created task/i)).toBeVisible({ timeout: 15000 });

    // 7. Verify Horizon
    await page.goto('/board');
    const taskCard = page.getByText(taskTitle);
    await expect(taskCard).toBeVisible();

    // 8. Verify DB
    const tasksRes = await request.get(`${API_URL}/tasks`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const tasks = await tasksRes.json();
    const found = tasks.find((t: any) => t.title === taskTitle);
    expect(found).toBeDefined();
  });
});
