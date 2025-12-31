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
`docker-compose.yml` builds the Keycloak image from `keycloak/Dockerfile`, imports the `keycloak/liminal-realm.json` realm, **and mounts a named volume (`keycloak_data`) so users/clients persist between restarts**. Remove that volume (`docker volume rm adhd-planner_keycloak_data`) if you ever need a clean slate.

- Keycloak admin console: http://localhost:8080 (admin/admin by default)
- Realm: `liminal`
- Frontend client: `liminal-frontend` (public)
- Demo user: `demo` / `demo-password`
- Self-registration: enabled (users can create accounts from the Keycloak login screen)
- Custom login theme: the `liminal` theme in `keycloak/themes` matches the app’s gradients/buttons and is applied automatically to the realm.

Note: Keycloak does **not** allow wildcard subdomains in redirect URIs (e.g. `https://*.up.railway.app/*`). You must list your exact frontend domain(s) under the client’s redirect URIs.

Frontend env (local):
- `NEXT_PUBLIC_OIDC_AUTHORITY=http://localhost:8080/realms/liminal`
- `NEXT_PUBLIC_OIDC_CLIENT_ID=liminal-frontend`
- `NEXT_PUBLIC_OIDC_REDIRECT_URI=http://localhost:3000/auth/callback`
- `NEXT_PUBLIC_OIDC_PROVIDERS=default=Continue with Liminal##google=Continue with Google` (optional; see “Social logins” below)

Backend env (local):
- `OIDC_ISSUER=http://keycloak:8080/realms/liminal`
- (optional) `OIDC_AUDIENCE=liminal-frontend`

### Production / Railway
Use any OIDC provider (hosted: Zitadel/Auth0, or self-host: Keycloak/Authentik). If you deploy Keycloak yourself (e.g., Railway), attach a persistent disk or point it at an external database so that users, themes, and client tweaks survive deploys. To reuse the bundled Liminal theme remotely, copy `keycloak/themes/liminal` into `/opt/keycloak/themes`, then select **Realm Settings → Themes → Login = liminal**.

Important (Railway + Dockerfile): this repo serves OIDC settings from `/api/config` at **runtime**, so you can set `NEXT_PUBLIC_OIDC_*` as normal Railway **Variables** on the frontend service (no special build-args UI required).

Backend env:
- `OIDC_ISSUER=https://<your-idp>/realms/<realm>`
- `OIDC_AUDIENCE=<client-id>` (optional if your provider doesn’t set aud the way you expect)
- `OIDC_JWKS_URL=<optional>` (otherwise discovered from `/.well-known/openid-configuration`)

Frontend env:
- `NEXT_PUBLIC_OIDC_AUTHORITY=https://<your-idp>/realms/<realm>`
- `NEXT_PUBLIC_OIDC_CLIENT_ID=<client-id>`
- `NEXT_PUBLIC_OIDC_REDIRECT_URI=https://<your-frontend-domain>/auth/callback`

### Social / external logins
- Configure your IdP (e.g., Keycloak) with identity providers for Google, GitHub, etc. When using Keycloak, add each provider under **Identity Providers**, set the “Alias” (e.g., `google`), provide the upstream client ID/secret, and enable it.
- Expose the buttons you want in the frontend via `NEXT_PUBLIC_OIDC_PROVIDERS` (format: `alias=Button label##other=Another label`). The `alias` should be `default` for the built-in login form or the exact identity-provider alias for social providers so the app can pass `kc_idp_hint`.
- Example: `NEXT_PUBLIC_OIDC_PROVIDERS=default=Continue with Liminal##google=Continue with Google##github=Continue with GitHub`.
- The backend already accepts any tokens issued by your IdP, so once the provider is configured + listed here, users can authenticate with it.

### Persisting Keycloak in Railway
The local Docker setup already persists Keycloak via the `keycloak_data` volume. When deploying to Railway you need to attach persistent storage yourself so users and settings survive deploys:

1. In the Railway dashboard open the **Keycloak service → Settings → Volumes** (or “Add Volume”). Mount a disk to `/opt/keycloak/data`. A 1–2 GB disk is plenty.
2. Redeploy the service so Keycloak writes to that disk. Future deploys reuse the same data.
3. If you ever need a clean slate, delete the volume from the Railway UI; Keycloak will recreate tables and import the bundled realm on the next deploy.

Alternatively point Keycloak at an external Postgres database (set `KC_DB=postgres` plus connection env vars) so it shares the same managed DB as the backend.

#### Using Postgres instead of the embedded H2
If you created a separate Postgres database (e.g., a Railway “keycloak-db” service), set these variables on the Keycloak container:

- `KC_DB=postgres`
- `KC_DB_URL=jdbc:postgresql://<host>:<port>/<database>`
- `KC_DB_USERNAME=<db-user>`
- `KC_DB_PASSWORD=<db-password>`

For Railway, the `<host>`, `<port>`, and `<database>` values are shown under the Postgres service’s “Connect” tab. After setting those env vars, redeploy Keycloak—the migration log will show Liquibase creating the schema in Postgres, and all future user/theme changes will live there automatically.

Dev/test-only local auth:
- `ENABLE_LOCAL_AUTH=1` to re-enable `/users` + `/auth/login`. 

## 📦 Railway Infrastructure-as-Code
Manual clicks in the Railway UI tend to drift from what is in Git. The repo now contains an executable stack description (`infra/railway/stack.json`) plus a provisioning script (`scripts/provision_railway.py`) that drives Railway’s GraphQL API. The script is idempotent—run it again whenever env vars change and it will bring the remote resources back in sync.

### Requirements
- Railway personal access token (Settings → Account → Tokens).
- CLI application machine with outbound HTTPS access (the script uses `requests`).
- Runtime values exported as env vars **or** placed in one of the `.env.*` files (dev/qa/prod) before running the script:
  - `RAILWAY_TOKEN` – API token above.
  - `PROD_FRONTEND_URL` – e.g., `https://liminal-frontend-production.up.railway.app`
  - `PROD_BACKEND_URL` – e.g., `https://liminal-backend-production.up.railway.app`
  - `PROD_KEYCLOAK_URL` – e.g., `https://liminal-keycloak-production.up.railway.app`
  - `SECRET_KEY`, `KEYCLOAK_ADMIN_PASSWORD`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_PROVIDER`,
    and any other values referenced by the stack file.
  - Optional overrides like `NEXT_PUBLIC_OIDC_PROVIDERS`, `KEYCLOAK_ADMIN`, etc.
- Update `infra/railway/stack.json` with the Railway **workspace name** you want the project created in (the default placeholder is `Default Workspace`).

### Running the provisioner
```bash
# load values from .env.prod (env vars override anything in the file)
python scripts/provision_railway.py --config infra/railway/stack.json --env-file .env.prod

 # or export everything manually:
# export RAILWAY_TOKEN=rw_XXXXXXXXXXXXXXXX
# export PROD_FRONTEND_URL=https://liminal-frontend-production.up.railway.app
# ...
# python scripts/provision_railway.py --config infra/railway/stack.json
```
What it does:
- Ensures the Railway project (`liminal`) and `production` environment exist.
- Creates/updates two managed Postgres plugins (`liminal-db` for the app, `keycloak-db` for Keycloak) and reads their credentials for templating.
- Creates/updates the three main services (backend, frontend, keycloak) with the builder definitions from the stack file.
- Upserts all per-service env vars defined in the stack after resolving `${env.*}` and `${db.*}` placeholders.

Use `--dry-run` to inspect the GraphQL mutations without executing them. Edit `infra/railway/stack.json` to tweak env vars, build commands, or add more services and re-run the script to apply.

## 📝 Next Steps
1. Add a user-facing Settings page wired to `GET /me` and `PATCH /me/settings`.
2. Configure an IdP (Keycloak/Authentik/Zitadel) and set the env vars above.
