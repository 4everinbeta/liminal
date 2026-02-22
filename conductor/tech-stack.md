# Technology Stack: Liminal

## Overview
Liminal is a modern, full-stack application built with a Python (FastAPI) backend and a TypeScript (Next.js) frontend, optimized for performance and neurodiverse user needs.

## Frontend
- **Framework:** Next.js 13 (App Router) for high-performance React applications.
- **Language:** TypeScript for type-safe client-side development.
- **Styling:** Tailwind CSS for a utility-first, responsive design.
- **State Management:** Zustand for lightweight, predictable state handling.
- **Animations:** Framer Motion and canvas-confetti for immediate, rewarding visual feedback.
- **Authentication:** OIDC-compliant integration (Keycloak) for secure, flexible user management.

## Backend
- **Framework:** FastAPI for a high-performance, asynchronous Python API.
- **Language:** Python 3.11+ for robust backend logic and AI integration.
- **ORM/Database:** SQLModel (SQLAlchemy + Pydantic) interacting with PostgreSQL 15.
- **Task Scheduling:** Custom monitor for deadline-aware notifications.
- **Agent Orchestration:** Semantic Kernel for managing complex AI interactions.

## AI & LLM
- **Providers:** Flexible support for local (Ollama) and cloud (Azure AI Foundry, Groq) models.
- **Integration:** Backend proxy for secure key management and intent classification.

## Infrastructure
- **Containerization:** Docker and Docker Compose for reproducible development and deployment environments.
- **Deployment:** Optimized for Railway using Infrastructure-as-Code (stack.json).
- **CI/CD:** Automated testing via GitHub Actions.
