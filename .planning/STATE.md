# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-31)

**Core value:** ADHD brains respond to NOW/NOT NOW, not IMPORTANT/NOT IMPORTANT
**Current focus:** Phase 5: Forgiveness

## Current Position

Phase: 4 of 6 (Gamification) — COMPLETE
Plan: 3 of 3 in current phase
Status: Phase complete ✅
Last activity: 2026-02-19 — Completed Phase 4 (Gamification) integration

Progress: [██████████] 10/10 plans (100%)

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: 2.3 min
- Total execution time: 0.45 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 8.8 min | 2.9 min |
| 02-capture--and--feedback | 4 | 8.7 min | 2.2 min |
| 03-urgency-system | 3 | 31 min | 10.3 min |
| 04-gamification | 3 | 30 min | 10.0 min |

**Recent Trend:**
- Last 5 plans: 02-03 (2.7min), 02-04 (1min), 01-03 (2.6min), 03-01 (2min), 03-02 (4min)
- Trend: Consistent velocity maintained

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Urgency over importance (ADHD brains respond to NOW/NOT NOW, not priority rankings)
- AI suggests, user overrides (Leverage LLM for smart defaults while preserving user agency)
- Capture-first, refine-later (Reduce friction at moment of thought capture)
- Gamification for momentum (Streaks and visual progress create sustained engagement)
- Simplify scoring system (Replace abstract 1-100 scores with natural language or auto-calc)

**From 02-01:**
- Use sessionStorage over localStorage for draft preservation (automatic cleanup on session end)
- Web Speech API with graceful degradation (Chrome/Edge support, progressive enhancement)
- 2-second auto-save debounce as default (balances data loss risk with server load)
- Request ID pattern for race condition prevention (ignore out-of-order responses)

**From 02-02:**
- Use canvas-confetti over custom CSS animations for GPU acceleration
- Build custom keyboard shortcut hook instead of react-hotkeys-hook to avoid unnecessary dependency
- Treat Cmd and Ctrl as equivalent for cross-platform keyboard shortcuts
- Prevent shortcuts from triggering in input fields except those marked with data-quick-capture

**From 02-03:**
- Position FAB bottom-right with z-50 for visibility above all content
- Store quick capture open state in Zustand for global access
- Integrate GlobalQuickCapture in root layout for app-wide availability
- Modal positioned at top-1/3 for comfortable ADHD viewing (less eye travel than centered)

**From 02-04:**
- Fire confetti before API call (optimistic) for <200ms perceived lag in completion feedback
- Use Framer Motion whileTap scale animation on checkbox for tactile satisfaction
- Apply triggerTaskComplete to both TaskCard and Board completion flows for consistency

**From 01-03:**
- Focus mode as default (isFocusMode: true) - execution-first over planning-first
- Skip over pause button (concrete action beats abstract action)
- Single-column planning layout (reduces competing interfaces)
- Inline mode toggle in header (avoid unnecessary component abstraction)

**From 03-01:**
- Warm orange (#f97316) for overdue state — avoids shame-inducing red that triggers RSD in ADHD users
- requestAnimationFrame over setInterval for countdown timers (RAF suspends cleanly, setInterval drifts in background tabs)
- HSL interpolation mode in chroma-js — RGB produces muddy brown between green and red
- Inline style={{ backgroundColor: color }} for dynamic colors — dynamic Tailwind class strings break at build time (Tailwind v3)
- useCountdown returns { timeLeft, isOverdue } named object for semantic clarity (not raw string)

**From 03-02:**
- Hardcode 9-5 workday for MVP — avoids configuration complexity, per RESEARCH.md open question 1
- Greedy fit uses shortest-first ordering — maximizes tasks completed under time constraint
- Over-capacity shown with text-orange-600 (warm orange), never text-red-600 — ADHD-safe design
- 25-day ceiling for setTimeout scheduling — avoids 32-bit integer overflow in browser
- Module-level Map<string, number> for active notifications — auto-cancels duplicates on re-render
- triggerSoftAsk() separates soft prompt from browser dialog — avoids Chrome/Firefox permission penalties

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-19 (plan execution)
Stopped at: Completed 03-02-PLAN.md (Capacity Summary and Notifications)
Resume file: None

**Phase 1 Status:** ✅ Complete - Foundation established
  - 01-01: Progressive disclosure forms (title-only capture with smart defaults)
  - 01-02: Frictionless board (no modal drag-drop, optional themes)
  - 01-03: Focus-first dashboard (execution mode default, mode toggle, Complete/Skip actions)

**Phase 2 Status:** ✅ Complete - Full capture and feedback loop implemented
  - 02-01: Foundation hooks (draft preservation, voice input, auto-save)
  - 02-02: Confetti and shortcuts (completion celebrations, Cmd/Ctrl+N)
  - 02-03: Global quick capture (FAB, modal, optimistic creation)
  - 02-04: Task completion celebrations (confetti integration)

**Phase 3 Status:** ✅ Complete - Full urgency system implemented and human-verified
  - 03-01: Urgency utilities (chroma-js gradient, useCountdown RAF, useUrgencyColor)
  - 03-02: Capacity summary and notifications (CapacitySummary, notifications.ts, useNotifications)
  - 03-03: Wire urgency into UI (PlanningTaskRow with hooks, UrgencyIndicator, CapacitySummary, notification soft-ask)

**From 03-03:**
- transpilePackages: ['chroma-js'] required in next.config.js — chroma-js v3 is pure ESM
- Extract PlanningTaskRow component to use hooks per task (hooks can't be called in .map())
- React.memo wraps TaskCard to prevent O(n) re-renders from rAF countdown updates
- sessionStorage for soft-ask dismissal (session-scoped, not permanent)

**Next Phase:** Phase 4 - Gamification (streaks, progress tracking, momentum)
