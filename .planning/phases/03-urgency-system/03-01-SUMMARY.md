---
phase: 03-urgency-system
plan: 01
subsystem: ui
tags: [chroma-js, date-fns, requestAnimationFrame, react-hooks, color-interpolation, urgency, adhd]

# Dependency graph
requires:
  - phase: 02-capture-and-feedback
    provides: Task interface with due_date, created_at, status, effort_score fields
provides:
  - getUrgencyColor: hex color string based on deadline proximity (green→yellow→orange→red)
  - getUrgencyLevel: categorical urgency tier (none/safe/soon/urgent/critical/overdue)
  - isStaleTask: boolean flag for backlog items older than N days
  - useCountdown: requestAnimationFrame-based countdown hook returning { timeLeft, isOverdue }
  - useUrgencyColor: memoized urgency color hook wrapping getUrgencyColor
affects: [03-02-urgency-components, 03-03-notifications, TaskCard, Board, FocusDashboard]

# Tech tracking
tech-stack:
  added: [chroma-js@3.2.0, @types/chroma-js@3.1.2]
  patterns:
    - HSL color interpolation via chroma-js (not RGB — avoids muddy midpoints)
    - requestAnimationFrame with 1000ms throttle for countdown timers (not setInterval)
    - Inline style={{ backgroundColor }} for dynamic colors (not dynamic Tailwind classes)
    - useMemo for color calculation memoization keyed on [dueDate, createdAt, status]
    - Warm orange (#f97316) for overdue state (not shame-inducing pure red)

key-files:
  created:
    - frontend/lib/urgency.ts
    - frontend/lib/hooks/useCountdown.ts
    - frontend/lib/hooks/useUrgencyColor.ts
  modified:
    - frontend/package.json (added chroma-js dependency)

key-decisions:
  - "Use warm orange (#f97316) for overdue tasks — avoids shame-inducing red that triggers RSD in ADHD users"
  - "requestAnimationFrame over setInterval — setInterval drifts when tab backgrounded"
  - "HSL interpolation mode in chroma-js — RGB produces muddy brown between green and red"
  - "useMemo in useUrgencyColor with [dueDate, createdAt, status] deps — prevents recalculation on unrelated renders"
  - "Inline style={{ backgroundColor: color }} — dynamic Tailwind class strings break at build time (Tailwind v3 limitation)"
  - "Initial render without RAF delay — useCountdown calculates immediately then starts loop"

patterns-established:
  - "Pure utility functions in lib/ (urgency.ts), thin hook wrappers in lib/hooks/"
  - "useCountdown RAF loop stops on overdue (no wasted cycles for past-deadline tasks)"
  - "useCountdown returns { timeLeft, isOverdue } as named object (not raw string) for semantic clarity"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 3 Plan 01: Urgency Calculation Foundation Summary

**HSL color gradient foundation with requestAnimationFrame countdown hook — chroma-js interpolates green→yellow→orange→red deadline urgency with ADHD-safe warm orange for overdue**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T23:11:34Z
- **Completed:** 2026-02-19T23:13:35Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `urgency.ts` with three pure utility functions: `getUrgencyColor`, `getUrgencyLevel`, `isStaleTask`
- HSL color scale interpolates through green→yellow→orange→red based on (timeRemaining/totalTime) progress ratio
- Created `useCountdown` hook with requestAnimationFrame loop throttled to 1000ms — no setInterval drift
- Created `useUrgencyColor` as memoized hook wrapper, preventing recalculation on unrelated renders
- chroma-js installed as production dependency, @types/chroma-js as dev dependency

## Task Commits

Each task was committed atomically:

1. **Task 1: Install chroma-js and create urgency utility library** - `afd402d` (feat)
2. **Task 2: Create useCountdown and useUrgencyColor hooks** - `3b6491f` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `frontend/lib/urgency.ts` - Pure utility functions: getUrgencyColor (HSL gradient), getUrgencyLevel (categorical tier), isStaleTask (backlog aging flag)
- `frontend/lib/hooks/useCountdown.ts` - requestAnimationFrame countdown hook, returns { timeLeft, isOverdue }
- `frontend/lib/hooks/useUrgencyColor.ts` - useMemo wrapper around getUrgencyColor
- `frontend/package.json` - Added chroma-js@^3.2.0 and @types/chroma-js@^3.1.2
- `frontend/package-lock.json` - Updated lockfile

## Decisions Made

- Warm orange (#f97316) for overdue state: avoids pure red (#ef4444) which triggers Rejection Sensitive Dysphoria (RSD) in ADHD users. Research-backed ADHD-safe design.
- requestAnimationFrame over setInterval: setInterval throttles to 1000ms in background tabs causing time drift. RAF suspends cleanly and resumes without lag.
- HSL interpolation mode: linear RGB interpolation between green and red produces muddy brown at midpoint. HSL traverses the hue wheel (120°→0°) producing vibrant yellows and oranges.
- Inline styles for dynamic colors: Tailwind v3 scans class strings at build time — dynamically constructed class names (bg-[${color}]) are not detected and CSS is never generated.
- Initial immediate render in useCountdown: calculates and sets timeLeft before starting RAF loop to avoid 1-second blank on first render.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in unrelated files were found during `npx tsc --noEmit`. None are in the new urgency files. These are logged in `.planning/phases/03-urgency-system/deferred-items.md`:
- `lib/hooks/useVoiceInput.ts` - TS2687 modifier errors (pre-existing)
- `app/api/config/route.ts` - Type predicate errors (pre-existing)
- `src/app/page.tsx` - Missing named export (pre-existing)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Urgency calculation foundation is complete and type-safe
- Ready for Phase 3 Plan 02: UrgencyIndicator component and TaskCard integration
- Components should use `useUrgencyColor` for border/background colors and `useCountdown` for live timer display
- All three utility exports ready: getUrgencyColor, getUrgencyLevel, isStaleTask

---
*Phase: 03-urgency-system*
*Completed: 2026-02-19*
