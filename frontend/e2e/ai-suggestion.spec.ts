import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000';

const TASKS = [
  {
    id: 'task-1',
    title: 'Write quarterly report',
    status: 'todo',
    priority: 'high',
    value_score: 90,
    estimated_duration: 45,
    due_date: '2026-03-25',
    ai_relevance_score: 95,
    user_id: 'demo-user',
    order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'Review pull requests',
    status: 'todo',
    priority: 'medium',
    value_score: 60,
    estimated_duration: 20,
    ai_relevance_score: 40,
    user_id: 'demo-user',
    order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const AI_SUGGESTION = {
  suggested_task_id: 'task-1',
  reasoning: 'This report is due soon and has the highest value score.',
};

async function setupRoutes(page: any, { withSuggestion = true, startInFocus = false } = {}) {
  const focusMode = startInFocus;
  await page.addInitScript((isFocusMode: boolean) => {
    localStorage.setItem('liminal_token', 'e2e-token');
    // Seed Zustand store with desired starting mode
    const store = JSON.parse(localStorage.getItem('liminal-app') || '{"state":{}}');
    store.state = { ...store.state, isFocusMode };
    localStorage.setItem('liminal-app', JSON.stringify(store));
  }, focusMode);

  // Local Next.js API route
  await page.route('**/api/config', route =>
    route.fulfill({ json: { authRequired: false } })
  );

  // Register broader patterns first (lower priority in Playwright's LIFO matching)
  await page.route(`${API}/themes`, route => route.fulfill({ json: [] }));
  await page.route(`${API}/users/*`, route => route.fulfill({ json: { id: 'demo-user' } }));
  await page.route(`${API}/users`, route => route.fulfill({ json: { id: 'demo-user' } }));

  await page.route(`${API}/tasks`, async route => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ json: TASKS });
    } else if (method === 'POST') {
      await route.fulfill({ json: { ...TASKS[0], id: 'task-new' } });
    } else {
      await route.continue();
    }
  });

  await page.route(`${API}/tasks/*`, async route => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ json: TASKS[0] });
    } else if (method === 'PATCH' || method === 'DELETE') {
      await route.fulfill({ json: TASKS[0] });
    } else {
      await route.continue();
    }
  });

  // More-specific patterns registered last = highest priority
  await page.route(`${API}/tasks/deleted`, route => route.fulfill({ json: [] }));
  await page.route(`${API}/tasks/*/ai-feedback`, route =>
    route.fulfill({ json: { ...TASKS[0], ai_suggestion_status: 'accepted' } })
  );
  await page.route(`${API}/tasks/ai-suggestion`, route => {
    if (withSuggestion) {
      route.fulfill({ json: AI_SUGGESTION });
    } else {
      route.fulfill({ status: 404, body: JSON.stringify({ detail: 'No suggestion' }) });
    }
  });
}

async function gotoPlanning(page: any) {
  await page.goto('/');
  // Wait for planning mode content — store is pre-seeded with isFocusMode: false
  await expect(page.getByText('Quick capture')).toBeVisible({ timeout: 15000 });
}

test.describe('AI Suggestion card', () => {
  test('appears inline in Planning mode with task details', async ({ page }) => {
    await setupRoutes(page);
    await gotoPlanning(page);

    const card = page.getByText('AI Suggestion: Do This Now');
    await expect(card).toBeVisible({ timeout: 10000 });

    // Task title, reasoning, and metadata are shown
    await expect(page.getByRole('heading', { name: 'Write quarterly report' })).toBeVisible();
    await expect(page.getByText('This report is due soon and has the highest value score.')).toBeVisible();
    await expect(page.getByText(/Mar 25/)).toBeVisible();
    await expect(page.getByText('45 min')).toBeVisible();

    // Buttons are present
    await expect(page.getByText('Start This Task')).toBeVisible();
    await expect(page.getByText('Not Now')).toBeVisible();
  });

  test('is inline — not a fixed/floating overlay', async ({ page }) => {
    await setupRoutes(page);
    await gotoPlanning(page);

    await expect(page.getByText('AI Suggestion: Do This Now')).toBeVisible({ timeout: 10000 });

    const card = page.locator('.rounded-2xl').filter({ hasText: 'AI Suggestion: Do This Now' });
    const position = await card.evaluate((el: Element) => getComputedStyle(el).position);
    expect(position).not.toBe('fixed');
  });

  test('card appears between Toggles Row and Quick Capture', async ({ page }) => {
    await setupRoutes(page);
    await gotoPlanning(page);

    await expect(page.getByText('AI Suggestion: Do This Now')).toBeVisible({ timeout: 10000 });

    const togglesRow = page.getByLabel('Toggle AI sorting');
    const aiCard = page.locator('.rounded-2xl').filter({ hasText: 'AI Suggestion: Do This Now' });
    const quickCapture = page.getByText('Quick capture');

    const togglesBox = await togglesRow.boundingBox();
    const cardBox = await aiCard.first().boundingBox();
    const captureBox = await quickCapture.boundingBox();

    expect(cardBox!.y).toBeGreaterThan(togglesBox!.y);
    expect(cardBox!.y).toBeLessThan(captureBox!.y);
  });

  test('"Start This Task" switches to Focus mode', async ({ page }) => {
    await setupRoutes(page);
    await gotoPlanning(page);

    await expect(page.getByText('Start This Task')).toBeVisible({ timeout: 10000 });
    await page.getByText('Start This Task').click();

    // Focus mode shows "Current focus" heading
    await expect(page.getByText(/Current focus/i)).toBeVisible({ timeout: 5000 });

    // AI card should not be visible in Focus mode
    await expect(page.getByText('AI Suggestion: Do This Now')).not.toBeVisible();
  });

  test('"Not Now" dismisses card and stays in Planning mode', async ({ page }) => {
    await setupRoutes(page);
    await gotoPlanning(page);

    await expect(page.getByText('Not Now')).toBeVisible({ timeout: 10000 });
    await page.getByText('Not Now').click();

    // Card disappears
    await expect(page.getByText('AI Suggestion: Do This Now')).not.toBeVisible({ timeout: 3000 });

    // Still in Planning mode — Quick Capture remains visible
    await expect(page.getByText('Quick capture')).toBeVisible();
    await expect(page.getByText(/Current focus/i)).not.toBeVisible();
  });

  test('card does not appear in Focus mode', async ({ page }) => {
    await setupRoutes(page, { startInFocus: true });
    await page.goto('/');

    // Ensure we're in Focus mode
    await expect(page.getByText(/Current focus|No active tasks/i)).toBeVisible({ timeout: 10000 });

    // AI card must not be visible in Focus mode
    await expect(page.getByText('AI Suggestion: Do This Now')).not.toBeVisible();
  });

  test('no card when AI backend returns no suggestion', async ({ page }) => {
    await setupRoutes(page, { withSuggestion: false });
    await gotoPlanning(page);

    // Card should not appear — no suggestion available
    await expect(page.getByText('AI Suggestion: Do This Now')).not.toBeVisible();

    // Page renders normally
    await expect(page.getByText('Quick capture')).toBeVisible();
  });
});

test.describe('AI Sorting toggle', () => {
  test('sorts tasks by ai_relevance_score in AI mode, by priority in manual mode', async ({ page }) => {
    // task-2 has higher AI score (99) but lower priority (medium)
    // task-1 has lower AI score (10) but higher priority (high)
    // AI mode → task-2 first; manual mode → task-1 first
    const tasks = [
      { ...TASKS[0], ai_relevance_score: 10 },   // "Write quarterly report" — high priority, low AI score
      { ...TASKS[1], ai_relevance_score: 99 },   // "Review pull requests" — medium priority, high AI score
    ];

    await page.addInitScript((isFocusMode: boolean) => {
      localStorage.setItem('liminal_token', 'e2e-token');
      const store = JSON.parse(localStorage.getItem('liminal-app') || '{"state":{}}');
      store.state = { ...store.state, isFocusMode };
      localStorage.setItem('liminal-app', JSON.stringify(store));
    }, false);
    await page.route('**/api/config', route => route.fulfill({ json: { authRequired: false } }));
    await page.route(`${API}/themes`, route => route.fulfill({ json: [] }));
    await page.route(`${API}/users/*`, route => route.fulfill({ json: { id: 'demo-user' } }));
    await page.route(`${API}/users`, route => route.fulfill({ json: { id: 'demo-user' } }));
    await page.route(`${API}/tasks`, async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: tasks });
      } else {
        await route.continue();
      }
    });
    await page.route(`${API}/tasks/*`, route => route.fulfill({ json: tasks[0] }));
    await page.route(`${API}/tasks/deleted`, route => route.fulfill({ json: [] }));
    await page.route(`${API}/tasks/ai-suggestion`, route => route.fulfill({ status: 404, body: '{}' }));

    await gotoPlanning(page);

    // With AI sorting ON (default), task-2 (score 99) should appear before task-1 (score 10)
    const taskList = page.locator('[class*="space-y"] >> h3, [class*="space-y"] >> p').filter({ hasText: /quarterly report|pull requests/ });
    const aiSortedText = await page.locator('body').textContent();
    const reviewAI = aiSortedText!.indexOf('Review pull requests');
    const reportAI = aiSortedText!.indexOf('Write quarterly report');
    expect(reviewAI).toBeGreaterThan(-1);
    expect(reportAI).toBeGreaterThan(-1);
    expect(reviewAI).toBeLessThan(reportAI); // "Review pull requests" (score 99) first

    // Toggle AI sorting OFF → manual priority mode
    await page.getByLabel('Toggle AI sorting').click();
    await page.waitForTimeout(500); // allow re-sort

    const manualSortedText = await page.locator('body').textContent();
    const reviewManual = manualSortedText!.indexOf('Review pull requests');
    const reportManual = manualSortedText!.indexOf('Write quarterly report');
    expect(reviewManual).toBeGreaterThan(-1);
    expect(reportManual).toBeGreaterThan(-1);
    expect(reportManual).toBeLessThan(reviewManual); // "Write quarterly report" (high priority) first
  });
});
