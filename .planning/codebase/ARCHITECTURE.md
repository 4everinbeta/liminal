# Architecture

**Analysis Date:** 2026-01-31

## Pattern Overview

**Overall:** Distributed layered architecture with async backend and client-side state management

**Key Characteristics:**
- Frontend decoupled from backend via REST API
- Backend agnostic routing through service layer abstraction (AgentService)
- Task-centric domain model with multi-dimensional scoring (priority, value, effort)
- LLM-driven intent classification for intelligent task management
- Theme-based strategic alignment structure

## Layers

**Presentation Layer (Frontend):**
- Purpose: Render task board, focus mode, chat interface; manage local UI state
- Location: `/frontend/app`, `/frontend/components`, `/frontend/lib`
- Contains: Next.js 13 App Router pages, React components, API client
- Depends on: Zustand store, Framer Motion, Lucide icons, HTTP API
- Used by: End users in browser

**API Layer (Backend):**
- Purpose: HTTP REST endpoints for CRUD operations and LLM proxy
- Location: `/backend/app/main.py`
- Contains: FastAPI route handlers, CORS middleware, token validation
- Depends on: CRUD layer, Auth service, Agent service
- Used by: Frontend, external integrations

**Business Logic & Agent Layer:**
- Purpose: Intent classification, specialized task/QA/tracking handlers, LLM orchestration
- Location: `/backend/app/agents/core.py`, `/backend/app/agents/knowledge.py`
- Contains: AgentService with supervisor pattern, tool execution (create/delete/search tasks)
- Depends on: CRUD layer, LLM provider (local/Azure/Groq)
- Used by: Chat endpoint (`/llm/chat`)

**Persistence Layer:**
- Purpose: SQL data access, schema management, query building
- Location: `/backend/app/crud.py`, `/backend/app/database.py`, `/backend/app/models.py`
- Contains: CRUD functions, SQLModel ORM definitions, async session management
- Depends on: PostgreSQL, SQLAlchemy async driver
- Used by: API routes, Agent service

**Authentication & Config:**
- Purpose: Token generation/validation, environment configuration
- Location: `/backend/app/auth.py`, `/backend/app/config.py`
- Contains: JWT token handling, basic auth, password hashing, settings singleton
- Depends on: jose (JWT), passlib, environment variables
- Used by: API middleware, route dependencies

## Data Flow

**Task Creation (Chat):**

1. User types in ChatInterface (`/frontend/components/ChatInterface.tsx`)
2. Message sent to `/llm/chat` endpoint with conversation context
3. AgentService._classify_intent() routes to specialized handler
4. _handle_task_management() calls LLM with task schema prompt
5. LLM returns JSON command wrapped in `:::{...}:::` markers
6. Frontend parses command, extracts JSON, calls createTask() via API
7. Backend CRUD creates Task, normalizes priority/effort scores
8. Task persisted to PostgreSQL, returned to frontend
9. Frontend appends "(Task created ✓)" to assistant message, calls onTaskCreated() callback
10. Parent page refetches getTasks() and re-renders board

**Dashboard Load & Task Display:**

1. Home page (`/frontend/app/page.tsx`) mounts, calls fetchTasks()
2. Frontend API client ensures demo user auth (Basic auth, then Bearer token)
3. GET `/tasks` returns all active tasks for user
4. Tasks sorted by priority (high>medium>low), then value_score (desc), then duration (asc)
5. Tasks rendered as TaskCard components with optimistic updates on completion/delete

**Board View (Theme-based Drag-Drop):**

1. Board page loads themes and tasks
2. Columns created: "The Threshold" (backlog) + one column per Theme
3. User drags task from backlog to theme column
4. onDragEnd() validates task has value_score > 0 and effort_score > 0 (gating check)
5. If invalid, opens modal for user to complete task data
6. If valid, optimistically updates local state, sends PATCH request
7. Task status changes to 'in_progress', theme_id assigned

**State Management:**

- Zustand store (`/frontend/lib/store.ts`) manages: focus mode toggle, active task, timer state, chat messages
- Session storage persists only chat messages (ephemeral UI state per page reload)
- API client maintains token in localStorage
- Component-level useState for form data, loading states

## Key Abstractions

**Task:**
- Purpose: Core domain entity representing work items
- Examples: `User.tasks`, `Task.theme`, `Task.initiative`
- Pattern: SQLModel + Pydantic validation; dual priority representation (enum + numeric score 1-100)
- Properties: title, description, status (backlog/todo/in_progress/blocked/done), priority, priority_score, value_score (1-100), effort_score (1-100), theme_id, initiative_id

**Theme:**
- Purpose: Strategic container for grouping tasks (e.g., "AI Enablement", "Team Building")
- Examples: Task.theme_id links to Theme.id
- Pattern: One-to-many with Task, user-scoped
- Used to create board columns and organize work hierarchically

**AgentService (Supervisor Agent Pattern):**
- Purpose: Intelligent request router + tool executor
- Pattern: Intent classification → specialized handler → tool execution → response generation
- Handlers: _handle_task_management (CRUD), _handle_qa (knowledge base), _handle_tracking (status report)
- Tool Actions: create_task, delete_task, search_tasks (via JSON commands in LLM responses)

**Quick Capture Parser:**
- Purpose: Transform natural language into structured task data (client-side)
- Pattern: Regex extraction of priority (!high/!medium/!low, p:50), duration (30m/1h, e:30), value (v:80)
- Location: `lib/api.ts` → parseQuickCapture()
- Returns: TaskCreate object ready for backend

## Entry Points

**Frontend:**

- `app/layout.tsx`: Root layout, sets metadata, wraps children in main container
- `app/page.tsx`: Dashboard view - task list, chat, quick add; fetch/sort logic
- `app/board/page.tsx`: Kanban board - themes as columns, drag-drop task movement

**Backend:**

- `main.py`: FastAPI app definition, all route handlers, middleware setup
- Startup: init_db() creates tables, alters schema with new columns
- Routes:
  - POST `/auth/login`: Basic auth → JWT token
  - POST `/users`: Create demo user
  - POST/GET `/tasks`: CRUD tasks
  - PATCH `/tasks/{task_id}`: Update task (status, priority, theme_id)
  - POST `/llm/chat`: Intelligent agent chat endpoint

## Error Handling

**Strategy:** Error propagation with try-catch at boundaries; API errors logged to console; user-facing error messages in toast/modal

**Patterns:**

- Frontend API client: `if (!response.ok) throw new Error(...)` → caught by component, logged
- Backend: HTTPException with status codes → CORS-safe error responses
- LLM agent: Exception during tool execution caught, returns "I encountered an error executing that command"
- Database: AsyncSession errors propagate through CRUD → API layer → 500 response

## Cross-Cutting Concerns

**Logging:**
- Frontend: console.error(), console.log() for API issues, chat errors
- Backend: print() statements for DEBUG info (LLM provider, request URL, supervisor intent)
- No structured logging framework (suitable for development)

**Validation:**
- Frontend: HTML5 form validation + manual checks (task title required, value_score > 0 for drag-drop)
- Backend: SQLModel/Pydantic auto-validates TaskCreate schema; allowed_fields whitelist in CRUD update
- LLM agent: Regex extraction of JSON commands, fallback retry if hallucination detected

**Authentication:**
- Frontend: Token stored in localStorage, auto-refreshed via ensureDemoUser() on 401
- Backend: JWT (Bearer token) + Basic auth for login
- Protected routes: Depend on get_current_user() which validates JWT, retrieves user from DB
- Demo user auto-creation: email=demo@liminal.app, password=demopassword123 (dev convenience)

**CORS:**
- Allowed origins: localhost:3000, 127.0.0.1:3000, liminal-frontend-production.up.railway.app
- Credentials enabled for cross-origin requests

---

*Architecture analysis: 2026-01-31*
