# Coding Conventions

**Analysis Date:** 2026-01-31

## Naming Patterns

**Files (TypeScript/React):**
- Components: PascalCase with .tsx extension (e.g., `TaskCard.tsx`, `FocusToggle.tsx`)
- Utilities/hooks: camelCase with .ts extension (e.g., `api.ts`, `store.ts`)
- Pages: kebab-case with .tsx extension (e.g., `page.tsx` in Next.js app directories)

**Files (Python):**
- Modules: snake_case (e.g., `models.py`, `crud.py`, `auth.py`)
- Classes: PascalCase
- Functions: snake_case

**Functions:**
- TypeScript: camelCase (e.g., `createTask`, `handleCompleteTask`, `parseQuickCapture`)
- React components: PascalCase (e.g., `FocusToggle`, `TaskCard`)
- Python: snake_case (e.g., `create_task`, `get_current_user`, `score_to_priority_label`)

**Variables:**
- TypeScript: camelCase for all variables and constants (e.g., `isFocusMode`, `activeTaskId`, `priorityMap`)
- Python: snake_case for variables, UPPER_SNAKE_CASE for module-level constants (e.g., `DEFAULT_DURATION`, `TEST_DATABASE_URL`)

**Types/Interfaces:**
- TypeScript: PascalCase (e.g., `Task`, `TaskCreate`, `ChatMessage`, `AppState`)
- Python: PascalCase for classes/models (e.g., `Task`, `User`, `Priority`)

**Enums:**
- Python: PascalCase class with lowercase member names (e.g., `Priority.high`, `TaskStatus.backlog`)
- TypeScript: Literal union types preferred over enum

## Code Style

**Formatting:**
- Prettier not configured; Next.js default formatting rules apply
- File line length: Generally adheres to ~100-120 character soft limit
- Indentation: 2 spaces (TypeScript/React), 4 spaces (Python)

**Linting:**
- TypeScript/React: ESLint with `next/core-web-vitals` and `next` configs
- Config: `frontend/.eslintrc.json`
- Python: pytest with auto-discovery enabled

**Semi-colons:**
- TypeScript: Omitted in most code (likely Prettier/Next.js default)

## Import Organization

**Order (TypeScript):**
1. External libraries (`react`, `framer-motion`, `lucide-react`)
2. Next.js internal (`next/image`, etc.)
3. Local imports using `@/` alias
4. Type imports using `import type` when needed

**Example from `QuickCapture.tsx`:**
```typescript
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Plus, Check, Loader2, Send, Sparkles, Rocket, Tags, ListTodo, Wand2, Pencil, Trash2 } from 'lucide-react'
import { createTask, updateTask, parseQuickCapture, getThemes, createTheme, chatWithLlm, type ChatMessage as ApiChatMessage, TaskCreate, Theme } from '@/lib/api'
import { useAppStore, INITIAL_CHAT_MESSAGES, type ChatMessage as UiChatMessage } from '@/lib/store'
```

**Path Aliases:**
- `@/*` maps to frontend root directory (per `tsconfig.json`)
- Used for all local imports: `@/lib/`, `@/components/`, etc.

**Order (Python):**
1. Standard library (`datetime`, `typing`, `enum`)
2. Third-party (`fastapi`, `sqlmodel`, `jose`)
3. Local imports (relative or absolute)

## Error Handling

**TypeScript/React:**
- Try-catch blocks used for async operations (e.g., `fetchTasks()`, `confirmTask()`)
- Error logged to console: `console.error('error message', err)`
- User feedback via status messages (e.g., `setStatusMessage('Task creation failed')`)
- Optimistic updates with fallback: Update state immediately, then refetch on error
- Example from `app/page.tsx`:
```typescript
try {
  await updateTask(taskId, { status: 'done' })
  const remaining = tasks.filter(t => t.id !== taskId)
  setTasks(remaining)
} catch (err) {
  console.error('Complete failed', err)
  fetchTasks() // Revert on error
}
```

**Python/FastAPI:**
- HTTPException raised with appropriate status codes (e.g., `HTTP_401_UNAUTHORIZED`, `HTTP_404_NOT_FOUND`)
- Status codes used: 201 (Created), 200 (OK), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found)
- Credentials exception: `HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")`
- Database errors caught and logged; not always exposed to client
- Example from `auth.py`:
```python
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
)
```

## Logging

**Framework:** `console` (TypeScript), Python `print()` statements (backend)

**Patterns:**
- TypeScript: `console.error()` for errors, `console.log()` for debug info
- Debug flags: ENV var checks (e.g., `if (typeof window === 'undefined')` for SSR safety)
- Backend: Minimal logging, mostly for startup/debug (e.g., `print(f"DEBUG: Allowed Origins: {origins}")`)
- No structured logging library detected

## Comments

**When to Comment:**
- Complex business logic (e.g., sorting criteria in `app/page.tsx`)
- Non-obvious regex patterns (e.g., time duration parsing in `api.ts`)
- Clarifying enum purpose (e.g., `TaskStatus.backlog  # "The Threshold"`)
- High-level flow comments in larger functions

**JSDoc/TSDoc:**
- Minimal use; found in docstrings for Python functions
- Backend API: Comments above async functions describing purpose (e.g., `async def create_task(...)`)
- Frontend: Limited docstring use; most functions are self-explanatory

**Example from `api.ts`:**
```typescript
/**
 * Ensure demo user exists and is logged in
 */
async function ensureDemoUser(): Promise<string> { ... }
```

## Function Design

**Size:** Keep functions focused; largest functions are UI components (300-700 lines) with distinct sections

**Parameters:**
- TypeScript: Use object parameters for functions with >2 params
- Python: Dependency injection via `Depends()` in FastAPI routes; explicit parameters in CRUD
- Optional parameters: Use `?:` in TypeScript interfaces, `Optional[]` in Python

**Return Values:**
- TypeScript: Always typed; return type annotations present (e.g., `Promise<Task>`, `void`)
- Python: Type hints present (e.g., `async def get_task(...) -> Optional[Task]`)
- Errors: Throw/raise exceptions rather than return null for error states

**Example from `api.ts`:**
```typescript
export async function createTask(data: TaskCreate): Promise<Task> {
  const response = await fetchWithAuth(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create task');
  return response.json();
}
```

## Module Design

**Exports:**
- TypeScript: Named exports for utilities (e.g., `export async function getTasks()`), default export for components
- Python: Functions exported implicitly; no `__all__` pattern detected

**Barrel Files:**
- Used in `app/agents/__init__.py` for Python
- Not heavily used in frontend; imports are direct

**Example from `api.ts` exports:**
```typescript
export interface Theme { ... }
export interface Task { ... }
export async function createTask(data: TaskCreate): Promise<Task> { ... }
export function parseQuickCapture(input: string): TaskCreate { ... }
```

**Dependency Injection:**
- TypeScript: React hooks (`useAppStore`, `useEffect`) for state/side effects
- Python: FastAPI `Depends()` pattern (e.g., `session: AsyncSession = Depends(get_session)`)

## State Management

**Frontend:**
- Zustand store (`lib/store.ts`) for global app state
- Local component state via `useState()` for form inputs
- Persist middleware used: `persist()` with `sessionStorage`
- Server state: Fetched and cached in component state

**Backend:**
- SQLAlchemy async sessions for database state
- No global in-memory cache detected; refetch on demand
- Database sessions scoped to request lifetime via FastAPI dependency

## Type Safety

**TypeScript:**
- Strict mode enabled in `tsconfig.json`
- Interfaces for API contracts (e.g., `Task`, `TaskCreate`, `Theme`)
- Union types for enums: `'high' | 'medium' | 'low'`
- Optional fields marked with `?:`

**Python:**
- Type hints present in function signatures and field annotations
- SQLModel for ORM with integrated Pydantic validation
- Enums for constrained values (Priority, TaskStatus)

---

*Convention analysis: 2026-01-31*
