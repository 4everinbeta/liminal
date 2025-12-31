# Gemini Workspace Guidelines

This file provides context and guidelines for the Gemini agent working in the `adhd-planner` repository. It reflects the current architectural state and operational mandates, aligned with `AGENTS.md`.

## Project Overview
Liminal is an ADHD-centric productivity application designed to reduce cognitive load. It is a full-stack, containerized application.

## Project Structure & Module Organization

- **Root:** `docker-compose.yml` orchestrates the entire stack.
- **Frontend (`/frontend`):** Next.js 13 (App Router), TypeScript, Tailwind CSS.
- **Backend (`/backend`):** Python FastAPI, SQLModel (Async PostgreSQL).
- **LLM (`/liminal_llm`):** Dockerized Ollama service running local models (e.g., `llama3.2`).
- **Documentation:** `ADHD-Planner.system.md` contains the core system prompt; `README.md` handles general setup.

## Build, Test, and Development Commands

### Starting the Application
```bash
# Start all services (Frontend, Backend, DB, LLM)
docker-compose up -d --build

# Access:
# - Frontend: http://localhost:3000
# - Backend Docs: http://localhost:8000/docs
# - LLM Service: http://localhost:11434
```

### Testing
- **Frontend:**
  ```bash
  docker exec liminal_frontend npm test
  ```
- **Backend:**
  ```bash
  docker exec liminal_backend pytest
  ```

## Coding Style & Naming Conventions

- **Vibe Coding:** Write clean, expressive, and pleasant-to-read code. Comments should explain *why*, not *what*.
- **Conventions:**
  - **Python:** PEP 8, typed hints (`typing`), Pydantic models.
  - **TypeScript:** Strict typing, functional components, `forwardRef` for animation components.
- **File Naming:** Descriptive, kebab-case for files, PascalCase for React components.

## Commit & Pull Request Guidelines

- **Commits:** Short, present-tense summaries (e.g., "Fix CORS configuration for local dev").
- **Changes:** Group related changes logically.
- **Safety:** Verify builds before considering a task complete.

## Agent-Specific Instructions

- **Iterative Changes:** Prefer small, verifiable changes over massive rewrites.
- **Context Awareness:** Always check `docker-compose.yml` and `package.json`/`requirements.txt` before assuming dependency availability.
- **Safety:** Do not commit secrets. Ensure the `.env` or environment variables in Docker are used for sensitive data.