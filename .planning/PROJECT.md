# Liminal: Executive Function & ADHD-Optimized Productivity

## What This Is

Liminal is a productivity system specifically designed for ADHD and neurodiverse minds. Instead of traditional todo lists that rely on importance/priority (which ADHD brains struggle with), Liminal creates urgency and momentum through time pressure, visual cues, and AI-powered "do this now" suggestions. It replaces decision paralysis with frictionless capture and anxiety with satisfying progress.

The v1.0 MVP shipped a complete ADHD-optimization layer over the existing task manager: progressive disclosure capture, voice input, urgency gradients, gamification streaks, AI suggestions, forgiveness mechanics, and a Capacitor iOS shell.

## Core Value

**ADHD brains respond to NOW/NOT NOW, not IMPORTANT/NOT IMPORTANT.** Everything in Liminal must create urgency, reduce friction, or provide dopamine rewards. If a feature requires abstract planning, multi-step decisions, or sustained attention without payoff, it doesn't belong.

## Current State

**Version:** v1.0 (shipped 2026-03-28)
**Stack:** Next.js 13 (static export), FastAPI, PostgreSQL, Capacitor iOS, Dexie.js offline queue
**LOC:** ~9,600 TypeScript frontend | ~2,000 Python backend
**Tests:** 89/89 passing (Vitest)
**CI:** GitHub Actions (lint + build + test on push to main)

## Requirements

### Validated

*Shipped and working in v1.0:*

- ✓ **Task Management Foundation** — v1.0 existing
  - Create/read/update/delete tasks via REST API
  - Multi-dimensional task scoring (auto-calculated from urgency signals)
  - Task status workflow (backlog → in_progress → done)
  - PostgreSQL persistence with SQLModel ORM

- ✓ **Strategic Organization** — v1.0 existing
  - Themes for grouping related work (optional, not required)
  - Initiatives as sub-containers within themes
  - Board view with drag-drop between theme columns

- ✓ **Authentication & Users** — v1.0 existing
  - JWT-based authentication, Google OAuth, demo user auto-auth

- ✓ **Frictionless Capture** — v1.0
  - Title-only task creation with progressive disclosure
  - Auto-calculated priority/value/effort from due date + duration
  - Global quick-capture FAB (bottom-right, z-50)
  - Cmd/Ctrl+N keyboard shortcut from anywhere
  - Voice input via Web Speech API with real-time transcription
  - 2-second auto-save debounce, sessionStorage draft recovery
  - Optimistic UI creation within 100ms

- ✓ **Immediate Feedback** — v1.0
  - canvas-confetti celebration on task completion (dashboard + board)
  - Framer Motion whileTap scale animation on task check-off
  - All user actions respond within 200ms perceived lag

- ✓ **Urgency System** — v1.0
  - chroma-js HSL color gradient on task borders by deadline proximity
  - Live countdown timers via requestAnimationFrame (no drift)
  - Warm orange (#f97316) for overdue — avoids shame-inducing red
  - Task aging after 3 days in backlog (visual fade/style change)
  - CapacitySummary in Planning mode ("X hours left, Y tasks")
  - Opt-in browser notifications 1 hour before deadline

- ✓ **Gamification** — v1.0
  - StatsBar: animated daily count, weekly streak, personal best, impact pill
  - Flexible streak (no penalty for first-day gaps)
  - End-of-day wins-only toast (opt-in, no incomplete-task focus)
  - Framer Motion AnimatedCounter with spring animations

- ✓ **Forgiveness & Recovery** — v1.0
  - 30-second undo window on task completion
  - Zustand persist middleware for session state across reloads
  - sessionStorage draft recovery after browser crash
  - 24-hour soft delete with restore
  - "Where you left off" glowing ring on interrupted task
  - Interrupted task badge with auto-clear on completion
  - Paused task auto-resumes as active on next session load

- ✓ **AI Prioritization** — v1.0
  - Inline "Do This Now" card in Planning mode dashboard
  - 15-minute refresh cycle with dismiss memory
  - Accept switches to Focus mode on the suggested task
  - Considers time of day, deadline proximity, estimated duration
  - Adapts to user patterns (learns ignored vs accepted)
  - Task list auto-sorts by urgency + AI score

- ✓ **iOS Shell** — v1.0
  - Capacitor iOS shell with static Next.js export
  - Dexie.js offline mutation queue (createTask/updateTask/deleteTask)
  - OfflineBanner with amber color and auto-hide on reconnect
  - Bottom tab navigation (Today, Board, Capture, More)
  - SwipeableTaskCard: swipe left to complete, right to edit
  - Capacitor Haptics on swipe confirmation
  - Safe area CSS (env(safe-area-inset-*)) for notched iPhones

### Active

*For next milestone:*

- [ ] **SIMPLIFY-03 (partial)**: EditTaskModal still has 1-100 numeric inputs for value/effort — convert to presets
- [ ] **SIMPLIFY-02 (partial)**: Natural language score tweaking — current shorthand-only (!high, 30m)
- [ ] **URGENCY-04 (partial)**: CapacitySummary visible in Focus mode, not just Planning mode
- [ ] **GAMIFY-03 (partial)**: Impact pill shows "0 hours" for tasks without estimated_duration — improve fallback
- [ ] **EodSummaryToast discovery**: Default is opt-in false — users don't find it; consider auto-enable or onboarding hint
- [ ] **Nyquist validation**: Phases 1–4 have no VALIDATION.md — retroactive compliance pass

### Out of Scope

*Explicitly excluded:*

| Feature | Reason |
|---------|--------|
| Complex strategic planning (Themes required upfront) | ADHD users need execution support, not planning. Themes optional only. |
| Multi-step workflows with blocking modals | Breaks flow. All validation is non-blocking. |
| Abstract numeric scoring (1-100 sliders) | Cognitively demanding. Replace with natural language or auto-calc. |
| Traditional priority (high/medium/low) as primary sort | Doesn't work for ADHD. Use urgency (NOW/NOT NOW) instead. |
| Perfectionism features (task templates, detailed planning) | Planning becomes procrastination. Capture beats perfection. |
| Mandatory fields beyond title | Creates capture failure when thought is fleeting. |
| Shame-inducing failure states (broken streaks) | Emotional dysregulation trigger. Focus on wins, not failures. |
| Video chat | Use external tools. |
| Offline mode for AI suggestions | AI requires connectivity; offline queue covers task CRUD only. |

## Context

**Shipped v1.0** with 9,600 LOC TypeScript, 280 commits, 7 phases, 22 plans over ~3.5 months.

**Tech stack:** Next.js 13 (static export), React 18, TypeScript, Tailwind CSS, Zustand, Framer Motion, Capacitor, Dexie.js, FastAPI, SQLModel, PostgreSQL 15, Ollama/Azure AI/Groq.

**Known pain points to address in v1.1:**
- EditTaskModal numeric inputs (SIMPLIFY-03 gap)
- EodSummaryToast discoverability
- CapacitySummary only in Planning mode

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Urgency over importance | ADHD brains respond to NOW/NOT NOW, not priority rankings | ✓ Core UX principle — every phase references it |
| AI suggests, user overrides | Leverage LLM for smart defaults while preserving user agency | ✓ One-click dismiss/accept inline card |
| Capture-first, refine-later | Reduce friction at moment of thought capture | ✓ Title-only + progressive disclosure shipped |
| Gamification for momentum | Streaks and visual progress create sustained engagement | ✓ StatsBar + EoD toast |
| Simplify scoring system | Replace abstract 1-100 scores with natural language or auto-calc | ✓ TaskForm done; EditTaskModal partial |
| Warm orange for overdue (not red) | Red triggers RSD (rejection sensitive dysphoria) in ADHD users | ✓ Applied throughout urgency system |
| rAF for countdown timers | requestAnimationFrame suspends cleanly; setInterval drifts in bg tabs | ✓ useCountdown hook |
| canvas-confetti | GPU-accelerated, zero custom CSS needed | ✓ Used in all completion paths |
| sessionStorage for drafts | Automatic cleanup on session end vs localStorage persistence | ✓ useDraftPreservation |
| output: 'export' (static) | Required for Capacitor iOS — no SSR possible in shell | ✓ Build passes, 89 tests green |
| Dexie.js for offline queue | TypeScript-native IndexedDB, fake-indexeddb for Vitest | ✓ Offline mutations queue and replay |
| Dynamic import(@capacitor/*) | Avoids SSR errors during next build static export | ✓ Pattern used for all Capacitor imports |
| webDir: frontend/.next-clean | Custom distDir overrides default output path | ✓ Capacitor sync works |
| SwipeableTaskCard on mobile | @hello-pangea/dnd replaced on ≤768px — swipe beats column drag on phones | ✓ Haptics + gesture confirm |

## Constraints

- **Tech Stack**: Must work within existing Next.js/FastAPI architecture — no framework rewrites
- **LLM Integration**: Leverage existing AgentService and LLM providers, don't add new dependencies
- **Data Migration**: Changes to task model must migrate existing data
- **Demo Mode**: Must maintain demo user auto-auth for development/testing
- **Performance**: Notifications and visual updates must not degrade UI responsiveness
- **Accessibility**: Voice input and visual urgency cues must have accessible alternatives
- **Static Export**: `output: 'export'` required for Capacitor — no `getServerSideProps`, no Next.js API routes

## Current Milestone: v1.1 Polish & Ship

**Goal:** Clear v1.0 tech debt and deliver a production-ready iOS app on TestFlight with a hardened backend.

**Target features:**
- EditTaskModal preset inputs replacing numeric 1-100 (SIMPLIFY-03)
- CapacitySummary visible in Focus mode (URGENCY-04)
- EodSummaryToast discoverability improvement (auto-enable or onboarding hint)
- Impact pill duration fallback for tasks without estimated_duration (GAMIFY-03)
- Retroactive Nyquist VALIDATION.md for Phases 1–4
- restoreTask offline guard in api.ts (RECOVERY-04)
- GitHub Actions + Fastlane CI/CD pipeline → TestFlight IPA
- Railway env vars & secrets management for production
- CORS lockdown + remove demo-user auto-auth in prod
- Sentry error monitoring (backend)
- API rate limiting & input validation hardening

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-02 — v1.1 milestone started (Polish & Ship)*
