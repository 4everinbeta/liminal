# Codebase Structure

**Analysis Date:** 2026-01-31

## Directory Layout

```
liminal/
├── .planning/               # GSD planning artifacts (generated)
├── .git/                    # Git repository
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI app, route handlers
│   │   ├── models.py       # SQLModel ORM definitions
│   │   ├── crud.py         # Database operations (create, read, update, delete)
│   │   ├── database.py     # Async session, engine, init_db()
│   │   ├── auth.py         # JWT/Basic auth, password hashing
│   │   ├── config.py       # Settings singleton (env vars)
│   │   └── agents/
│   │       ├── core.py     # AgentService, intent classification, tool execution
│   │       └── knowledge.py # Knowledge base for Q&A agent
│   ├── tests/              # pytest test suite
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pytest.ini
├── frontend/                # Next.js 13 React frontend
│   ├── app/
│   │   ├── page.tsx        # Dashboard (home view)
│   │   ├── layout.tsx      # Root layout
│   │   ├── globals.css     # Tailwind styles
│   │   ├── icon.svg        # Favicon
│   │   └── board/
│   │       └── page.tsx    # Kanban board view
│   ├── components/         # Reusable React components
│   │   ├── ChatInterface.tsx    # Chat assistant UI
│   │   ├── TaskForm.tsx         # Quick add task form
│   │   ├── TaskCard.tsx         # Task item card
│   │   ├── FocusToggle.tsx      # Focus mode toggle button
│   │   ├── Pomodoro.tsx         # Timer component
│   │   └── QuickCapture.tsx     # Advanced task capture (legacy/experimental)
│   ├── lib/                # Utilities, API client, store
│   │   ├── api.ts         # HTTP client, fetch helpers, API types
│   │   └── store.ts       # Zustand store (focus mode, timer, chat)
│   ├── __tests__/         # Vitest unit tests
│   ├── e2e/               # Playwright E2E tests
│   ├── public/            # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── Dockerfile
├── scripts/                # Utility scripts
│   ├── ollama-init.sh      # LLM initialization
│   └── ollama-models.txt   # Model manifest
├── docker-compose.yml      # Service orchestration
└── README.md
```

## Directory Purposes

**Backend (Python/FastAPI):**

- `app/main.py`: Core FastAPI application with all HTTP route handlers (auth, tasks, themes, initiatives, LLM proxy)
- `app/models.py`: SQLModel table definitions (User, Task, Theme, Initiative, Settings, FocusSession) and DTOs (TaskCreate, ThemeCreate, etc.)
- `app/crud.py`: Async CRUD operations (create_task, get_tasks, update_task, delete_task, search_tasks, get_stale_tasks)
- `app/database.py`: AsyncSession factory, engine creation, init_db() schema bootstrap
- `app/auth.py`: JWT token creation/validation, Basic auth, password hashing (argon2), get_current_user() dependency
- `app/config.py`: Settings singleton with environment variables (LLM provider, API keys, database URL, secrets)
- `app/agents/core.py`: AgentService with supervisor pattern (intent classification) and specialized handlers (task management, Q&A, tracking)
- `app/agents/knowledge.py`: Knowledge base content for Q&A agent
- `tests/`: pytest unit/integration tests, conftest.py fixtures
- `Dockerfile`: Python 3.11, pip install, uvicorn server

**Frontend (Next.js/React):**

- `app/page.tsx`: Dashboard view with task list (sorted by priority/value/duration), focus mode toggle, chat interface, quick add form
- `app/board/page.tsx`: Kanban board with themes as columns, drag-drop task movement, validation gating for incomplete tasks
- `app/layout.tsx`: Root layout with metadata, main container wrapper
- `components/ChatInterface.tsx`: Chat UI with message history, command parsing (JSON extraction from `:::{...}:::` markers), task creation callback
- `components/TaskForm.tsx`: Modal form for manual task creation (title, duration, value score, priority)
- `components/TaskCard.tsx`: Task display card with click handler, priority indicator
- `components/FocusToggle.tsx`: Button to toggle focus mode via Zustand store
- `components/Pomodoro.tsx`: Timer component (25m default), status management
- `lib/api.ts`: HTTP client (fetchWithAuth), API types (Task, Theme, TaskCreate), demo user auth, Quick Capture parser, LLM proxy caller
- `lib/store.ts`: Zustand store (isFocusMode, activeTaskId, timerStatus, chatMessages) with session storage persistence
- `__tests__/`: Vitest test suite for components and utilities
- `e2e/`: Playwright end-to-end tests
- `Dockerfile`: Node 18, npm install, next dev server

**Docker & Orchestration:**

- `docker-compose.yml`: Services: PostgreSQL 15, FastAPI backend, Next.js frontend, Ollama LLM
- `scripts/ollama-init.sh`: Initialize Ollama container with models from ollama-models.txt

## Key File Locations

**Entry Points:**

- `frontend/app/page.tsx`: Main dashboard, task fetch logic, sorting, focus mode branching
- `frontend/app/board/page.tsx`: Board view with theme-based columns
- `backend/app/main.py`: FastAPI app and all route handlers; startup event calls init_db()

**Configuration:**

- `backend/app/config.py`: Settings singleton (LLM_BASE_URL, LLM_MODEL, LLM_PROVIDER, DATABASE_URL, etc.)
- `docker-compose.yml`: Service environment variables (DATABASE_URL, LLM_BASE_URL, NEXT_PUBLIC_API_URL)
- `frontend/lib/api.ts`: API_BASE_URL constant (defaults to http://localhost:8000)
- `backend/app/database.py`: DATABASE_URL env var, async engine creation

**Core Logic:**

- `backend/app/models.py`: Task, Theme, User, Initiative domain models
- `backend/app/crud.py`: Task CRUD operations, priority/effort normalization
- `backend/app/agents/core.py`: Intelligent chat agent with intent classification and tool execution
- `frontend/lib/api.ts`: parseQuickCapture() parser, chatWithLlm() proxy caller
- `frontend/lib/store.ts`: Zustand store for focus mode, timer, chat state

**Testing:**

- `backend/tests/`: pytest test files (test_tasks.py, test_users.py, test_themes.py, test_initiatives.py)
- `frontend/__tests__/`: Vitest unit tests (components, lib utilities)
- `frontend/e2e/`: Playwright end-to-end tests

## Naming Conventions

**Files:**

- React components: PascalCase (ChatInterface.tsx, TaskCard.tsx)
- Utilities/services: camelCase (api.ts, store.ts)
- Pages: lowercase (page.tsx)
- Tests: snake_case or descriptive name (test_tasks.py, ChatInterface.test.tsx)

**Directories:**

- Feature directories: lowercase plural (components, pages, agents, tests)
- Nested feature subdirs: lowercase (app/board for board feature)

**Variables & Functions:**

- React component props: camelCase (onTaskCreated, activeTaskId, isFocusMode)
- API functions: camelCase (getTasks, createTask, updateTask, chatWithLlm)
- Types: PascalCase (Task, Theme, TaskCreate, ChatMessage)
- Constants: UPPERCASE (API_BASE_URL, INITIAL_CHAT_MESSAGES, DEFAULT_DURATION)

## Where to Add New Code

**New Feature (e.g., Initiative Management):**

Backend:
- Add model: `backend/app/models.py` → InitiativeCreate DTO (already exists)
- Add routes: `backend/app/main.py` → POST/GET /initiatives endpoints
- Add CRUD: `backend/app/crud.py` → create_initiative, get_initiatives functions

Frontend:
- Add page: `frontend/app/initiatives/page.tsx` (if needs dedicated page)
- Add component: `frontend/components/InitiativeForm.tsx` (if form needed)
- Add API calls: `frontend/lib/api.ts` → createInitiative(), getInitiatives() functions
- Add types: `frontend/lib/api.ts` → Initiative interface

**New Component/Module:**

- Implementation: `frontend/components/{FeatureName}.tsx` for UI
- Tests: `frontend/__tests__/components/{FeatureName}.test.tsx`
- Import in page: `import {FeatureName} from '@/components/{FeatureName}'`

**Utilities/Helpers:**

- Shared utilities: `frontend/lib/{utility}.ts` (e.g., lib/formatting.ts, lib/validation.ts)
- Backend utilities: `backend/app/{module_name}.py` or `backend/app/utils/` subdirectory if creating new file

**Agent Handlers:**

- New intent type: Add classification rule in `_classify_intent()` method
- New handler: Add `async def _handle_{intent_name}()` method in AgentService
- Tool definitions: Add to system prompt string in handler method

## Special Directories

**`frontend/public/`:**
- Purpose: Static assets (images, icons, fonts)
- Generated: No
- Committed: Yes

**`backend/tests/`:**
- Purpose: Pytest test suite
- Generated: No
- Committed: Yes
- Key file: `conftest.py` for fixtures and setup

**`frontend/__tests__/`:**
- Purpose: Vitest unit tests
- Generated: No
- Committed: Yes

**`frontend/e2e/`:**
- Purpose: Playwright end-to-end tests
- Generated: No
- Committed: Yes

**`frontend/.next/`:**
- Purpose: Next.js build output and cache (gitignored)
- Generated: Yes
- Committed: No

**`frontend/node_modules/` and `backend/venv/`:**
- Purpose: Dependencies
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-01-31*
