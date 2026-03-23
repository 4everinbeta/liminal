---
phase: 07-make-iphone-compatible-app-version
plan: "03"
subsystem: mobile-navigation
tags: [ios, bottom-tab-bar, safe-area, viewport-fit, mobile-navigation, offline-banner]
dependency_graph:
  requires: [07-01]
  provides: [BottomTabBar, MobileProviders, OfflineBanner-stub, useNetworkStatus-stub, safe-area-css, viewport-fit-cover]
  affects:
    - frontend/components/BottomTabBar.tsx
    - frontend/app/layout.tsx
    - frontend/app/globals.css
    - frontend/components/FloatingActionButton.tsx
    - frontend/components/MobileProviders.tsx
    - frontend/components/OfflineBanner.tsx
    - frontend/lib/hooks/useNetworkStatus.ts
    - frontend/lib/store.ts
    - frontend/lib/api.ts
tech_stack:
  added: []
  patterns:
    - "BottomTabBar uses md:hidden for mobile-only display"
    - "Safe area insets via env(safe-area-inset-*) with CSS custom properties"
    - "viewport-fit=cover in Next.js metadata.viewport string"
    - "MobileProviders client wrapper for hooks that cannot run in Server Components"
    - "registerOnlineChecker pattern in api.ts for injecting network checker"
key_files:
  created:
    - frontend/components/BottomTabBar.tsx
    - frontend/__tests__/components/BottomTabBar.test.tsx
    - frontend/components/MobileProviders.tsx
    - frontend/components/OfflineBanner.tsx
    - frontend/lib/hooks/useNetworkStatus.ts
  modified:
    - frontend/app/layout.tsx
    - frontend/app/globals.css
    - frontend/components/FloatingActionButton.tsx
    - frontend/lib/store.ts
    - frontend/lib/api.ts
    - frontend/components/QuickCaptureModal.tsx
decisions:
  - "Used LayoutGrid icon instead of Grid3X3 — Grid3X3 is not available in this version of lucide-react (only Grid and LayoutGrid exist)"
  - "Used metadata.viewport string field instead of separate viewport export — Next.js 13.4.12 Viewport type not exported from next package"
  - "Created stub files for useNetworkStatus, OfflineBanner, isOnline/registerOnlineChecker to allow 07-03 to compile while 07-02 runs in parallel in wave 2"
  - "Added text-base to QuickCaptureModal input to prevent iOS auto-zoom (16px minimum per UI-SPEC)"
metrics:
  duration_seconds: 480
  completed_date: "2026-03-22"
  tasks_completed: 2
  files_modified: 11
---

# Phase 7 Plan 3: Mobile Navigation Shell Summary

**One-liner:** iOS-style bottom tab bar with 4 tabs and center capture button, safe area CSS variables, viewport-fit=cover, FAB hidden on mobile, and client-side MobileProviders wrapper for network status hooks.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create BottomTabBar component (TDD) | 8129104 | frontend/components/BottomTabBar.tsx, frontend/__tests__/components/BottomTabBar.test.tsx |
| 2 | Update layout, globals.css, FAB, MobileProviders | 26b68ce | frontend/app/layout.tsx, frontend/app/globals.css, frontend/components/FloatingActionButton.tsx, frontend/components/MobileProviders.tsx, frontend/components/OfflineBanner.tsx, frontend/lib/hooks/useNetworkStatus.ts, frontend/lib/store.ts, frontend/lib/api.ts, frontend/components/QuickCaptureModal.tsx |

## What Was Built

### Task 1: BottomTabBar Component (TDD)

Created `frontend/components/BottomTabBar.tsx` with full iOS-style navigation:
- 4 tabs: Today (Home icon), Board (LayoutGrid icon), Center Plus button, More (disabled)
- Center Plus button: 56px circle, accent color `#4F46E5`, `aria-label="Capture Task"`, calls `openQuickCapture` from Zustand store
- Active tab highlighted with `#4F46E5`, inactive with `#6B7280`
- `env(safe-area-inset-bottom, 0px)` padding for home indicator clearance
- `md:hidden` class — mobile only, desktop unaffected
- Hides on auth pages (`/login`, `/auth/callback`, `/register`)
- Minimum 44px touch targets throughout

TDD process: RED test (import failure), GREEN implementation, all 4 tests pass.

### Task 2: Layout, Safe Area, and Mobile Integration

**globals.css:** Added `:root` block with CSS custom properties `--sat`, `--sab`, `--sal`, `--sar` using `env(safe-area-inset-*)`.

**layout.tsx:**
- `viewport-fit=cover` in `metadata.viewport` string
- Imports and renders `<BottomTabBar />`, `<OfflineBanner />`, `<MobileProviders />`
- `main` element: `pb-[calc(56px+env(safe-area-inset-bottom,0px))] md:pb-0` for precise bottom clearance
- `<MobileProviders />` placed outside `<AuthGate>` for early network detection

**FloatingActionButton:** `hidden md:flex` — replaced by center tab on mobile.

**MobileProviders:** Client wrapper calling `useNetworkStatus()` and `registerOnlineChecker(() => useAppStore.getState().isOnline)`.

**Stubs (overwritten by plan 07-02):**
- `useNetworkStatus.ts` — no-op until 07-02 wires Capacitor Network events
- `OfflineBanner.tsx` — basic isOnline check without Framer Motion animation
- `isOnline/setIsOnline` in store.ts — defaults to `true`
- `registerOnlineChecker/isAppOnline` in api.ts — passthrough stubs

**QuickCaptureModal:** Added `text-base` class to input to prevent iOS auto-zoom (16px minimum per UI-SPEC rule).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used `LayoutGrid` instead of `Grid3X3` icon**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** `Grid3X3` import from `lucide-react` resolved to `undefined` — this icon name doesn't exist in the installed version. Only `Grid` and `LayoutGrid` are available.
- **Fix:** Replaced `Grid3X3` with `LayoutGrid` (equivalent 3-column grid icon). Plan spec references `Grid3X3` but the visual is identical.
- **Files modified:** `frontend/components/BottomTabBar.tsx`
- **Commit:** 8129104

**2. [Rule 3 - Blocking] Used `metadata.viewport` string instead of separate Viewport export**
- **Found during:** Task 2
- **Issue:** `Viewport` type is not exported from the `next` package in Next.js 13.4.12. The plan suggested `export const viewport: Viewport = { ... }` but this API doesn't exist in this version.
- **Fix:** Used the `metadata.viewport` string field which is the correct API for 13.4.12: `viewport: 'width=device-width, initial-scale=1, viewport-fit=cover'`
- **Files modified:** `frontend/app/layout.tsx`
- **Commit:** 26b68ce

**3. [Rule 3 - Blocking] Created stubs for 07-02 dependencies to enable parallel wave execution**
- **Found during:** Task 2
- **Issue:** `useNetworkStatus`, `registerOnlineChecker`, `isOnline`/`setIsOnline` are created by plan 07-02 which runs in parallel (wave 2). Without them, `MobileProviders.tsx` and `OfflineBanner.tsx` would fail to compile.
- **Fix:** Created minimal stubs for all missing symbols. Plan 07-02 will overwrite these with full Capacitor-wired implementations.
- **Files modified:** `frontend/lib/hooks/useNetworkStatus.ts` (new stub), `frontend/components/OfflineBanner.tsx` (new stub), `frontend/lib/store.ts` (isOnline/setIsOnline added), `frontend/lib/api.ts` (registerOnlineChecker/isAppOnline added)
- **Commit:** 26b68ce

**4. [Rule 2 - Missing Critical] Added `text-base` to QuickCaptureModal input**
- **Found during:** Task 2 (Step 4 — input font size check)
- **Issue:** QuickCaptureModal `<input>` had no explicit text size class, defaulting to browser default (~14px on some browsers). iOS auto-zooms inputs below 16px, breaking the mobile layout.
- **Fix:** Added `text-base` (16px) class to the input element.
- **Files modified:** `frontend/components/QuickCaptureModal.tsx`
- **Commit:** 26b68ce

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| useNetworkStatus (no-op) | frontend/lib/hooks/useNetworkStatus.ts | 1-13 | Full implementation (Capacitor Network events) provided by plan 07-02 |
| OfflineBanner (no animation) | frontend/components/OfflineBanner.tsx | 1-35 | Full implementation (Framer Motion slide) provided by plan 07-02 |
| isOnline state in store | frontend/lib/store.ts | appended | Defaults to `true`; plan 07-02 wires Capacitor Network plugin |
| registerOnlineChecker in api.ts | frontend/lib/api.ts | appended | Passthrough stub; plan 07-02 uses this for offline mutation queuing |

These stubs do NOT prevent this plan's goal — mobile navigation chrome is complete and functional. The offline indicator will be non-functional until 07-02 completes, which is expected behavior for wave 2 parallel execution.

## Self-Check

### Checking created files exist:
- frontend/components/BottomTabBar.tsx — EXISTS (exports BottomTabBar, contains aria-label="Capture Task", env(safe-area-inset-bottom, md:hidden, openQuickCapture, Home, LayoutGrid, Plus, MoreHorizontal)
- frontend/__tests__/components/BottomTabBar.test.tsx — EXISTS (4 tests, all passing)
- frontend/components/MobileProviders.tsx — EXISTS (exports MobileProviders, calls useNetworkStatus and registerOnlineChecker)
- frontend/components/OfflineBanner.tsx — EXISTS (exports OfflineBanner, stub)
- frontend/lib/hooks/useNetworkStatus.ts — EXISTS (exports useNetworkStatus, stub)

### Checking commits exist:
- 8129104 — feat(07-03): create BottomTabBar component with 4 tabs and center capture button
- 26b68ce — feat(07-03): update layout with viewport-fit, safe area, BottomTabBar, OfflineBanner, MobileProviders

## Self-Check: PASSED

Both commits verified. All required files exist and contain the specified content per acceptance criteria.
