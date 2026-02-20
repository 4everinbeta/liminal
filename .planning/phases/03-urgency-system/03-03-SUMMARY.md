---
phase: 03-urgency-system
plan: 03
subsystem: ui
tags: [react, framer-motion, lucide-react, chroma-js, next.js]

requires:
  - phase: 03-01
    provides: urgency.ts (getUrgencyColor, getUrgencyLevel, isStaleTask), useCountdown, useUrgencyColor
  - phase: 03-02
    provides: CapacitySummary component, useNotifications hook

provides:
  - UrgencyIndicator component with live countdown and ADHD-safe messaging
  - TaskCard with urgency border color, visual aging, React.memo optimization
  - Dashboard with CapacitySummary and notification soft-ask banner
affects: [04-gamification, 05-forgiveness]

tech-stack:
  added: [chroma-js transpilePackages config for Next.js ESM compat]
  patterns: [inline styles for dynamic colors (not Tailwind dynamic classes), React.memo for countdown-heavy lists]

key-files:
  created:
    - frontend/components/UrgencyIndicator.tsx
  modified:
    - frontend/components/TaskCard.tsx
    - frontend/app/page.tsx
    - frontend/next.config.js

key-decisions:
  - "transpilePackages: ['chroma-js'] required in next.config.js — chroma-js v3 is pure ESM, Next.js webpack cannot resolve it without this"
  - "Soft-ask state persisted to sessionStorage (not localStorage) — dismissed state scoped to session, not permanent"
  - "UrgencyIndicator returns null when no dueDate — zero-cost for tasks without deadlines"
  - "React.memo wraps TaskCard — prevents O(n) re-renders when any countdown fires in a list of n tasks"

patterns-established:
  - "Dynamic color values use inline style={{ borderLeftColor: color }} not dynamic Tailwind strings"
  - "Framer Motion animate object extended with filter for CSS filter animations (grayscale)"
  - "Notification permission always triggered by explicit user gesture (button click), never auto"

requirements-completed: [URGENCY-01, URGENCY-02, URGENCY-03, URGENCY-04, URGENCY-05, URGENCY-06]

duration: 25min
completed: 2026-02-19
---

# Phase 3: Urgency System Summary

**Full urgency system wired into UI: deadline-gradient borders, live countdown timers, stale task fading, capacity summary, and opt-in browser notifications — all human-verified**

## Performance

- **Duration:** 25 min
- **Completed:** 2026-02-19
- **Tasks:** 3 (including checkpoint)
- **Files modified:** 4

## Accomplishments
- `UrgencyIndicator` renders live countdown ("2 hours left") with urgency-level color and "Let's finish this" for overdue
- `TaskCard` shows deadline-based left border gradient (green → yellow → orange → red) via inline styles; stale backlog tasks fade to 50% opacity with 30% grayscale; wrapped in `React.memo`
- Dashboard planning view shows `CapacitySummary` above task list and per-task countdown indicators
- Notification soft-ask banner appears once when tasks have due dates; dismissed state survives page refresh via sessionStorage
- Human verification checkpoint passed: all 6 URGENCY requirements confirmed working

## Task Commits

1. **Task 1: UrgencyIndicator + TaskCard urgency wiring** - `0138089` (feat)
2. **Task 2: Dashboard CapacitySummary + notification soft-ask** - `cffbf3c` (feat)
3. **Fix: chroma-js ESM compat** - `d96bb40` (fix)

## Files Created/Modified
- `frontend/components/UrgencyIndicator.tsx` — countdown display with urgency styling and ADHD-safe copy
- `frontend/components/TaskCard.tsx` — urgency border, visual aging, React.memo wrapper
- `frontend/app/page.tsx` — CapacitySummary, per-task UrgencyIndicator, notification soft-ask banner
- `frontend/next.config.js` — `transpilePackages: ['chroma-js']` for ESM compatibility

## Decisions Made
- chroma-js v3 requires `transpilePackages` in Next.js config — pure ESM packages fail webpack without it
- React.memo applied to TaskCard because each task's rAF countdown loop fires independently; without memo, one countdown update re-renders all cards

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] chroma-js ESM not resolvable by Next.js webpack**
- **Found during:** Runtime (dev server compile error)
- **Issue:** chroma-js v3 ships as pure ESM; Next.js webpack couldn't resolve the import
- **Fix:** Added `transpilePackages: ['chroma-js']` to `next.config.js`
- **Files modified:** `frontend/next.config.js`
- **Verification:** Dev server compiled successfully; user confirmed colors rendering
- **Committed in:** `d96bb40`

---

**Total deviations:** 1 auto-fixed (1 blocking ESM compat issue)
**Impact on plan:** Fix required for compilation; no scope creep.

## Issues Encountered
- subagent executor refused to run without Bash permissions twice — executed plan directly in orchestrator

## Next Phase Readiness
- All 6 URGENCY requirements verified by user
- Phase 3 complete, Phase 4 (Gamification) ready to plan

---
*Phase: 03-urgency-system*
*Completed: 2026-02-19*
