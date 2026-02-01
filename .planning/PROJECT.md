# Liminal: Executive Function & ADHD-Optimized Productivity

## What This Is

Liminal is a productivity system specifically designed for ADHD and neurodiverse minds. Instead of traditional todo lists that rely on importance/priority (which ADHD brains struggle with), Liminal creates urgency and momentum through time pressure, visual cues, and AI-powered "do this now" suggestions. It replaces decision paralysis with frictionless capture and anxiety with satisfying progress.

## Core Value

**ADHD brains respond to NOW/NOT NOW, not IMPORTANT/NOT IMPORTANT.** Everything in Liminal must create urgency, reduce friction, or provide dopamine rewards. If a feature requires abstract planning, multi-step decisions, or sustained attention without payoff, it doesn't belong.

## Requirements

### Validated

*Features already built and working in the existing codebase:*

- ✓ **Task Management Foundation** — existing
  - Create/read/update/delete tasks via REST API
  - Multi-dimensional task scoring (priority, value, effort)
  - Task status workflow (backlog → in_progress → done)
  - PostgreSQL persistence with SQLModel ORM

- ✓ **Strategic Organization** — existing
  - Themes for grouping related work
  - Initiatives as sub-containers within themes
  - Board view with drag-drop between theme columns

- ✓ **Authentication & Users** — existing
  - JWT-based authentication
  - Google OAuth support
  - Demo user auto-authentication for development
  - User-scoped data isolation

- ✓ **LLM-Powered Chat Agent** — existing
  - Intent classification (task management, Q&A, tracking)
  - Natural language task creation via chat
  - JSON command parsing from LLM responses
  - Support for local (Ollama), Azure AI Foundry, and Groq providers

- ✓ **Focus Mode UI** — existing
  - Single-task focus view
  - Pomodoro timer integration
  - Task completion and pause controls
  - Dashboard with task list and quick add form

- ✓ **Infrastructure** — existing
  - Next.js 13 App Router frontend
  - FastAPI async backend
  - Docker Compose orchestration
  - Ollama integration for local LLM

### Active

*ADHD-optimization improvements to build:*

#### Frictionless Capture

- [ ] **CAPTURE-01**: Global quick-add input (always visible, minimal fields)
- [ ] **CAPTURE-02**: Voice/speech input for task creation
- [ ] **CAPTURE-03**: Smart defaults for all optional fields
- [ ] **CAPTURE-04**: "Dump now, refine later" workflow
- [ ] **CAPTURE-05**: Form autosave to prevent data loss on distraction
- [ ] **CAPTURE-06**: One-field capture - just title required, everything else inferred or asked later

#### Urgency System

- [ ] **URGENCY-01**: Time-based notifications as deadlines approach
- [ ] **URGENCY-02**: Scarcity framing ("You have 2 hours left today")
- [ ] **URGENCY-03**: Gamification streaks ("5 days in a row")
- [ ] **URGENCY-04**: Visual time pressure (tasks age/fade/change color as they sit)
- [ ] **URGENCY-05**: "Due soon" vs "due later" visual distinction
- [ ] **URGENCY-06**: Daily capacity visualization ("You can fit 3 more tasks today")

#### AI-Powered Prioritization

- [ ] **AI-01**: LLM agent suggests "do this now" based on time/energy/context
- [ ] **AI-02**: Easy manual override of AI suggestions
- [ ] **AI-03**: Energy-level detection ("You have low energy - here are quick wins")
- [ ] **AI-04**: Contextual recommendations (time of day, day of week patterns)
- [ ] **AI-05**: Auto-sort tasks by deadline proximity and estimated duration
- [ ] **AI-06**: Simplify scoring - replace abstract 1-100 values with natural language or auto-calculation

#### Satisfying Completion

- [ ] **REWARD-01**: Visual celebration on task completion (animations, confetti)
- [ ] **REWARD-02**: Concrete impact feedback ("You freed up 2 hours today")
- [ ] **REWARD-03**: Progress momentum tracking ("3 done today, 12 this week")
- [ ] **REWARD-04**: Satisfying check-off animation
- [ ] **REWARD-05**: End-of-day summary with wins highlighted

#### Simplified Task Management

- [ ] **SIMPLIFY-01**: Make Themes/Initiatives optional (not required upfront)
- [ ] **SIMPLIFY-02**: Remove multi-step gating (drag-drop shouldn't block with modals)
- [ ] **SIMPLIFY-03**: Single primary interface (reduce chat + form + board confusion)
- [ ] **SIMPLIFY-04**: Progressive disclosure (show complexity only when needed)
- [ ] **SIMPLIFY-05**: Remove or simplify value_score/effort_score abstract numeric fields

#### Working Memory Support

- [ ] **MEMORY-01**: Visual "where was I?" state indicators
- [ ] **MEMORY-02**: Breadcrumbs and recovery from interruptions
- [ ] **MEMORY-03**: Session persistence across page reloads
- [ ] **MEMORY-04**: "Recently viewed" or "working on" task quick access

### Out of Scope

*Explicitly excluded to maintain focus:*

- **Complex strategic planning tools** — Themes/Initiatives will become optional, not core workflow. Liminal optimizes for execution, not planning.

- **Abstract numeric scoring as primary interface** — No 1-100 sliders without context. If scores exist, they're auto-calculated or natural language.

- **Multi-field forms as primary capture** — Forms create friction. Primary capture should be one field with smart defaults.

- **Traditional importance-based prioritization** — "High/Medium/Low priority" doesn't work for ADHD. We use urgency instead.

- **Perfectionism features** — No "perfect task descriptions" or extensive metadata requirements. Capture beats perfection.

- **Desktop/mobile apps** — Web-first. Native apps deferred to future.

## Context

**Existing Codebase**: Liminal already has a functional task management system with LLM chat integration. The current design follows traditional productivity patterns (importance-based priority, multi-field forms, strategic planning upfront). This project refactors the UX to optimize for ADHD/neurodivergent users based on the principle that these brains respond to urgency/novelty/momentum rather than abstract importance.

**Known Pain Points** (from codebase review):
- TaskForm requires 4 decisions (title, duration, value score, priority) - causes capture failure
- Board drag-drop blocks mid-action with validation modals - breaks flow
- LLM chat capabilities are hidden - users don't know what to ask
- Multiple competing interfaces (task list, chat, quick add) create choice paralysis
- Pause button is non-functional
- No autosave on forms
- Weak completion feedback

**Technical Environment**:
- Frontend: Next.js 13 (App Router), React 18, TypeScript, Tailwind CSS, Zustand
- Backend: FastAPI, SQLModel, PostgreSQL 15
- LLM: Ollama (local), Azure AI Foundry, Groq (configurable)
- Infrastructure: Docker Compose for local dev

## Constraints

- **Tech Stack**: Must work within existing Next.js/FastAPI architecture - no framework rewrites
- **LLM Integration**: Should leverage existing AgentService and LLM providers, not add new dependencies
- **Data Migration**: Changes to task model (removing/simplifying scores) must migrate existing data
- **Demo Mode**: Must maintain demo user auto-auth for development/testing
- **Performance**: Notifications and visual updates must not degrade UI responsiveness
- **Accessibility**: Voice input and visual urgency cues must have accessible alternatives

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Urgency over importance | ADHD brains respond to NOW/NOT NOW, not priority rankings | — Pending |
| AI suggests, user overrides | Leverage LLM for smart defaults while preserving user agency | — Pending |
| Capture-first, refine-later | Reduce friction at moment of thought capture | — Pending |
| Gamification for momentum | Streaks and visual progress create sustained engagement | — Pending |
| Simplify scoring system | Replace abstract 1-100 scores with natural language or auto-calc | — Pending |

---
*Last updated: 2026-01-31 after initialization*
