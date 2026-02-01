# External Integrations

**Analysis Date:** 2026-01-31

## APIs & External Services

**LLM (Language Model):**
- **Local (Ollama)** - Default local inference engine
  - SDK/Client: None (raw HTTP POST)
  - Endpoint: Configured via `LLM_BASE_URL` (default: `http://localhost:11434/v1/chat/completions`)
  - Auth: Optional Bearer token via `LLM_API_KEY`
  - Usage: `backend/app/agents/core.py:AgentService._call_llm()`
  - Models: `ai/llama3.2:3B-Q4_0` (default, configurable)

- **Azure OpenAI** - Optional cloud LLM provider
  - SDK/Client: None (raw HTTP POST via httpx)
  - Endpoint: `https://<resource>.openai.azure.com/openai/deployments/<deployment>/chat/completions`
  - Auth: `api-key` header with `LLM_API_KEY`
  - Configuration: `LLM_PROVIDER=azure`, `AZURE_OPENAI_API_VERSION=2023-09-01-preview`
  - Usage: Conditional in `backend/app/agents/core.py` (lines 26-32)

- **Groq API** - Optional LLM provider (not fully integrated)
  - SDK/Client: None (raw HTTP POST)
  - Endpoint: `{LLM_BASE_URL}/openai/v1/chat/completions`
  - Auth: `Authorization: Bearer {LLM_API_KEY}`
  - Configuration: `LLM_PROVIDER=groq`
  - Usage: Partial support in `backend/app/agents/core.py` (lines 33-35)

**Authentication:**
- **Google OAuth2 (optional)**
  - SDK/Client: `google-auth` Python library
  - Token verification: `google.oauth2.id_token.verify_oauth2_token()`
  - Endpoint: `/auth/google` (POST with `id_token` parameter)
  - Environment: `GOOGLE_CLIENT_ID` (optional)
  - Conditionally imported: `backend/app/main.py` (lines 34-39)
  - Fallback: Returns 500 if dependencies not installed

## Data Storage

**Databases:**
- **PostgreSQL 15** (primary)
  - Connection driver: `asyncpg` (async primary)
  - Alternative driver: `psycopg2-binary` (blocking)
  - ORM: SQLModel (SQLAlchemy async)
  - Connection: Environment variable `DATABASE_URL`
  - Docker service: `postgres:15-alpine` (`docker-compose.yml`)
  - Health check: `pg_isready -U user -d liminal`

**File Storage:**
- **Local filesystem only**
  - No cloud storage integration (S3, GCS, etc.)
  - Public assets: `frontend/public/` directory
  - Uploaded files: Not implemented

**Caching:**
- **None** - No Redis, Memcached, or similar
- In-memory caching: Python `functools.lru_cache` on `Settings` singleton
- Frontend state: Zustand in-memory store with localStorage persistence

## Authentication & Identity

**Auth Provider:**
- **Custom JWT (primary)**
  - Implementation: `backend/app/auth.py`
  - Token encoding: `python-jose` (PyJWT compatible)
  - Algorithm: HS256 (HMAC SHA-256)
  - Secret: Environment variable `SECRET_KEY`
  - Duration: Configurable `ACCESS_TOKEN_EXPIRES_MINUTES` (default: 60)

- **HTTP Basic Auth (fallback)**
  - Implementation: FastAPI `HTTPBasic` scheme
  - Endpoint: `POST /auth/login` (email + password)
  - Password hashing: `passlib[argon2]` (Argon2id)
  - Usage: Credentials verified against `User.hashed_password`

- **Google OIDC (optional)**
  - Endpoint: `POST /auth/google` (accepts `id_token`)
  - Token verification: Google libraries (conditional import)
  - User creation: Auto-registers new users via Google `sub` claim
  - Fallback: Returns HTTP 500 if google-auth not installed

**Frontend Auth Flow:**
- Token storage: `localStorage` (key: `liminal_token`)
- Token auto-renewal: On 401 response, recreate demo user and retry
- Demo user: `demo@liminal.app` / `demopassword123` (auto-created on first load)

## Monitoring & Observability

**Error Tracking:**
- None - No Sentry, Rollbar, or similar integration
- Debug logging: Print statements in `backend/app/agents/core.py` (DEBUG flags)

**Logs:**
- **Backend:** stdout via Uvicorn (development) or container logs (production)
- **Frontend:** browser console
- **Database:** Async engine `echo=True` in `backend/app/database.py` (logs all SQL to stdout)

## CI/CD & Deployment

**Hosting:**
- **Railway.app** (configured, hardcoded in codebase)
  - Frontend domain: `https://liminal-frontend-production.up.railway.app`
  - Backend: Port 8000 hardcoded in Dockerfile CMD
  - Environment: All config via Railway Service Variables

**CI Pipeline:**
- **None** - No GitHub Actions, GitLab CI, or similar
- Local test commands:
  - Frontend: `npm run test`, `npm run test:e2e`
  - Backend: `pytest` (via `backend/run_tests.sh`)

**Containerization:**
- **Docker Compose** (development & production)
  - Services: `db` (PostgreSQL), `backend` (FastAPI), `frontend` (Next.js), `llm` (Ollama)
  - Orchestration: `docker-compose.yml` at root

## Environment Configuration

**Required env vars:**
- Backend:
  - `DATABASE_URL` - PostgreSQL connection (required for startup)
  - `SECRET_KEY` - JWT signing (required for tokens)
  - `LLM_BASE_URL` - LLM endpoint (required for chat, defaults to local)
  - `LLM_MODEL` - Model name (required for LLM, defaults to Ollama model)

- Frontend:
  - `NEXT_PUBLIC_API_URL` - Backend URL (required for API calls, defaults to localhost:8000)

**Optional env vars:**
- Backend:
  - `GOOGLE_CLIENT_ID` - Google OIDC (only needed for Google login)
  - `LLM_API_KEY` - API key for external LLM providers
  - `LLM_PROVIDER` - "local" | "azure" | "groq" (defaults to "local")
  - `AZURE_OPENAI_API_VERSION` - Azure API version (defaults to "2023-09-01-preview")
  - `ALGORITHM` - JWT algorithm (defaults to "HS256")
  - `ACCESS_TOKEN_EXPIRES_MINUTES` - Token duration (defaults to 60)

**Secrets location:**
- **Development:** `docker-compose.yml` (plaintext, development only)
  - `POSTGRES_USER: user`, `POSTGRES_PASSWORD: password`
  - `SECRET_KEY: supersecret_vibe_key`

- **Production:** Railway.app Service Variables
  - Should override all defaults
  - No .env file committed (safe)

## Webhooks & Callbacks

**Incoming:**
- None - No webhook endpoints exposed

**Outgoing:**
- None - No external service callbacks triggered

## Third-Party Integrations Summary

| Service | Status | Purpose | Dependency |
|---------|--------|---------|-----------|
| Ollama (Local LLM) | Default | AI task management & Q&A | Optional (local dev default) |
| Azure OpenAI | Optional | Cloud LLM alternative | Conditional on config |
| Groq | Partial | LLM provider (not fully tested) | Conditional on config |
| Google OAuth2 | Optional | Alternative authentication | `google-auth` library |
| PostgreSQL | Required | Primary database | `asyncpg` + `psycopg2-binary` |
| Railway.app | Configured | Hosting platform | Implicit via Dockerfile config |

---

*Integration audit: 2026-01-31*
