# Liminal: Executive Function & Strategy

## 🧠 Philosophy
Designed for neurodiverse minds. Principles:
- **Reduce Cognitive Load:** Minimalism first.
- **Immediate Feedback:** Visual cues for progress.
- **Forgiving Workflow:** Easy capture, flexible scheduling.

## 🏗 Architecture
Dockerized services managed via `docker-compose`.

- **Frontend:** Next.js 13 (App Router), Tailwind CSS, Framer Motion, Zustand.
- **Backend:** Python (FastAPI), SQLModel (SQLAlchemy + Pydantic).
- **Database:** PostgreSQL 15.

## 🚀 Getting Started

1. **Start Services:**
   ```bash
   docker-compose up --build
   ```

2. **Access:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)

## 🤖 Chat Intake (LLM)
- The Quick Capture box is a chat assistant. Use the backend proxy to avoid exposing keys:
  - Local (DMR/Ollama): `LLM_BASE_URL=http://host.docker.internal:11434/v1/chat/completions` when backend runs in Docker (use `http://localhost:11434/...` if backend runs on the host), `LLM_MODEL=ai/llama3.2:3B-Q4_0` (or whatever your runtime exposes), `LLM_PROVIDER=local`
  - Azure AI Foundry: `LLM_PROVIDER=azure`, `LLM_BASE_URL=https://<resource>.openai.azure.com/openai/deployments/<deployment>/chat/completions`, `LLM_API_KEY=<key>`, `AZURE_OPENAI_API_VERSION=2023-09-01-preview`

## 📂 Structure
- `/frontend` - Next.js App
- `/backend` - Python FastAPI App
- `docker-compose.yml` - Orchestration

## 🛡 Security & Standards
- **Validation:** `class-validator` in NestJS.
- **ORM:** Prisma prevents SQL injection.
- **State:** Zustand for clean, client-side state management.
- **Style:** "Vibe Coding" - readable, minimal, functional.

## 🔐 Authentication (OIDC)
This app supports a **real OIDC provider**. The backend validates Bearer JWTs via the provider’s JWKS, and the frontend performs the OIDC Authorization Code (PKCE) flow.

### Local Keycloak (recommended dev default)
`docker-compose.yml` includes a Keycloak service and imports a realm from `keycloak/liminal-realm.json`.

- Keycloak admin console: http://localhost:8080 (admin/admin by default)
- Realm: `liminal`
- Frontend client: `liminal-frontend` (public)
- Demo user: `demo` / `demo-password`

Frontend env (local):
- `NEXT_PUBLIC_OIDC_AUTHORITY=http://localhost:8080/realms/liminal`
- `NEXT_PUBLIC_OIDC_CLIENT_ID=liminal-frontend`
- `NEXT_PUBLIC_OIDC_REDIRECT_URI=http://localhost:3000/auth/callback`

Backend env (local):
- `OIDC_ISSUER=http://keycloak:8080/realms/liminal`
- (optional) `OIDC_AUDIENCE=liminal-frontend`

### Production / Railway
Use any OIDC provider (hosted: Zitadel/Auth0, or self-host: Keycloak/Authentik).

Important (Railway + Dockerfile): this repo serves OIDC settings from `/api/config` at **runtime**, so you can set `NEXT_PUBLIC_OIDC_*` as normal Railway **Variables** on the frontend service (no special build-args UI required).

Backend env:
- `OIDC_ISSUER=https://<your-idp>/realms/<realm>`
- `OIDC_AUDIENCE=<client-id>` (optional if your provider doesn’t set aud the way you expect)
- `OIDC_JWKS_URL=<optional>` (otherwise discovered from `/.well-known/openid-configuration`)

Frontend env:
- `NEXT_PUBLIC_OIDC_AUTHORITY=https://<your-idp>/realms/<realm>`
- `NEXT_PUBLIC_OIDC_CLIENT_ID=<client-id>`
- `NEXT_PUBLIC_OIDC_REDIRECT_URI=https://<your-frontend-domain>/auth/callback`

Dev/test-only local auth:
- `ENABLE_LOCAL_AUTH=1` to re-enable `/users` + `/auth/login`. 

## 📝 Next Steps
1. Add a user-facing Settings page wired to `GET /me` and `PATCH /me/settings`.
2. Configure an IdP (Keycloak/Authentik/Zitadel) and set the env vars above.
