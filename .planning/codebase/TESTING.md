# Testing Patterns

**Analysis Date:** 2026-01-31

## Test Framework

**Frontend:**
- Runner: Vitest 1.0.0
- Config: `frontend/vitest.config.ts`
- Assertion Library: Vitest's built-in expect (compatible with Jest)
- Environment: jsdom

**Backend:**
- Runner: pytest with pytest-asyncio support
- Config: `backend/pytest.ini`
- AsyncIO Mode: auto
- Test discovery: `test_*.py` files in `tests/` directory

**Run Commands:**

Frontend:
```bash
npm run test              # Run all unit tests
npm run test:ui          # Interactive Vitest UI
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:headed  # Run E2E with visible browser
npm run test:all         # Run unit + E2E tests
```

Backend:
```bash
pytest                   # Run all tests
pytest -v               # Verbose output
pytest -m slow          # Run only slow tests
pytest -m "not slow"    # Skip slow tests
```

## Test File Organization

**Frontend:**
- Location: Co-located in `__tests__/` directory at frontend root, parallel to source
- Naming: `[component].test.tsx` for component tests, `[module].test.ts` for utility tests
- Pattern: One test file per component/module

**Files:**
- `frontend/__tests__/components/TaskCard.test.tsx`
- `frontend/__tests__/components/FocusToggle.test.tsx`
- `frontend/__tests__/components/QuickCapture.test.tsx`
- `frontend/__tests__/lib/api.test.ts`

**Backend:**
- Location: `backend/tests/` directory (separate from source)
- Naming: `test_[module].py` for each module being tested
- Pattern: One test file per source module

**Files:**
- `backend/tests/test_tasks.py`
- `backend/tests/test_users.py`
- `backend/tests/test_initiatives.py`
- `backend/tests/test_themes.py`
- `backend/tests/conftest.py` (shared fixtures)

## Test Structure

**Frontend - Unit Test Pattern:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FocusToggle from '@/components/FocusToggle'

describe('FocusToggle Component', () => {
  beforeEach(() => {
    // Reset state before each test
    const { isFocusMode } = useAppStore.getState()
    if (isFocusMode) {
      useAppStore.getState().toggleFocusMode()
    }
  })

  it('should render in planning mode by default', () => {
    render(<FocusToggle />)
    expect(screen.getByRole('button', { name: /Planning Mode/i })).toBeInTheDocument()
  })

  it('should toggle to focus mode when clicked', async () => {
    const user = userEvent.setup()
    render(<FocusToggle />)

    const button = screen.getByRole('button', { name: /Planning Mode/i })
    await user.click(button)

    expect(screen.getByRole('button', { name: /Focus Mode On/i })).toBeInTheDocument()
  })
})
```

**Backend - Unit Test Pattern:**

```python
@pytest.mark.asyncio
async def test_create_task(authed_client: AsyncClient, sample_task_data):
    """Test creating a new task (CREATE)."""
    response = await authed_client.post("/tasks", json=sample_task_data)

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == sample_task_data["title"]
    assert data["priority"] == sample_task_data["priority"]
    assert "id" in data
```

## Mocking

**Frontend Mocking Framework:** @testing-library/react utilities and Vitest mocking

**Patterns:**

Zustand store mocking/resetting:
```typescript
beforeEach(() => {
  const { isFocusMode } = useAppStore.getState()
  if (isFocusMode) {
    useAppStore.getState().toggleFocusMode()
  }
})
```

**What to Mock:**
- Zustand store state (reset before each test to isolate tests)
- API calls (via dependency injection in components; fixtures in backend)
- External services (not heavily tested; mostly via integration tests)

**What NOT to Mock:**
- Component internals (avoid testing implementation details)
- DOM APIs (let @testing-library handle this)
- User interactions (use userEvent.setup() to simulate real user behavior)

**Backend Mocking:**
- Database: In-memory SQLite for all tests (no mocking of SQLModel/SQLAlchemy)
- Authentication: Fixture `authed_client` handles auth setup
- HTTP clients: Real httpx.AsyncClient used with test transport

## Fixtures and Factories

**Frontend - Test Data:**
Not heavily used; inline mock objects created in tests:

```typescript
const mockTask = {
  id: '1',
  title: 'Test Task',
  priority_score: 90,
  estimatedTime: 30,
  themeColor: undefined,
}
```

**Backend - Test Data Fixtures:**

Location: `backend/tests/conftest.py`

```python
@pytest.fixture
def sample_task_data():
    return {
        "title": "Write unit tests",
        "priority": "high",
        "priority_score": 90,
        "status": "backlog",
        "estimated_duration": 120,
        "effort_score": 70,
        "value_score": 75
    }

@pytest.fixture
def sample_user_data():
    return {
        "email": "test@example.com",
        "name": "Test User"
    }
```

**Database Fixtures:**

```python
@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with test_session_maker() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
```

**Authenticated Client Fixture:**

```python
@pytest_asyncio.fixture(scope="function")
async def authed_client(client: AsyncClient, sample_user_data) -> AsyncClient:
    """Create an authenticated client."""
    user_data = {
        "email": sample_user_data["email"],
        "name": sample_user_data["name"],
        "password": "testpassword"
    }
    await client.post("/users", json=user_data)

    response = await client.post(
        "/auth/login",
        auth=(sample_user_data["email"], "testpassword")
    )
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
```

## Coverage

**Requirements:** Not enforced; no coverage tool configured

**View Coverage:**
```bash
# Frontend - Can add if needed:
npm run test -- --coverage

# Backend - Can add if needed:
pytest --cov=app tests/
```

**Current State:** No coverage reports in CI/CD pipeline

## Test Types

**Frontend - Unit Tests:**
- Scope: Individual components in isolation
- Approach: Render component, query DOM, assert on visible output
- Examples: `TaskCard.test.tsx`, `FocusToggle.test.tsx`
- Test user interactions with `userEvent.setup()`
- Assert on DOM state and CSS classes

**Frontend - Component Integration Tests:**
- Scope: Components with Zustand store state
- Approach: Access store state directly, verify updates
- Example from `FocusToggle.test.tsx`:
```typescript
it('should update global state when toggled', async () => {
  const user = userEvent.setup()
  render(<FocusToggle />)

  const initialState = useAppStore.getState().isFocusMode
  expect(initialState).toBe(false)

  await user.click(screen.getByRole('button'))

  const updatedState = useAppStore.getState().isFocusMode
  expect(updatedState).toBe(true)
})
```

**Frontend - E2E Tests:**
- Framework: Playwright 1.49.0
- Config: `frontend/playwright.config.ts`
- Location: `frontend/e2e/` directory
- Naming: `*.spec.ts` files
- Browsers: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- Approach: Full user journeys through the app
- Example from `homepage.spec.ts`:
```typescript
test('should display page title and task counts', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Liminal Focus/i })).toBeVisible()
  await expect(page.getByText(/items/i)).toBeVisible()
})
```

**Backend - Unit Tests:**
- Scope: CRUD operations and business logic
- Approach: Call API endpoints via async HTTP client, assert on response
- Examples: `test_tasks.py`, `test_users.py`

**Backend - Integration Tests:**
- Scope: Full request-response flow through FastAPI
- Approach: Use in-memory database, authenticated client, call endpoints
- Marked with `@pytest.mark.integration` if needed
- Test multiple endpoints together (e.g., create task with initiative)

## Common Patterns

**Frontend - Async Testing:**

```typescript
it('should toggle to focus mode when clicked', async () => {
  const user = userEvent.setup()
  render(<FocusToggle />)

  const button = screen.getByRole('button', { name: /Planning Mode/i })
  await user.click(button)  // Wait for user event

  expect(screen.getByRole('button', { name: /Focus Mode On/i })).toBeInTheDocument()
})
```

**Frontend - Conditional Rendering:**

```typescript
it('should not display estimated time when not provided', () => {
  const taskWithoutTime = { ...mockTask, estimatedTime: undefined }
  render(<TaskCard task={taskWithoutTime} />)
  expect(screen.queryByText(/e:/)).not.toBeInTheDocument()
})
```

**Frontend - CSS Class Assertions:**

```typescript
it('should apply high priority styling', () => {
  const { container } = render(<TaskCard task={mockTask} />)
  const card = container.querySelector('.border-l-red-400')
  expect(card).toBeInTheDocument()
})
```

**Backend - Async Testing:**

```python
@pytest.mark.asyncio
async def test_create_task(authed_client: AsyncClient, sample_task_data):
    response = await authed_client.post("/tasks", json=sample_task_data)
    assert response.status_code == 201
```

**Backend - Error Testing:**

```python
@pytest.mark.asyncio
async def test_update_task_not_found(authed_client: AsyncClient):
    response = await authed_client.patch("/tasks/non-existent-id", json={"status": "done"})
    assert response.status_code == 404
```

**Backend - Fixtures Across Tests:**

```python
@pytest.mark.asyncio
async def test_create_task_with_initiative(authed_client: AsyncClient):
    # Create initiative
    initiative_response = await authed_client.post("/initiatives", json={"title": "Test Initiative"})
    initiative_id = initiative_response.json()["id"]

    # Create task with that initiative
    task_data = {"title": "Task with Initiative", "initiative_id": initiative_id}
    response = await authed_client.post("/tasks", json=task_data)

    assert response.status_code == 201
    assert response.json()["initiative_id"] == initiative_id
```

## Setup Configuration

**Frontend Setup:**

- `frontend/vitest.setup.ts`: Imports testing-library/jest-dom for DOM matchers
- Path alias resolution in vitest.config.ts matches tsconfig.json
- jsdom environment simulates browser API

**Backend Setup:**

- Test database: In-memory SQLite (`sqlite+aiosqlite:///:memory:`)
- `pytest.ini` configures test discovery and asyncio_mode = auto
- `conftest.py` provides all shared fixtures (db_session, client, authed_client)
- Test isolation: Fresh database created and dropped for each test

## Coverage Gaps

**Frontend:**
- No E2E tests for focus mode timer (Pomodoro component)
- No tests for ChatInterface component
- No tests for TaskForm component
- No tests for board view (`app/board/page.tsx`)
- Limited tests for QuickCapture parsing edge cases

**Backend:**
- No tests for LLM chat integration
- No tests for Google OAuth flow
- Missing test coverage for agent services
- No tests for settings CRUD
- No tests for focus session tracking

---

*Testing analysis: 2026-01-31*
