---
phase: 07-make-iphone-compatible-app-version
plan: "04"
subsystem: frontend/components
tags: [swipe-gestures, framer-motion, haptics, capacitor, mobile-touch, task-interaction]
dependency_graph:
  requires: [07-02, 07-03]
  provides: [swipeable-task-cards, mobile-touch-interaction]
  affects: [frontend/components/SwipeableTaskCard.tsx, frontend/app/page.tsx, frontend/app/board/page.tsx]
tech_stack:
  added: []
  patterns:
    - Framer Motion drag=x with dragDirectionLock for scroll-safe horizontal swipe
    - Dynamic import(@capacitor/haptics) to avoid SSR errors on Next.js static export
    - Mobile-specific conditional rendering via matchMedia(max-width: 768px)
    - Mobile DnD-swap pattern: replace @hello-pangea/dnd with SwipeableTaskCard on mobile
key_files:
  created:
    - frontend/components/SwipeableTaskCard.tsx
    - frontend/__tests__/components/SwipeableTaskCard.test.tsx
  modified:
    - frontend/app/page.tsx
    - frontend/app/board/page.tsx
    - frontend/lib/api.ts
decisions:
  - Mobile board: swap @hello-pangea/dnd for SwipeableTaskCard on max-width 768px (swipe-to-complete > column reorder on phone)
  - Dynamic import(@capacitor/haptics) to avoid SSR build errors (Next.js static export constraint)
  - dragDirectionLock prevents horizontal drag from blocking vertical scroll (per RESEARCH.md)
  - dragConstraints + dragElastic:0.1 creates spring-return on partial swipe without callback
metrics:
  duration: "~20 min"
  completed: "2026-03-24"
  tasks_completed: 2
  files_modified: 5
---

# Phase 7 Plan 4: SwipeableTaskCard Swipe Gestures Summary

SwipeableTaskCard Framer Motion wrapper with swipe left to complete (80px threshold, green reveal) and swipe right to edit (indigo reveal), wired into dashboard and board pages with haptic feedback.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create SwipeableTaskCard component (TDD) | 71f55d0, 62b6ebc | SwipeableTaskCard.tsx, SwipeableTaskCard.test.tsx |
| 2 | Wire SwipeableTaskCard into dashboard and board pages | 6cb1f35 | page.tsx, board/page.tsx, api.ts |

## What Was Built

### SwipeableTaskCard component (`frontend/components/SwipeableTaskCard.tsx`)

- Framer Motion `drag="x"` with `dragDirectionLock` — prevents horizontal drag from blocking vertical scroll
- Left swipe past 80px (`SWIPE_THRESHOLD`) calls `onComplete()`
- Right swipe past 80px calls `onEdit()`
- Partial swipes spring back to center: `dragConstraints={{ left: 0, right: 0 }}` + `dragElastic={0.1}`
- Green reveal layer (`#10B981`) with `CheckCircle2` icon for complete direction
- Indigo reveal layer (`#4F46E5`) with `PencilLine` icon for edit direction
- Haptic feedback via `import('@capacitor/haptics')` (dynamic import for SSR safety)
  - Medium impact on complete threshold crossing
  - Light impact on edit threshold crossing
  - Fires once per crossing, resets when back below threshold

### Dashboard page (`frontend/app/page.tsx`)

- All `PlanningTaskRow` instances in the task list wrapped with `SwipeableTaskCard`
- `onComplete` wired to `handleCompleteTask(task.id)`
- `onEdit` wired to `setEditingTask(task)` — opens existing `EditTaskModal`

### Board page (`frontend/app/board/page.tsx`)

- Added `isMobile` state via `window.matchMedia('(max-width: 768px)')` with reactive listener
- **Mobile strategy (D-12):** When `isMobile === true`, `TaskItem` renders without `Draggable` wrapper, instead using `SwipeableTaskCard` for swipe-to-complete and swipe-to-edit
- **Desktop behavior:** unchanged — `TaskItem` still uses `@hello-pangea/dnd` `Draggable` wrapper
- This trades mobile column reorder for the higher-value touch interaction on phone-sized screens

### Test coverage (`frontend/__tests__/components/SwipeableTaskCard.test.tsx`)

4 tests passing:
1. Renders children within swipeable wrapper
2. `onComplete` fires when `drag offset.x < -80`
3. `onEdit` fires when `drag offset.x > 80`
4. Neither callback fires for partial swipe (`|offset.x| < 80`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Duplicate `registerOnlineChecker` caused build failure**
- **Found during:** Task 2 build verification
- **Issue:** `frontend/lib/api.ts` had two exports of `registerOnlineChecker` — one at line 12 (active, used by offline queue) and a stub copy at line 374 from plan 07-03 that was never removed. This caused a webpack "defined multiple times" error.
- **Fix:** Removed the stub block (lines 366-380) including `_onlineChecker`, duplicate `registerOnlineChecker`, and `isAppOnline`. The active implementation at line 12 uses `getIsOnline` which is correctly wired into the request functions.
- **Files modified:** `frontend/lib/api.ts`
- **Commit:** 6cb1f35

**2. [Rule 3 - Blocking] Missing `@capacitor/haptics` package not installed in node_modules**
- **Found during:** Task 1 test execution
- **Issue:** `@capacitor/haptics` was in `package.json` but not installed (no `node_modules` in the worktree and the main workspace was also missing the package after the previous install).
- **Fix:** Ran `npm install` in the main workspace (`/home/rbrown/workspace/liminal/frontend`) to install all packages declared in `package.json`, which added 79 packages including all `@capacitor/*` packages.
- **Commit:** N/A (npm install only, not committed)

## Known Stubs

None — all swipe interactions fully wired with real callback handlers.

## Build Status

`npm run build` compiles successfully (all routes generated). An `EACCES` permission error occurs at the end when Next.js tries to clean `.next-clean/` directory owned by another process — this is an infrastructure issue pre-existing in the environment, not caused by these changes.

## Self-Check: PASSED

Files verified:
- `frontend/components/SwipeableTaskCard.tsx` — exists, exports `SwipeableTaskCard`
- `frontend/__tests__/components/SwipeableTaskCard.test.tsx` — exists, 4 tests pass
- `frontend/app/page.tsx` — contains `SwipeableTaskCard` import and usage
- `frontend/app/board/page.tsx` — contains `SwipeableTaskCard` import and `isMobile` touch strategy
- Commits: 71f55d0, 62b6ebc, 6cb1f35 — all verified in git log
