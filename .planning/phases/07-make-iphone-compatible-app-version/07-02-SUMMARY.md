---
phase: 07-make-iphone-compatible-app-version
plan: 02
subsystem: frontend
tags: [offline-queue, dexie, indexeddb, capacitor, network, zustand, framer-motion]
dependency_graph:
  requires: [07-01]
  provides: [offline-mutation-queue, network-status-hook, offline-banner]
  affects: [frontend/lib/api.ts, frontend/lib/store.ts, frontend/components/]
tech_stack:
  added: [dexie@4.3.0, fake-indexeddb (dev)]
  patterns: [IndexedDB mutation queue, Capacitor Network plugin, AnimatePresence conditional banner]
key_files:
  created:
    - frontend/lib/offlineQueue.ts
    - frontend/lib/hooks/useNetworkStatus.ts
    - frontend/components/OfflineBanner.tsx
    - frontend/__tests__/lib/offlineQueue.test.ts
    - frontend/__tests__/components/OfflineBanner.test.tsx
  modified:
    - frontend/lib/store.ts
    - frontend/lib/api.ts
    - frontend/package.json
decisions:
  - Use fake-indexeddb for Dexie unit testing (no browser environment needed in Vitest/jsdom)
  - Use unknown intermediate cast (data as unknown as Record<string,unknown>) to satisfy TypeScript when enqueuing TaskCreate payloads
  - useNetworkStatus uses dynamic import for @capacitor/network to avoid SSR errors (Next.js pre-renders at build time)
  - registerOnlineChecker pattern avoids circular imports between api.ts and store.ts
  - partialize whitelist in store.ts already excludes isOnline (not listed = not persisted)
metrics:
  duration: "3m 44s"
  completed: "2026-03-22"
  tasks: 3
  files: 8
---

# Phase 07 Plan 02: Offline Mutation Queue and Network Status Summary

**One-liner:** Dexie.js IndexedDB queue with enqueue/flush/replay, Zustand isOnline extension, Capacitor Network hook with browser fallback, and amber OfflineBanner with AnimatePresence.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Dexie offline queue schema and store extension | b345bfd | offlineQueue.ts, store.ts, offlineQueue.test.ts, package.json |
| 2 | Wrap api.ts mutating calls with offline detection and network hook | 7652d4a | api.ts, useNetworkStatus.ts |
| 3 | Create OfflineBanner component | 2465837 | OfflineBanner.tsx, OfflineBanner.test.tsx |

## What Was Built

### frontend/lib/offlineQueue.ts
- `OfflineQueueDB` class extending Dexie with `mutations` table (`++id, type, timestamp`)
- `enqueueOfflineMutation` — adds mutation with auto-incremented id, current timestamp, retries=0
- `flushOfflineQueue` — replays all mutations in timestamp order; deletes on success, increments retries on failure; continues processing after individual failures
- `getQueueLength` — utility for queue depth monitoring
- Exports: `offlineQueueDB`, `enqueueOfflineMutation`, `flushOfflineQueue`, `getQueueLength`, `QueuedMutation`, `MutationType`

### frontend/lib/store.ts (extended)
- Added `isOnline: boolean` to `AppState` interface
- Added `setIsOnline: (online: boolean) => void` to interface and implementation
- `isOnline` defaults to `true` and is intentionally excluded from the `partialize` whitelist (real-time state, not persisted)

### frontend/lib/api.ts (extended)
- Added `registerOnlineChecker` export — called by MobileProviders (plan 07-03) to wire store state without circular imports
- `getIsOnline` closure defaults to `navigator.onLine` before registration
- `createTask`, `updateTask`, `deleteTask` — all wrapped with `if (!getIsOnline())` guard that enqueues mutation and returns optimistic result
- `replayMutation` export — switch-case over `MutationType` to replay against server

### frontend/lib/hooks/useNetworkStatus.ts
- React hook with `useEffect`
- Dynamic imports `@capacitor/network` to avoid SSR errors during `next build`
- On Capacitor success: reads initial status, adds `networkStatusChange` listener, flushes queue on reconnect via `flushOfflineQueue(replayMutation)`
- On Capacitor failure (browser fallback): wires `window.addEventListener('online'/'offline')` events
- Cleans up listener on unmount

### frontend/components/OfflineBanner.tsx
- Reads `isOnline` from Zustand store via `useAppStore` selector
- `AnimatePresence` wraps conditional render for mount/unmount animations
- Framer Motion `motion.div`: `initial={{ y: -36, opacity: 0 }}`, `animate={{ y: 0, opacity: 1 }}`, `exit={{ y: -36, opacity: 0 }}`, `transition={{ duration: 0.2 }}`
- Positioned fixed at `top: env(safe-area-inset-top, 0px)`, height 36px, z-50
- Colors: `backgroundColor: '#FFFBEB'` (amber-50), `color: '#B45309'` (amber-700)
- Copy: "You're offline. Changes will sync when reconnected."
- `WifiOff` icon from lucide-react

## Test Results

- `npm test -- --run offlineQueue`: 5/5 passing
  - enqueue adds with id, timestamp, retries=0
  - flush replays in timestamp order
  - flush deletes on success
  - flush increments retries on failure (no delete)
  - flush continues processing all items mid-queue failure
- `npm test -- --run OfflineBanner`: 2/2 passing
  - renders when isOnline === false
  - does not render when isOnline === true

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing validation] TypeScript cast precision for enqueueOfflineMutation**
- **Found during:** Task 2
- **Issue:** `data as Record<string, unknown>` produced a TypeScript error because `TaskCreate` doesn't have an index signature
- **Fix:** Used `data as unknown as Record<string, unknown>` double-cast pattern (safe for payload storage)
- **Files modified:** frontend/lib/api.ts

None — plan executed as specified except for the TypeScript cast fix above.

## Known Stubs

None. All exported functions are fully implemented and wired end-to-end. The `registerOnlineChecker` function defaults to `navigator.onLine` until MobileProviders (plan 07-03) calls it — this is intentional and documented in the plan.

## Self-Check: PASSED
