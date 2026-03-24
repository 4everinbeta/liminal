---
phase: 07-make-iphone-compatible-app-version
plan: 05
subsystem: frontend/mobile-qa
tags: [testing, build, mobile, ios, capacitor]
status: partial — awaiting human checkpoint (Task 2)

dependency_graph:
  requires: [07-04]
  provides: [verified-test-suite, verified-static-export]
  affects: [frontend/components/TaskCard, frontend/components/EditTaskModal, frontend/components/QuickCapture, frontend/components/ChatInterface]

tech_stack:
  added: []
  patterns:
    - vi.stubEnv() for process.env mocking in Vitest (replaces fetch mock anti-pattern)
    - md:hover: prefix on mobile-rendered components for hover guard constraint

key_files:
  created: []
  modified:
    - frontend/__tests__/lib/auth.test.ts
    - frontend/__tests__/components/TaskCard.test.tsx
    - frontend/components/TaskCard.tsx
    - frontend/components/EditTaskModal.tsx
    - frontend/components/QuickCapture.tsx
    - frontend/components/ChatInterface.tsx

decisions:
  - Use vi.stubEnv() to mock NEXT_PUBLIC_ env vars in auth tests — auth.ts reads process.env, not fetch
  - Guard hover: classes on TaskCard with md:hover: — mobile devices lack hover capability
  - Upgrade text-sm to text-base on all <input>/<textarea>/<select> — iOS zooms in on <16px inputs

metrics:
  duration_seconds: 736
  completed_date: "2026-03-24"
  tasks_completed: 1
  tasks_total: 2
  files_modified: 6
---

# Phase 7 Plan 5: Test Suite, Build Verification, and Human Mobile Checkpoint Summary

**One-liner:** Fixed 3 pre-existing test failures, enforced mobile CSS constraints (hover guards + 16px input font sizes), and verified 89/89 tests pass with static export build succeeding.

## Automated Tasks Completed

### Task 1: Run full test suite and static export build

**Status:** Complete — commit `a8a8745`

**Test result:** 89/89 tests pass across 19 test files.

**Build result:** Static export succeeded — 7 routes compiled to `/frontend/.next-build/`, `index.html` generated.

**CSS constraints verified:**
- Hover guards: All `hover:` classes on TaskCard now use `md:hover:` prefix
- BottomTabBar, SwipeableTaskCard, OfflineBanner: No unguarded hover classes found
- Input font sizes: All `<input>`, `<textarea>`, `<select>` in mobile-used components updated to `text-base` (16px minimum)

**Cap sync:** Skipped — `ios/` directory not present (expected; Xcode steps are out-of-scope for this environment).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] auth.test.ts tests failing due to wrong mock strategy**
- **Found during:** Task 1 (test run)
- **Issue:** 3 tests used `mockConfigFetch` (stubbing `fetch`) but `auth.ts` reads from `process.env`, not `fetch`. Tests always resolved with empty OIDC config, causing `getUserManager()` to return `null`, failing login/logout.
- **Fix:** Replaced `mockConfigFetch` with `vi.stubEnv()` calls for `NEXT_PUBLIC_OIDC_AUTHORITY` and `NEXT_PUBLIC_OIDC_CLIENT_ID`. Removed unused `AuthConfig` type and `baseConfig` constant from test file.
- **Files modified:** `frontend/__tests__/lib/auth.test.ts`
- **Commit:** a8a8745

**2. [Rule 1 - Bug] TaskCard.test.tsx assertion broken after hover guard fix**
- **Found during:** Task 1 (post-CSS-fix test run)
- **Issue:** Test queried `.hover:shadow-md` class, but the class was changed to `md:hover:shadow-md` per mobile constraint.
- **Fix:** Updated querySelector to `.md\\:hover\\:shadow-md`.
- **Files modified:** `frontend/__tests__/components/TaskCard.test.tsx`
- **Commit:** a8a8745

**3. [Rule 2 - Missing critical functionality] Unguarded hover: on TaskCard**
- **Found during:** Task 1 Step 4
- **Issue:** `TaskCard` is rendered on mobile but had raw `hover:shadow-md` and `hover:text-secondary` — hover CSS is a no-op on touch devices but per UI-SPEC constraint 1, all hover utilities must use `md:hover:` guard.
- **Fix:** Prefixed both classes with `md:`.
- **Files modified:** `frontend/components/TaskCard.tsx`
- **Commit:** a8a8745

**4. [Rule 2 - Missing critical functionality] text-sm on input/textarea/select elements**
- **Found during:** Task 1 Step 5
- **Issue:** Multiple `<input>`, `<textarea>`, and `<select>` elements used `text-sm` (14px). iOS Safari auto-zooms when focused if font size < 16px, breaking the mobile UX.
- **Fix:** Changed `text-sm` to `text-base` on all form elements in: `EditTaskModal`, `QuickCapture` (EditableFields, theme inputs, update task input), `ChatInterface`.
- **Files modified:** `frontend/components/EditTaskModal.tsx`, `frontend/components/QuickCapture.tsx`, `frontend/components/ChatInterface.tsx`
- **Commit:** a8a8745

**5. [Rule 3 - Blocking] .next-clean/ has root-owned files blocking build**
- **Found during:** Task 1 Step 2
- **Issue:** `npm run build` failed with `EACCES: permission denied` on `.next-clean/server/` (owned by root).
- **Fix:** Used `NEXT_DIST_DIR=.next-build` env override (supported by `next.config.js`) to write to a user-owned directory. Build succeeded.
- **Files modified:** None (env override, not code change)
- **Commit:** a8a8745

## Awaiting

Task 2 is a human-verify checkpoint. The human must verify the mobile UI in Chrome DevTools, iOS Simulator, or a physical device.

## Known Stubs

None — all mobile components are fully wired (BottomTabBar, SwipeableTaskCard, OfflineBanner, offline mutation queue).

## Self-Check: PASSED

- [x] `frontend/__tests__/lib/auth.test.ts` — modified, committed a8a8745
- [x] `frontend/__tests__/components/TaskCard.test.tsx` — modified, committed a8a8745
- [x] `frontend/components/TaskCard.tsx` — modified, committed a8a8745
- [x] `frontend/components/EditTaskModal.tsx` — modified, committed a8a8745
- [x] `frontend/components/QuickCapture.tsx` — modified, committed a8a8745
- [x] `frontend/components/ChatInterface.tsx` — modified, committed a8a8745
- [x] Commit a8a8745 exists in git log
