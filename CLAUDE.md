# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Liminal - An ADHD-centric productivity application designed with neurodiverse minds in mind, emphasizing minimal cognitive load, immediate feedback, and forgiving workflows.

## Development Commands

### Starting the Application
```bash
# Start all services (frontend, backend, database)
docker-compose up --build

# Access points:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
# - API Documentation (Swagger): http://localhost:8000/docs
```

### Frontend Commands (in frontend/ directory or frontend container)
```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint

# Testing
npm test                 # Run component tests (Vitest)
npm run test:ui          # Component tests with UI
npm run test:e2e         # Run E2E tests (Playwright)
npm run test:e2e:ui      # E2E tests with UI
npm run test:e2e:headed  # E2E tests in browser
npm run test:all         # Run all tests

# Test runner script
cd frontend
./run-tests.sh

# In Docker
docker exec liminal_frontend npm test -- --run
docker exec liminal_frontend npm run test:e2e
```

### Backend Commands

#### Running Tests
```bash
# From backend directory - runs all API integration tests
cd backend
pytest

# Or use the test runner script
./run_tests.sh

# Run specific test file
pytest tests/test_tasks.py

# Run with verbose output
pytest -v

# Run tests matching a pattern
pytest -k "test_create"

# In Docker container
docker exec -it liminal_backend pytest
```

#### Other Backend Commands
```bash
# Backend runs with auto-reload via uvicorn --reload
# Install dependencies: pip install -r requirements.txt
```

## Architecture

### Stack
- **Frontend**: Next.js 13 (App Router), TypeScript, Tailwind CSS, Framer Motion animations, Zustand for state
- **Backend**: Python FastAPI with async SQLModel (SQLAlchemy + Pydantic), async/await throughout
- **Database**: PostgreSQL 15 with persistent volume (`postgres_data`)
- **Infrastructure**: Fully Dockerized with docker-compose orchestration

### Project Structure
```
/frontend/          - Next.js application
  /app/            - App Router pages (page.tsx, board/page.tsx)
  /components/     - React components (TaskCard, QuickCapture, FocusToggle)
  /lib/            - Utilities (store.ts for Zustand)
/backend/           - FastAPI application
  /app/            - Application code
    main.py        - FastAPI app, routes, CORS
    models.py      - SQLModel models and DTOs
    database.py    - Async DB engine and session management
```

### Data Model (backend/app/models.py)

**Core Entities:**
- **User**: Email-based users with relationships to all user-owned entities
- **Theme**: High-level strategic themes (e.g., "AI Enablement") with color coding
- **Initiative**: Key initiatives belonging to a Theme
- **Task**: Core work items with:
  - Status flow: backlog → todo → in_progress → blocked → done
  - Priority levels: high, medium, low
  - ADHD-specific fields: `estimated_duration`, `actual_duration` (in minutes)
  - Strategic alignment via `initiative_id`
  - Recursive parent/child structure for task chunking (`parent_id`)
- **FocusSession**: Pomodoro-style focus tracking
- **Settings**: Per-user preferences (theme, focus/break duration, sound)

**Key Relationships:**
- Tasks can belong to Initiatives, which belong to Themes
- Tasks support parent-child relationships for breaking down complex work
- All entities are user-scoped

### API Patterns (backend/app/main.py)

**Current Endpoints:**
- `POST /tasks` - Create task (requires `user_id` in request body)
- `GET /tasks?user_id={id}` - List user's tasks (ordered by `created_at` desc)
- `PATCH /tasks/{task_id}` - Update task (accepts arbitrary dict payload)
- `POST /themes`, `GET /themes?user_id={id}` - Theme management
- `POST /initiatives`, `GET /initiatives?user_id={id}` - Initiative management
- `POST /users` - Create user (simple email + name)

**Async Pattern:**
All database operations use async/await with `AsyncSession` dependency injection via `get_session()`.

**No Authentication Yet:**
User ID is currently passed as query param or in request body. OAuth2/JWT scaffolded but not implemented.

### Frontend State (frontend/lib/store.ts)

Uses Zustand for minimal client state. Currently only manages `isFocusMode` toggle. Tasks and other data will be fetched from API.

### Database Connection

Backend connects to PostgreSQL via async SQLAlchemy:
- Connection string: `postgresql+asyncpg://user:password@db:5432/planner`
- Auto-creates tables on startup via `SQLModel.metadata.create_all` (production should use Alembic migrations)
- Persistent storage in Docker volume `postgres_data`

## Design Philosophy

**Vibe Coding Principles** (from ADHD-Planner.system.md):
- Clean, expressive, pleasant-to-read code
- Minimal abstractions - avoid premature optimization
- Small, composable functions with clear naming
- Comments explain "why", not "what"
- ADHD-friendly: reduce cognitive load, provide immediate feedback, forgiving workflows

**Security Considerations:**
- OWASP Top 10 compliance expected
- Use parameterized queries (handled by SQLModel ORM)
- Validate all input (class-validator for NestJS mentioned in README but project uses FastAPI - apply equivalent validation)
- CORS currently open (`allow_origins=["*"]`) for local dev - restrict in production

## Testing

### Frontend Tests

Comprehensive frontend test suite using **Playwright** (E2E) and **Vitest + React Testing Library** (component tests).

#### E2E Tests (Playwright) - 38 tests
Full user flow testing across real browsers:
- `e2e/homepage.spec.ts` - Homepage, task display, navigation (8 tests)
- `e2e/focus-mode.spec.ts` - Focus mode toggle, task filtering, UI changes (7 tests)
- `e2e/quick-capture.spec.ts` - Quick capture input, form submission (8 tests)
- `e2e/board.spec.ts` - Kanban board, drag-and-drop, columns, navigation (15 tests)

**Browsers Tested:** Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari

#### Component Tests (Vitest + RTL) - 27 tests
Isolated component behavior testing:
- `__tests__/components/TaskCard.test.tsx` - Task rendering, priority colors (8 tests)
- `__tests__/components/QuickCapture.test.tsx` - Input, validation, submission (9 tests)
- `__tests__/components/FocusToggle.test.tsx` - Toggle state, styling, Zustand integration (10 tests)

**Key Features:**
- Multi-browser E2E testing (Chromium, Firefox, Safari, Mobile)
- Component tests with realistic user interactions
- Fast execution with Vitest (Vite-powered)
- Auto-wait functionality in Playwright (no manual waits)
- Screenshot/video capture on failure
- Parallel test execution
- Tests ADHD-specific features (focus mode, estimated times, visual priorities)

See `frontend/TESTING.md` for detailed documentation.

### API Integration Tests

Comprehensive API test suite using **pytest** and **httpx** (modern, async-compatible testing stack).

**Test Coverage:**
- `tests/test_users.py` - User creation and validation
- `tests/test_themes.py` - Theme CRUD operations, user isolation
- `tests/test_initiatives.py` - Initiative CRUD operations, theme relationships
- `tests/test_tasks.py` - Full CRUD on tasks, status flow, priority levels, relationships

**Key Features:**
- Uses in-memory SQLite for fast, isolated tests
- Async/await support via pytest-asyncio
- Fixtures for common test data (users, themes, initiatives, tasks)
- Tests user data isolation (users can't see each other's data)
- Tests all relationships (tasks ↔ initiatives ↔ themes)
- Tests ADHD-specific features (estimated_duration)

**Test Database:**
Tests use an in-memory SQLite database that's created fresh for each test function, ensuring complete isolation.

## Known Gaps & Next Steps

From README.md and code analysis:
1. Quick Capture form not yet connected to `POST /tasks` API
2. Authentication (OAuth2/JWT) scaffolded in models but not implemented
3. Pomodoro timer feature planned for Focus Mode
4. No migration system - using `SQLModel.metadata.create_all` (should add Alembic)
5. No tests written yet
6. PATCH /tasks accepts arbitrary dict - should use proper DTO/validation
