---
phase: 03-urgency-system
plan: 02
subsystem: ui
tags: [react, tailwind, notifications, web-api, adhd, capacity-planning]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Task interface from api.ts (due_date, effort_score, estimated_duration, status)
provides:
  - CapacitySummary component (calming blue, scarcity framing, greedy task fit)
  - notifications.ts utility library (scheduleTaskNotification, cancelTaskNotification, requestNotificationPermission)
  - useNotifications hook (soft-ask pattern, permission state, scheduling API)
affects: [03-urgency-system, any component that consumes CapacitySummary or useNotifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Soft-ask notification pattern (friendly prompt before browser permission dialog)
    - Greedy task-fit algorithm (sort ascending by duration, accumulate until over capacity)
    - Module-level Map for active timeout tracking (prevents duplicate notifications)
    - useMemo for pure capacity calculations in React components

key-files:
  created:
    - frontend/components/CapacitySummary.tsx
    - frontend/lib/notifications.ts
    - frontend/lib/hooks/useNotifications.ts
  modified: []

key-decisions:
  - "Hardcode 9-5 workday for MVP (per RESEARCH.md open question 1) - avoids configuration complexity"
  - "Greedy fit uses shortest-first ordering - maximizes tasks completed under time constraint"
  - "Over-capacity shown with text-orange-600 (warm orange), never text-red-600 - ADHD-safe design"
  - "25-day ceiling for setTimeout scheduling - avoids 32-bit integer overflow in browser"
  - "Module-level Map<string, number> for active notifications - auto-cancels duplicates on re-render"
  - "triggerSoftAsk() separates soft prompt from browser dialog - avoids Chrome/Firefox permission penalties"

patterns-established:
  - "SSR safety: typeof window !== 'undefined' && 'Notification' in window guards throughout"
  - "Notification permission only requested inside user-gesture callbacks, never at module level or in useEffect"
  - "Fallback chain for task duration: estimated_duration ?? effort_score ?? 30 (minutes)"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 03 Plan 02: Capacity Summary and Notification System Summary

**CapacitySummary component with scarcity framing ("X.Xh left, N of M tasks fit") and SSR-safe browser notification system with soft-ask permission flow and 1-hour-before deadline scheduling**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T23:11:34Z
- **Completed:** 2026-02-19T23:15:00Z
- **Tasks:** 2
- **Files modified:** 3 created

## Accomplishments

- CapacitySummary renders remaining work hours and task fit count using calming blue styling, with warm orange for over-capacity state - never alarming red
- Notification library implements full scheduling lifecycle: requestPermission (SSR-safe), scheduleTaskNotification (1 hour before due, with 25-day ceiling and deduplication), cancelTaskNotification
- useNotifications hook provides soft-ask pattern separating friendly UI prompt from browser permission dialog, preventing Chrome/Firefox penalties

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CapacitySummary component** - `b0595ef` (feat)
2. **Task 2: Create notification utility library and hook** - `f8d3a24` (feat)

## Files Created/Modified

- `frontend/components/CapacitySummary.tsx` - ADHD-safe capacity display: scarcity framing with hours remaining and greedy task fit count; warm orange over-capacity warning; edge cases for no tasks and post-work-hours
- `frontend/lib/notifications.ts` - Browser notification utilities: permission request, timeout-based scheduling, cancellation, and module-level Map for deduplication
- `frontend/lib/hooks/useNotifications.ts` - React hook wrapping notification library with permission state, soft-ask UI flow, and scheduling convenience method

## Decisions Made

- Hardcoded 9-5 workday for MVP - avoids configuration complexity, matches RESEARCH.md open question 1 decision
- Greedy fit algorithm sorts tasks ascending by duration (shortest first) to maximize task count under time constraint
- Over-capacity uses `text-orange-600`, not `text-red-600` - ADHD-safe, warm not alarming per design guidelines
- 25-day ceiling for setTimeout to avoid 32-bit integer overflow in browser timers
- Module-level `Map<string, number>` tracks active notifications by taskId, auto-cancelling duplicates when same task is rescheduled
- `triggerSoftAsk()` is separate from `requestPermission()` - components call triggerSoftAsk when encountering a due_date task, show UI prompt, then call requestPermission only when user clicks "Yes"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - pre-existing TypeScript errors in other files (test mocks, e2e specs, QuickCapture.tsx) did not affect new files. New files compiled cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CapacitySummary ready to be placed in dashboard/focus view alongside task lists
- useNotifications hook ready for integration in any component that renders tasks with due dates
- Notification soft-ask UX pattern established for consistent application across the urgency system
- No blockers for remaining 03-urgency-system plans

## Self-Check: PASSED

- FOUND: frontend/components/CapacitySummary.tsx
- FOUND: frontend/lib/notifications.ts
- FOUND: frontend/lib/hooks/useNotifications.ts
- FOUND: .planning/phases/03-urgency-system/03-02-SUMMARY.md
- FOUND: b0595ef (feat(03-02): create CapacitySummary component)
- FOUND: f8d3a24 (feat(03-02): create notification utility library and hook)

---
*Phase: 03-urgency-system*
*Completed: 2026-02-19*
