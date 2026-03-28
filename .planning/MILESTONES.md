# Milestones

## v1.0 — ADHD Optimization MVP

**Shipped:** 2026-03-28
**Phases:** 7 (Phases 1–7)
**Plans:** 22
**Timeline:** Dec 2025 → Mar 2026 (~3.5 months)
**Commits:** 280
**Files changed:** 294 | **LOC:** ~9,600 TypeScript

### Delivered

Transformed Liminal from a traditional task manager into an ADHD-optimized productivity system with frictionless capture, urgency visualization, gamification, AI prioritization, and a Capacitor iOS shell.

### Key Accomplishments

1. **Progressive disclosure capture** — title-only task creation with auto-calculated scores; no mandatory fields
2. **Global quick-capture + voice** — FAB, Cmd/Ctrl+N shortcut, Web Speech API transcription, confetti on completion
3. **Urgency system** — deadline color gradients (chroma-js HSL), live rAF countdowns, task aging, capacity summary, opt-in browser notifications
4. **Gamification** — animated StatsBar (daily count, streaks, personal best, impact pill), end-of-day wins-only toast
5. **Forgiveness** — "where you left off" ring, interrupted task badge, auto-resume paused tasks, 30s undo window
6. **AI "Do This Now"** — inline suggestion card with 15-min refresh, accept switches to focus mode, one-click dismiss
7. **iOS shell** — Capacitor + static export, Dexie.js offline mutation queue, bottom tab nav, swipe-to-complete with haptics

### Requirements

53/53 v1 requirements complete (3 gaps fixed post-audit)

### Known Tech Debt

- EditTaskModal still has partial numeric inputs (SIMPLIFY-03)
- CapacitySummary hidden in Focus mode (URGENCY-04 low severity)
- GAMIFY-03 impact only shows if tasks have `estimated_duration`
- `ios/` directory not committed — run `npx cap add ios` on each Mac build machine
- Phases 1–4 lack Nyquist VALIDATION.md files

### Archive

- `.planning/milestones/v1.0-ROADMAP.md` — full phase details
- `.planning/milestones/v1.0-REQUIREMENTS.md` — all 53 requirements with outcomes
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — audit findings

---
