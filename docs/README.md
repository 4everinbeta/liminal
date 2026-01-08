# Liminal Documentation

Welcome to the Liminal ADHD Planner documentation. This directory contains comprehensive technical documentation for developers, architects, and contributors.

## Documentation Index

### 📐 [ARCHITECTURE.md](./ARCHITECTURE.md)
Comprehensive architectural documentation with visual diagrams covering:
- System architecture and infrastructure
- Data model (ER diagram)
- Authentication flow (OIDC)
- AI agent orchestration (Semantic Kernel)
- API architecture and endpoints
- Frontend component hierarchy
- Task lifecycle state machine
- Confirmation flow for AI actions
- Real-time WebSocket communication
- Deployment architecture

**Start here** if you want to understand how the system works.

---

## Quick Links

### Getting Started
- [Main README](../README.md) - Project overview and setup instructions
- [CLAUDE.md](../CLAUDE.md) - Development guide and commands

### Frontend
- [Frontend Testing Guide](../frontend/TESTING.md) - E2E and component testing
- Frontend Architecture: [ARCHITECTURE.md#6-frontend-architecture](./ARCHITECTURE.md#6-frontend-architecture)

### Backend
- Backend API Endpoints: [ARCHITECTURE.md#5-api-architecture](./ARCHITECTURE.md#5-api-architecture)
- Data Model: [ARCHITECTURE.md#2-data-model-er-diagram](./ARCHITECTURE.md#2-data-model-er-diagram)

### AI/Agent System
- Semantic Kernel Orchestration: [ARCHITECTURE.md#4-ai-agent-orchestration-semantic-kernel](./ARCHITECTURE.md#4-ai-agent-orchestration-semantic-kernel)
- Confirmation Flow: [ARCHITECTURE.md#8-ai-confirmation-flow](./ARCHITECTURE.md#8-ai-confirmation-flow)

### Deployment
- Deployment Architecture: [ARCHITECTURE.md#deployment-architecture](./ARCHITECTURE.md#deployment-architecture)
- Railway Deployment: [../infra/railway/README.md](../infra/railway/README.md)

---

## Documentation Standards

When contributing to documentation:

1. **Use Mermaid diagrams** for visual representations (GitHub renders them automatically)
2. **Keep diagrams up-to-date** with code changes
3. **Include code references** with file paths and line numbers where applicable
4. **Write for multiple audiences**: developers, architects, and operators
5. **Date your updates** at the bottom of documents
6. **Link between docs** to create a connected knowledge graph

---

## Diagram Types in ARCHITECTURE.md

| Diagram Type | Use Case | Mermaid Type |
|--------------|----------|--------------|
| System Architecture | Infrastructure, services, data flow | `graph TB` |
| Data Model | Database schema, relationships | `erDiagram` |
| Sequence Diagrams | Request/response flows, interactions | `sequenceDiagram` |
| State Machines | Status transitions, lifecycles | `stateDiagram-v2` |
| Component Hierarchy | Frontend/backend structure | `graph TB` |

---

## Contributing

When making architectural changes:

1. **Update diagrams** in ARCHITECTURE.md to reflect the change
2. **Add comments** explaining design decisions
3. **Document new patterns** if introducing new architectural approaches
4. **Review with team** before merging significant architectural changes

---

## Viewing Diagrams

### In GitHub
Mermaid diagrams render automatically in GitHub's markdown viewer.

### Locally
Use a markdown viewer that supports Mermaid:
- **VS Code**: Install "Markdown Preview Mermaid Support" extension
- **IntelliJ/WebStorm**: Built-in support
- **Browser**: Use [mermaid.live](https://mermaid.live) to preview/edit diagrams

### Exporting
To export diagrams as images:
```bash
# Install mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# Export a diagram
mmdc -i docs/ARCHITECTURE.md -o docs/diagrams/architecture.png
```

---

## Documentation Roadmap

Future documentation to add:

- [ ] **API Reference** - Detailed API endpoint documentation (consider OpenAPI/Swagger export)
- [ ] **Database Migrations Guide** - Alembic setup and migration workflow
- [ ] **Development Workflow** - Git flow, branching strategy, PR guidelines
- [ ] **Security Guide** - Authentication, authorization, OWASP compliance
- [ ] **Performance Guide** - Optimization strategies, monitoring, profiling
- [ ] **Troubleshooting** - Common issues and solutions
- [ ] **ADR (Architecture Decision Records)** - Key technical decisions and rationale

---

**Last Updated**: 2026-01-07
**Maintained By**: Liminal Development Team
