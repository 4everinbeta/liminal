---
phase: 08-ui-polish
plan: "02"
subsystem: frontend
tags: [capacity, focus-mode, offline-queue, hooks, tdd]
dependency_graph:
  requires: ["08-01"]
  provides: [useCapacity-hook, CapacitySummaryStrip, restoreTask-offline-guard]
  affects: [frontend/components, frontend/lib/api, frontend/app/page]
tech_stack:
  added: []
  patterns: [shared-hook-extraction, offline-guard-pattern, tdd-red-green]
key_files:
  created:
    - frontend/components/useCapacity.ts
    - frontend/components/CapacitySummaryStrip.tsx
    - frontend/__tests__/components/CapacitySummaryStrip.test.tsx
  modified:
    - frontend/components/CapacitySummary.tsx
    - frontend/app/page.tsx
    - frontend/lib/offlineQueue.ts
    - frontend/lib/api.ts
    - frontend/__tests__/lib/api.test.ts
decisions:
  - "Extracted useCapacity hook as single source of truth for capacity calculation shared between CapacitySummary and CapacitySummaryStrip"
  - "CapacitySummaryStrip placed outside activeTask ternary in Focus mode so it shows in both active-task and empty states (D-07)"
  - "restoreTask offline guard follows identical pattern to createTask/updateTask/deleteTask — no new pattern needed"
  - "Fixed test date comparison by using full ISO timestamp instead of date-only string to avoid UTC timezone parsing issues"
  - "Fixed replayMutation test by setting a fake localStorage token since fetchWithAuth requires auth by default"
metrics:
  duration_seconds: 277
  completed_date: "2026-04-03"
  tasks_completed: 1
  files_changed: 8
---

# Phase 08 Plan 02: Capacity Strip for Focus Mode + restoreTask Offline Guard Summary

**One-liner:** Shared `useCapacity` hook powers a new compact `CapacitySummaryStrip` shown in Focus mode, and `restoreTask` now enqueues offline mutations matching the existing offline-guard pattern.

## What Was Built

### useCapacity Hook (`frontend/components/useCapacity.ts`)
Extracted the `useMemo` capacity calculation logic from `CapacitySummary.tsx` into a standalone hook. Exports `CapacityData` interface with `{ hoursRemaining, todayTasks, tasksFit, totalTaskHours, isOverCapacity, isAfterWork }`. This is now the single source of truth for capacity calculation — both the full card and the compact strip call `useCapacity(tasks)`.

### CapacitySummaryStrip Component (`frontend/components/CapacitySummaryStrip.tsx`)
New compact one-line component showing "Xh left · N/M tasks fit" using the blue palette. Renders in three states:
- During workday with today tasks: `"8.0h left · 2/3 tasks fit"`
- During workday with no today tasks: `"8.0h left"` 
- After 5pm: `"Workday ended"`

### Focus Mode Integration (`frontend/app/page.tsx`)
`CapacitySummaryStrip` is rendered OUTSIDE the `{activeTask ? ... : ...}` ternary so it appears in both the active-task state and the empty-state, per decision D-07.

### offlineQueue.ts Type Extension
Added `'restoreTask'` to the `MutationType` union. TypeScript now enforces exhaustive handling of the new type.

### restoreTask Offline Guard (`frontend/lib/api.ts`)
Added offline guard to `restoreTask` following the exact same pattern as `createTask`, `updateTask`, and `deleteTask`:
```ts
if (!getIsOnline()) {
  await enqueueOfflineMutation({ type: 'restoreTask', taskId, payload: {} })
  return { id: taskId } as Task
}
```

### replayMutation Case
Added `case 'restoreTask'` to the `replayMutation` switch statement, POSTing to `/tasks/{taskId}/restore` when the mutation is replayed on reconnect.

## Tests Added

- `frontend/__tests__/components/CapacitySummaryStrip.test.tsx` — 3 tests covering hours+tasks display, empty state, after-work state
- `frontend/__tests__/lib/api.test.ts` — 3 new tests: restoreTask offline enqueue, optimistic stub return, replayMutation POST

**Test count:** 95 passed (was 89, added 6 new tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed date-only string UTC timezone issue in CapacitySummaryStrip test**
- **Found during:** Task 1 (RED phase)
- **Issue:** `due_date: '2026-04-03'` (date-only) is parsed as UTC midnight by `new Date()`, while `vi.setSystemTime` uses local time. `toDateString()` comparison failed because UTC date ≠ local date.
- **Fix:** Changed test to use full ISO timestamp (`mockDate.toISOString()`) so both sides of the `toDateString()` comparison use the same timezone.
- **Files modified:** `frontend/__tests__/components/CapacitySummaryStrip.test.tsx`
- **Commit:** 5f8f41d

**2. [Rule 2 - Missing auth] Added fake localStorage token for replayMutation test**
- **Found during:** Task 1 (RED/GREEN phase)
- **Issue:** `replayMutation` calls `request()` which calls `fetchWithAuth()` which checks for a token. Test had no token so "Not authenticated" error was thrown before `fetch` was called.
- **Fix:** Added `localStorage.setItem('liminal_token', 'test-token')` in `beforeEach` and cleanup in `afterEach` for the `replayMutation restoreTask` describe block.
- **Files modified:** `frontend/__tests__/lib/api.test.ts`
- **Commit:** 5f8f41d

## Known Stubs

None. All data flows are wired:
- `CapacitySummaryStrip` receives real `tasks` state from `page.tsx`
- `useCapacity` calculates from real task data
- Offline mutations are enqueued to real Dexie.js IndexedDB queue

## Self-Check: PASSED

All files found:
- FOUND: frontend/components/useCapacity.ts
- FOUND: frontend/components/CapacitySummaryStrip.tsx
- FOUND: frontend/__tests__/components/CapacitySummaryStrip.test.tsx
- FOUND: .planning/phases/08-ui-polish/08-02-SUMMARY.md

All commits found:
- FOUND: 2bb2052 (TDD RED - failing tests)
- FOUND: 5f8f41d (GREEN - implementation)
