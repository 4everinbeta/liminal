---
phase: 05-forgiveness
plan: "01"
subsystem: frontend
tags: [forgiveness, working-memory, zustand, framer-motion, interruption-tracking]
dependency_graph:
  requires: []
  provides: [interruptedTaskId-store-field, isWhereYouLeftOff-ring, isInterrupted-badge, interruption-tracker-hook]
  affects: [frontend/lib/store.ts, frontend/components/TaskCard.tsx, frontend/app/page.tsx]
tech_stack:
  added: []
  patterns:
    - useRef for stable ref across renders to avoid stale closure in useEffect cleanup
    - beforeunload + direct localStorage fallback write for persistence before tab close
    - AnimatePresence spring badge for ambient enter/exit animation
    - Empty-deps useEffect cleanup as Next.js App Router route-change detector
key_files:
  created: []
  modified:
    - frontend/lib/store.ts
    - frontend/components/TaskCard.tsx
    - frontend/app/page.tsx
    - frontend/__tests__/components/TaskCard.test.tsx
decisions:
  - Use useRef to hold activeTaskId in interruption tracker — avoids false-positive cleanup on every activeTaskId change
  - Direct localStorage write in beforeunload as belt-and-suspenders — Zustand persist may defer the write
  - isWhereYouLeftOff guard excludes active task and done tasks — prevents visual noise (Pitfall 5)
  - Interrupted badge scoped to planning mode PlanningTaskRow only — focus mode already has previousTask block
metrics:
  duration: "4.5 min"
  completed_date: "2026-03-20"
  tasks_completed: 2
  files_modified: 4
---

# Phase 05 Plan 01: Forgiveness Recovery Props Summary

Wire interruptedTaskId store field with beforeunload/unmount tracker, isWhereYouLeftOff indigo ring, and PauseCircle interrupted badge into TaskCard and PlanningTaskRow.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Extend store and TaskCard with recovery props | fd7eaa4 | store.ts, TaskCard.tsx, TaskCard.test.tsx |
| 2 | Wire interruption tracker and recovery props into page.tsx | 203bb8c | page.tsx |

## What Was Built

**Store extension (store.ts):**
- Added `interruptedTaskId: string | null` to AppState interface
- Added `setInterruptedTaskId: (id: string | null) => void` to AppState interface
- Added `interruptedTaskId: null` initial value to create() body
- Added `interruptedTaskId: state.interruptedTaskId` to partialize block (persisted across reload)

**TaskCard extension (TaskCard.tsx):**
- Added `isWhereYouLeftOff?: boolean`, `isInterrupted?: boolean`, `onResumeFromInterrupt?: () => void` to TaskProps
- Added `relative` and `ring-2 ring-primary/30 ring-offset-2` conditional class to motion.div
- Added AnimatePresence-wrapped PauseCircle badge (bg-orange-50, spring animation, stiffness 300, damping 25)
- Imported `AnimatePresence` from framer-motion and `PauseCircle` from lucide-react

**PlanningTaskRow extension (page.tsx):**
- Extended props signature with `isWhereYouLeftOff`, `isInterrupted`, `onResumeFromInterrupt`
- Added `relative` and ring conditional to `<li>` className
- Added AnimatePresence PauseCircle badge inside `<li>`

**Interruption tracker (page.tsx):**
- `activeTaskIdRef` synced via useEffect to track current activeTaskId without stale closure
- `beforeunload` handler writes interruptedTaskId to Zustand store + direct localStorage fallback
- Unmount useEffect (empty deps) fires on true component unmount (route navigation)
- `handleCompleteTask` and `handleDeleteTask` both clear interruptedTaskId when matching
- PlanningTaskRow wired with `isWhereYouLeftOff` (guards: not active, not done), `isInterrupted`, `onResumeFromInterrupt` (sets active + clears interrupted)

**Tests (TaskCard.test.tsx):**
- 4 new test cases: ring present/absent for isWhereYouLeftOff true/false, badge present/absent for isInterrupted true/false
- All 67 tests pass (14 test files)

## Verification Results

- `npx vitest run __tests__/components/TaskCard.test.tsx` — 12/12 pass
- `npx vitest run` (full suite) — 67/67 pass
- `npx tsc --noEmit` — zero errors in modified files (store.ts, TaskCard.tsx, page.tsx)
- `npx next build` — blocked by pre-existing root-owned `.next-clean/server` directory (EACCES); confirmed pre-existing, not caused by this plan
- `grep -n 'interruptedTaskId' frontend/lib/store.ts` — field in interface, create body, and partialize
- `grep -n 'isWhereYouLeftOff' frontend/components/TaskCard.tsx frontend/app/page.tsx` — prop defined and wired
- `grep -n 'beforeunload' frontend/app/page.tsx` — interruption tracker registered

## Deviations from Plan

None — plan executed exactly as written. The `next build` failure is a pre-existing infrastructure issue (root-owned `.next-clean/server` directory); all TypeScript checks on modified files pass cleanly.

## Known Stubs

None — all features are fully wired. No placeholder data, hardcoded empty values, or TODOs in modified files.

## Self-Check: PASSED
