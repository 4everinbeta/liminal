# Technology Stack

**Analysis Date:** 2026-01-31

## Languages

**Primary:**
- **TypeScript** 5.1.6 - Frontend (Next.js, React, components)
- **Python** 3.11 - Backend (FastAPI, SQLModel, async services)
- **JavaScript** (React JSX/TSX) - Frontend components and utilities

**Secondary:**
- **SQL** - Database queries via SQLAlchemy ORM
- **Bash** - Build and utility scripts (`/scripts`, `run_tests.sh`, `run-tests.sh`)

## Runtime

**Environment:**
- **Node.js** - Frontend (implicit from Next.js, no explicit version pinned)
- **Python 3.11** - Backend (explicit in `/home/rbrown/workspace/liminal/backend/Dockerfile`)

**Package Managers:**
- **npm** 8+ (inferred from package-lock.json presence)
  - Lockfile: `frontend/package-lock.json` (present)
- **pip** + requirements.txt
  - Lockfile: `backend/requirements.txt` (pinned versions)

## Frameworks

**Frontend:**
- **Next.js** 13.4.12 - React framework with App Router (`frontend/app/`)
- **React** 18.2.0 - UI library
- **TailwindCSS** 3.3.3 - Utility-first CSS framework (`frontend/tailwind.config.js`)
- **Framer Motion** 10.12.16 - Animation library (used in components)
- **Zustand** 4.3.9 - Client-side state management (`frontend/lib/store.ts`)
- **@hello-pangea/dnd** 16.3.0 - Drag-and-drop library for board (`frontend/app/board/page.tsx`)

**Backend:**
- **FastAPI** >=0.100.0 - Async API framework (`backend/app/main.py`)
- **SQLModel** >=0.0.14 - SQLAlchemy + Pydantic ORM (`backend/app/models.py`, `backend/app/database.py`)
- **Uvicorn** >=0.23.0 - ASGI server (started in Dockerfile and docker-compose)

**Testing:**
- **Vitest** 1.0.0 - Frontend unit test runner (`frontend/vitest.config.ts`)
- **Playwright** 1.49.0 - E2E testing (`frontend/playwright.config.ts`, `frontend/e2e/`)
- **pytest** >=7.4.0 - Python backend unit tests (`backend/pytest.ini`, `backend/tests/`)
- **pytest-asyncio** >=0.21.0 - Async test support for FastAPI

**Build/Dev:**
- **Autoprefixer** 10.4.14 - CSS vendor prefixes
- **PostCSS** 8.4.27 - CSS transformations (configured in `frontend/postcss.config.js`)
- **TypeScript** 5.1.6 - Type checking (both frontend and backend type definitions)
- **ESLint** 8.45.0 - Frontend linting (`frontend/.eslintrc.json`)
- **Tailwind Merge** 1.14.0 - Utility class deduplication

## Key Dependencies

**Critical (Backend):**
- **sqlmodel** - Database ORM combining SQLAlchemy + Pydantic for type-safe queries
- **fastapi** - Core API framework with automatic OpenAPI docs
- **asyncpg** >=0.28.0 - Async PostgreSQL driver (enables concurrent database access)
- **passlib[argon2]** >=1.7.4 - Password hashing (REQUIRED for authentication)
- **python-jose[cryptography]** >=3.3.0 - JWT token creation/validation (`backend/app/auth.py`)

**Critical (Frontend):**
- **react**, **react-dom** - Core UI rendering
- **next** - Server-side rendering, routing, image optimization
- **zustand** - Global state (tasks, chat, UI mode)
- **framer-motion** - Task card animations, modal transitions

**Infrastructure (Backend):**
- **uvicorn[standard]** - ASGI server with uvloop support
- **psycopg2-binary** >=2.9.6 - PostgreSQL adapter (alternative to asyncpg)
- **python-multipart** >=0.0.6 - Form data parsing (FastAPI dependency)
- **email-validator** >=2.0.0 - Email validation in UserCreate
- **pydantic-settings** >=2.0.0 - Environment variable management (`backend/app/config.py`)

**Optional (Backend):**
- **google-auth** >=2.23.0 - Google OAuth2 token verification (conditionally imported, optional for Google login)

**UI/UX (Frontend):**
- **lucide-react** 0.263.1 - Icon library (used throughout components)
- **date-fns** 2.30.0 - Date manipulation utilities
- **clsx** 2.0.0 - Conditional className building
- **@testing-library/react** 14.1.0 - Component testing utilities

## Configuration

**Environment (Backend):**
- Variables loaded via `pydantic-settings` in `backend/app/config.py`:
  - `SECRET_KEY` - JWT signing secret (default: "change-me-in-prod")
  - `ALGORITHM` - JWT algorithm (default: "HS256")
  - `ACCESS_TOKEN_EXPIRES_MINUTES` - Token lifetime (default: 60)
  - `GOOGLE_CLIENT_ID` - Google OIDC client ID (optional)
  - `LLM_BASE_URL` - LLM endpoint (default: http://localhost:11434/v1/chat/completions)
  - `LLM_MODEL` - Model identifier (default: ai/llama3.2:3B-Q4_0)
  - `LLM_API_KEY` - API key for external LLM providers (optional)
  - `LLM_PROVIDER` - "local" | "azure" | "groq" (default: "local")
  - `AZURE_OPENAI_API_VERSION` - Azure API version (default: 2023-09-01-preview)
  - `DATABASE_URL` - PostgreSQL connection string (default: postgresql+asyncpg://user:password@db:5432/liminal)

**Environment (Frontend):**
- `NEXT_PUBLIC_API_URL` - Backend API base URL (default: http://localhost:8000)

**Build (Backend):**
- `/backend/Dockerfile` - Python 3.11-slim, uvicorn entrypoint
- `/docker-compose.yml` - Services: db (Postgres), backend, frontend, llm (Ollama)

**Build (Frontend):**
- `/frontend/tsconfig.json` - TypeScript config with path alias `@/*`
- `/frontend/next.config.js` - Build output to `.next-clean`, ignores linting/TS errors during build
- `/frontend/tailwind.config.js` - Tailwind setup
- `/frontend/postcss.config.js` - PostCSS config for Tailwind

## Database

**Vendor:** PostgreSQL 15-alpine (via `docker-compose.yml`)

**Connection:**
- Async driver: `asyncpg` (primary in production)
- Sync alternative: `psycopg2-binary`
- ORM: SQLModel (SQLAlchemy async)
- Connection string: `postgresql+asyncpg://user:password@db:5432/liminal`

**Initialization:**
- Auto-migration via `SQLModel.metadata.create_all()` in `backend/app/database.py:init_db()`
- Manual schema updates: `ALTER TABLE task ADD COLUMN IF NOT EXISTS ...` (score columns)

## Platform Requirements

**Development:**
- Docker & Docker Compose (services orchestration)
- Node.js 16+ (frontend development)
- Python 3.11+ (backend development)
- PostgreSQL client tools optional (psql for direct DB queries)

**Production:**
- **Docker containers** (recommended, configured in docker-compose.yml)
- **Deployment target:** Railway.app (hardcoded in `backend/Dockerfile` CMD and CORS origins)
  - Frontend: `https://liminal-frontend-production.up.railway.app`
  - Backend: Port 8000 hardcoded for Railway
- **Fallback:** Any container orchestration platform (K8s, cloud run, etc.) with env var overrides

---

*Stack analysis: 2026-01-31*
