# Repository Guidelines (Liminal / ADHD Planner)

This file is the primary agent guide for the `adhd-planner` repository. It mirrors `GEMINI.md` so all agents share the same up-to-date instructions.

## Project Overview
- Liminal is an ADHD-centric productivity application designed to reduce cognitive load. It is a full-stack, containerized app.
- Core docs: `ADHD-Planner.system.md` (system prompt), `README.md` (setup), `GEMINI.md` (mirrors these guidelines).

## Project Structure
- Root: `docker-compose.yml` orchestrates the stack.
- Frontend (`/frontend`): Next.js 13 App Router, TypeScript, Tailwind CSS.
- Backend (`/backend`): FastAPI, SQLModel (async PostgreSQL).
- LLM (`/llm` service): Dockerized Ollama running local models (e.g., `llama3.2`).
- Supporting assets: `prompt.min.txt` for compact prompt text; keep new prompts close to related variants.

## Build, Test, and Development Commands
- Start the full stack:
  ```bash
  docker-compose up -d --build
  # Frontend: http://localhost:3000
  # Backend docs: http://localhost:8000/docs
  # LLM service: http://localhost:11434
  ```
- Frontend tests:
  ```bash
  docker exec liminal_frontend npm test
  ```
- Backend tests:
  ```bash
  docker exec liminal_backend pytest
  ```

## Coding Style & Naming
- Vibe coding: clean, expressive, pleasant to read. Comments explain *why*, not *what*.
- Python: PEP 8, type hints, Pydantic models.
- TypeScript/React: strict typing, functional components, use `forwardRef` where appropriate for animated elements.
- File names: kebab-case for files, PascalCase for React components.

## Commit & PR Guidelines
- Commits: short, present-tense summaries (e.g., `Fix CORS configuration for local dev`); group related changes logically.
- Call out behavioral impact for prompt changes; include example I/O when practical.
- Verify builds/tests before marking a task done.

## Agent-Specific Instructions
- Prefer small, verifiable changes over rewrites.
- Check `docker-compose.yml`, `package.json`, and `requirements.txt` before assuming dependencies.
- Keep content concise and relevant to ADHD planning workflows.
- Do not commit secrets; rely on env vars/.env files for sensitive config.
