# Phase 7: Make iPhone Compatible App Version - Research

**Researched:** 2026-03-22
**Domain:** Capacitor iOS / Next.js static export / Offline mutation queue / iOS touch patterns
**Confidence:** HIGH (core stack verified against official docs and npm registry)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use Capacitor to wrap the existing Next.js web build into an iOS native app. No new frontend framework.
- **D-02:** Distribution target is local dev / TestFlight only. No App Store submission in this phase.
- **D-03:** Replace top header navigation with a bottom tab bar — standard iOS thumb-reachable pattern. Tabs: Dashboard, Board, (center: Quick Capture), and settings/profile entry.
- **D-04:** Quick capture moves from a floating FAB to a center tab bar button (à la Instagram/Reminders).
- **D-05:** Safe area insets must be applied using `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` CSS variables.
- **D-06:** Task cards support swipe left to complete, swipe right for detail/edit.
- **D-07:** Full offline mode with mutation sync queue.
- **D-08:** Mutations queued offline: task completion, task creation, task updates, task deletion (all four).
- **D-09:** Conflict resolution: last-write wins. On reconnect, queued mutations are replayed in order.
- **D-10:** Offline state is visually indicated (banner or indicator).
- **D-11:** Full feature parity — all ADHD-optimization features from prior phases included.
- **D-12:** Kanban board view is included as a tab in the bottom navigation bar with touch-friendly interaction.

### Claude's Discretion

- Exact tab bar icon choices and labels
- Whether to use a Capacitor community plugin for swipe gestures or implement custom touch handlers
- IndexedDB library selection for the offline mutation queue (e.g., Dexie.js vs raw IndexedDB API)
- Specific Capacitor plugins needed (Network, Haptics, StatusBar, etc.)
- Whether to add haptic feedback on task completion
- Next.js static export config (`output: 'export'`) vs dynamic server rendering trade-offs

### Deferred Ideas (OUT OF SCOPE)

- App Store submission — explicitly deferred.
- Push notifications via Capacitor's PushNotifications plugin.
- Android version — iOS/iPhone only.
- Deep linking.
</user_constraints>

---

## Summary

Capacitor 8 is the current stable version (published 2026-03-20). It wraps any static web build in a WKWebView and provides native iOS bridge APIs. Capacitor requires the Next.js app to be built with `output: 'export'` which generates a fully static `out/` directory — this is the `webDir` Capacitor reads. The existing codebase uses Next.js 13.4.12 which fully supports App Router static export.

**Critical blocker discovered:** The app currently has a dynamic API route at `frontend/app/api/config/route.ts` with `export const dynamic = 'force-dynamic'`. This route is used by `lib/auth.ts` to fetch OIDC configuration at runtime. A static export build will fail unless this route is removed or the auth config is sourced differently (environment variables baked in at build time, or config hardcoded for mobile where auth may be disabled).

The offline mutation queue is best implemented with **Dexie.js 4.x** (published 2026-03-18, current: 4.3.0) rather than raw IndexedDB. Dexie provides a typed, promise-based schema with auto-incrementing primary keys that maps naturally to a `QueuedMutation` table. The WebSocket manager (`WebSocketManager.tsx`) connects to a backend WebSocket — this will still work fine in static export mode since it's a client-side connection; the static export restriction only applies to server-side API routes.

**Primary recommendation:** Add `output: 'export'` and `images: { unoptimized: true }` to `next.config.js`, resolve the `/api/config` dynamic route conflict, scaffold the Capacitor `ios/` project, then build the three mobile-specific layers in sequence: (1) layout shell with bottom tab bar + safe areas, (2) offline mutation queue with Dexie.js + Network plugin, (3) swipe gesture task cards with Framer Motion.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@capacitor/core` | 8.2.0 | WKWebView bridge, plugin API | Official Capacitor SDK |
| `@capacitor/ios` | 8.2.0 | iOS platform target | Required for `npx cap add ios` |
| `@capacitor/cli` | 8.2.0 | Build tooling, `cap sync/open/run` | Official CLI |
| `@capacitor/network` | 8.0.1 | Online/offline detection | Official plugin — replaces `navigator.onLine` |
| `@capacitor/haptics` | 8.0.1 | Native haptic feedback on task completion | Official plugin |
| `@capacitor/status-bar` | 8.0.1 | Status bar appearance (light/dark) | Official plugin |
| `dexie` | 4.3.0 | IndexedDB wrapper for offline mutation queue | Minimalistic typed API; used by WhatsApp Web, ChatGPT |

**Version verification:** All versions confirmed against npm registry 2026-03-22. `@capacitor/*` packages published 2026-03-20. `dexie` published 2026-03-18.

### Supporting (already installed — no new installs needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `framer-motion` | 10.12.16 (installed) | Swipe gesture animation on task cards | Already used in project — use `drag="x"` + `dragDirectionLock` |
| `lucide-react` | 0.263.1 (installed) | Tab bar icons | Already used throughout — Home, Grid3X3, Plus, MoreHorizontal |
| `zustand` | 4.3.9 (installed) | Offline queue state, `isOnline` flag | Store already used — extend with `offlineQueue` slice |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dexie.js | Raw IndexedDB | Raw IndexedDB requires verbose open/upgrade/transaction boilerplate; Dexie provides typed tables, `++id` auto-increment, and clean async API |
| Dexie.js | Zustand persist + localStorage | localStorage has 5-10MB limit; IndexedDB via Dexie handles unlimited queue depth; Dexie survives page reload without serialization issues |
| `@capacitor/network` | `navigator.onLine` + `window.addEventListener('online')` | `navigator.onLine` is unreliable (returns true even on captive portals). Capacitor Network plugin uses native iOS reachability API — significantly more accurate |
| Framer Motion `drag="x"` | `@capacitor-community/touchscreen-gesture` | Framer Motion is already installed and the UI-SPEC mandates it. Community plugin adds a dependency for less control. Framer Motion's `dragDirectionLock` solves the iOS scroll conflict. |

**Installation (new packages only):**
```bash
cd frontend && npm install @capacitor/core @capacitor/ios @capacitor/network @capacitor/haptics @capacitor/status-bar dexie
npm install -D @capacitor/cli
```

---

## Architecture Patterns

### Recommended Project Structure
```
/                               # repo root — Capacitor lives here (not inside frontend/)
├── capacitor.config.ts         # Capacitor config pointing to frontend/out
├── ios/                        # generated by `npx cap add ios` — Xcode project
├── frontend/
│   ├── next.config.js          # ADD: output: 'export', images: { unoptimized: true }
│   ├── lib/
│   │   ├── offlineQueue.ts     # NEW: Dexie schema + queue helpers
│   │   ├── store.ts            # EXTEND: add isOnline, offlineQueue state
│   │   └── api.ts              # EXTEND: wrap mutating calls with offline detection
│   ├── components/
│   │   ├── BottomTabBar.tsx    # NEW: iOS bottom nav (Dashboard, Board, +, More)
│   │   ├── SwipeableTaskCard.tsx  # NEW: Framer Motion drag="x" wrapper
│   │   └── OfflineBanner.tsx   # NEW: amber banner when isOnline === false
│   └── app/
│       └── layout.tsx          # MODIFY: viewport-fit=cover, safe area CSS, BottomTabBar
```

### Pattern 1: Capacitor Config (capacitor.config.ts at repo root)
**What:** TypeScript config file declaring app identity and webDir location.
**When to use:** Created once with `npx cap init`, then manually set `webDir` to `frontend/out`.

```typescript
// Source: https://capacitorjs.com/docs/next/getting-started (Capacitor 8 docs)
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.liminal.adhd',
  appName: 'Liminal',
  webDir: 'frontend/out',  // Next.js static export lands here
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#F3F4F6',
    },
  },
};

export default config;
```

### Pattern 2: Next.js Static Export Config
**What:** Add `output: 'export'` to `next.config.js` so `next build` outputs static files.
**When to use:** Required for Capacitor. Enables `npx cap sync` to pick up fresh builds.

```javascript
// Source: https://nextjs.org/docs/app/guides/static-exports (Next.js 16.2.1 docs, updated 2026-03-03)
const nextConfig = {
  output: 'export',             // generates /out folder
  distDir: process.env.NEXT_DIST_DIR || '.next-clean',
  images: {
    unoptimized: true,          // required — no server for image optimization
  },
  transpilePackages: ['chroma-js'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
}
```

**CRITICAL:** The existing `frontend/app/api/config/route.ts` uses `export const dynamic = 'force-dynamic'` — this is **incompatible** with static export. The static export build will throw an error. See Pitfall 1 below for the fix.

### Pattern 3: Offline Mutation Queue with Dexie.js
**What:** IndexedDB-backed queue storing pending API mutations when offline; replayed in-order on reconnect.
**When to use:** Wrap all mutating calls in `lib/api.ts`.

```typescript
// Source: https://dexie.org/docs/Tutorial/React (Dexie 4.x docs)
import Dexie, { Table } from 'dexie';

export type MutationType = 'createTask' | 'updateTask' | 'deleteTask' | 'completeTask';

export interface QueuedMutation {
  id?: number;            // auto-incremented by Dexie
  type: MutationType;
  taskId?: string;        // for update/delete/complete
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

export class OfflineQueueDB extends Dexie {
  mutations!: Table<QueuedMutation>;

  constructor() {
    super('liminal-offline-queue');
    this.version(1).stores({
      mutations: '++id, type, timestamp',
    });
  }
}

export const offlineQueueDB = new OfflineQueueDB();

// Enqueue: called from api.ts when offline
export async function enqueueOfflineMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retries'>): Promise<void> {
  await offlineQueueDB.mutations.add({
    ...mutation,
    timestamp: Date.now(),
    retries: 0,
  });
}

// Flush: called from Network listener on reconnect
export async function flushOfflineQueue(
  replayFn: (mutation: QueuedMutation) => Promise<void>
): Promise<void> {
  const queued = await offlineQueueDB.mutations.orderBy('timestamp').toArray();
  for (const mutation of queued) {
    try {
      await replayFn(mutation);
      await offlineQueueDB.mutations.delete(mutation.id!);
    } catch (err) {
      await offlineQueueDB.mutations.update(mutation.id!, { retries: mutation.retries + 1 });
    }
  }
}
```

### Pattern 4: Capacitor Network Plugin Hook
**What:** React hook using `@capacitor/network` to drive `isOnline` Zustand state.
**When to use:** Mounted once in `layout.tsx` alongside WebSocketManager.

```typescript
// Source: https://capacitorjs.com/docs/apis/network (Capacitor 8 official docs)
import { Network } from '@capacitor/network';
import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

export function useNetworkStatus() {
  const setIsOnline = useAppStore((s) => s.setIsOnline);

  useEffect(() => {
    // Set initial state
    Network.getStatus().then((status) => setIsOnline(status.connected));

    // Listen for changes
    const handle = Network.addListener('networkStatusChange', (status) => {
      setIsOnline(status.connected);
    });

    return () => { handle.then((h) => h.remove()); };
  }, [setIsOnline]);
}
```

### Pattern 5: Framer Motion Swipe Gesture (scroll-safe)
**What:** `drag="x"` with `dragDirectionLock` so vertical scroll is not blocked on iOS.
**When to use:** SwipeableTaskCard wraps existing TaskCard.

```typescript
// Source: https://www.framer.com/motion/gestures/ + iOS scroll conflict resolution
// dragDirectionLock prevents horizontal drag from consuming vertical scroll events
<motion.div
  drag="x"
  dragDirectionLock           // locks to one axis after initial movement
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.1}
  onDragEnd={(_, info) => {
    if (info.offset.x < -80) onComplete();
    else if (info.offset.x > 80) onEdit();
  }}
>
```

**Note on `dragConstraints`:** Set both left/right to 0 initially, then override with state once drag threshold is detected. The spring-return behavior is automatic when constraints are set.

### Pattern 6: Haptic Feedback on Threshold Cross
**What:** Native haptic feedback when swipe threshold is crossed (Claude's discretion: YES, include haptics).
**When to use:** On swipe threshold events in SwipeableTaskCard.

```typescript
// Source: https://capacitorjs.com/docs/apis/haptics (Capacitor 8 official docs)
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// On complete threshold crossed:
await Haptics.impact({ style: ImpactStyle.Medium });

// On edit threshold crossed:
await Haptics.impact({ style: ImpactStyle.Light });
```

**Safe to call on web:** Haptics API calls resolve silently on platforms without Taptic Engine. No try/catch needed.

### Anti-Patterns to Avoid
- **`navigator.onLine` for offline detection:** Unreliable — returns `true` on captive portals and unstable connections. Use `@capacitor/network` instead.
- **Animating `display: none` for OfflineBanner:** CSS `display` cannot be animated. Use Framer Motion `AnimatePresence` with height/opacity/y transforms.
- **Calling Capacitor plugins at module level (outside useEffect):** Plugins are not available during Next.js SSR phase of static export build. Always call inside `useEffect` or async functions.
- **Storing queue in Zustand:** Zustand persist has a 5-10MB localStorage limit; IndexedDB via Dexie has no practical limit and survives memory pressure on iOS.
- **Using `hover:` Tailwind classes without `md:` guard:** iOS Safari does not have hover; hover states stick on tap and never release. All hover utilities must be wrapped: `md:hover:bg-gray-100`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB offline queue | Custom IDB open/upgrade/transaction boilerplate | `dexie` 4.x | Dexie handles version migrations, connection pooling, typed tables, and provides a clean Promise API. Raw IDB requires 200+ lines of boilerplate and error-prone upgrade logic. |
| Native online/offline detection | `window.addEventListener('online'/'offline')` | `@capacitor/network` | Browser events fire unreliably (false positives); Capacitor uses iOS SCNetworkReachability — reliable for cellular vs wifi transitions |
| Native haptic feedback | CSS vibration or Web Vibration API | `@capacitor/haptics` | Web Vibration API is not supported on iOS Safari. Capacitor exposes UIImpactFeedbackGenerator which provides proper Taptic Engine patterns |
| iOS status bar management | Meta tags alone | `@capacitor/status-bar` | WKWebView meta tag approach is insufficient for iOS 15+ Dynamic Island; Capacitor plugin exposes full `setStyle`/`setBackgroundColor`/`setOverlaysWebView` control |

**Key insight:** Capacitor plugins exist precisely because browser APIs are either absent (haptics) or unreliable (network) on iOS. Using them is not adding complexity — it is following the established hybrid app pattern.

---

## Runtime State Inventory

Not applicable — this is a new feature addition phase, not a rename/refactor/migration phase. No existing runtime state contains strings that need updating.

---

## Common Pitfalls

### Pitfall 1: Dynamic API Route Blocks Static Export Build
**What goes wrong:** `next build` with `output: 'export'` fails with "Error: Route /api/config with `dynamic = 'force-dynamic'` can't be used with `output: 'export'`."
**Why it happens:** `frontend/app/api/config/route.ts` has `export const dynamic = 'force-dynamic'`. This route reads server environment variables at request time. Static export cannot produce a server-rendered route.
**How to avoid:** For the mobile (Capacitor) build, auth config must be sourced client-side. Options in order of preference:
1. Replace the `/api/config` fetch in `lib/auth.ts` with direct env var reads (`NEXT_PUBLIC_*` vars baked into the static build) when `NEXT_PUBLIC_CAPACITOR_BUILD=true`.
2. Conditionally export `dynamic = 'force-static'` based on build mode (requires build script differentiation).
3. Move the API route to use only `NEXT_PUBLIC_*` variables so it can be statically rendered.
**Warning signs:** Build fails immediately on `next build` after adding `output: 'export'`.

### Pitfall 2: `npx cap sync` Must Run After Every `next build`
**What goes wrong:** Native app runs stale web code because developer forgot to sync after rebuild.
**Why it happens:** `npx cap sync` copies the `frontend/out/` contents into the iOS Xcode project's `App/public/` folder. Without it, Xcode builds the previous version.
**How to avoid:** Add an npm script: `"build:mobile": "next build && npx cap sync"` (run from repo root, not frontend/).
**Warning signs:** Changes made to frontend code are not reflected when running from Xcode.

### Pitfall 3: Framer Motion `drag="x"` Blocks iOS Vertical Scroll
**What goes wrong:** Users trying to scroll the task list accidentally trigger swipe gestures on every card their finger passes.
**Why it happens:** Touch events are ambiguous at gesture start. Framer Motion needs to determine scroll vs. drag intent.
**How to avoid:** Use `dragDirectionLock` prop. This tells Framer Motion to observe initial movement direction and lock to that axis. Only activate horizontal drag if 10+ pixels of horizontal movement are detected before vertical movement.
**Warning signs:** Scrolling the task list feels "sticky" or cards spring back unexpectedly.

### Pitfall 4: Safe Area Insets Not Applied to Fixed Bottom Elements
**What goes wrong:** Bottom tab bar overlaps the iPhone home indicator bar (the thin line at the bottom of iPhone 14/15 screens). Content behind the tab bar is unreachable.
**Why it happens:** `position: fixed; bottom: 0` positions the element at the physical bottom, ignoring the safe area.
**How to avoid:** Apply `padding-bottom: env(safe-area-inset-bottom)` to the tab bar container. The `viewport-fit=cover` meta tag must also be set in `layout.tsx` for these env vars to have values.
**Warning signs:** Testing on iPhone 14 Pro — tab bar is partially occluded by the home indicator. On older iPhones (no indicator), it looks fine — so this only appears on physical device testing.

### Pitfall 5: Input Font Size <16px Triggers iOS Auto-Zoom
**What goes wrong:** When the user taps any `<input>` or `<textarea>` with font-size below 16px, iOS Safari automatically zooms the viewport in. After the user dismisses the keyboard, the page remains zoomed.
**Why it happens:** iOS Safari zooms inputs smaller than 16px to make them readable. The zoom does not auto-revert.
**How to avoid:** All `<input>` and `<textarea>` elements must use `text-base` (16px) or larger. The Quick Capture text input and any task title inputs need this check.
**Warning signs:** Viewport jumps/zooms on input focus during physical device testing.

### Pitfall 6: WebSocket Connection Fails From Capacitor (CORS / mixed content)
**What goes wrong:** The existing `WebSocketManager.tsx` connects to the backend WS. In Capacitor's WKWebView, the page origin is `capacitor://localhost` — the backend must allow this origin in its WebSocket upgrade handler.
**Why it happens:** Capacitor serves pages from `capacitor://localhost` origin, which differs from `http://localhost:3000` used in dev.
**How to avoid:** Backend CORS must whitelist `capacitor://localhost`. Check the FastAPI backend's CORS config. Alternatively, configure Capacitor's `server.allowNavigation` or use the `hostname` config to normalize the origin.
**Warning signs:** WebSocket connection succeeds on web but shows connection refused in Capacitor logs.

### Pitfall 7: Capacitor Plugins Not Available During next build SSR Phase
**What goes wrong:** Importing `@capacitor/network` at module scope causes build errors because the plugin tries to access native APIs during SSR (even in static export builds, Next.js pre-renders pages at build time).
**Why it happens:** During `next build`, pages are server-rendered in a Node.js environment. Capacitor plugins expect browser APIs.
**How to avoid:** All Capacitor plugin calls must be inside `useEffect` hooks (client-side only). Never call `Network.getStatus()` or `Haptics.impact()` at module level.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'getStatus')` during `next build`.

---

## Code Examples

Verified patterns from official sources:

### Capacitor Network Plugin — Full Hook Pattern
```typescript
// Source: https://capacitorjs.com/docs/apis/network
import { Network } from '@capacitor/network';
import { useEffect } from 'react';

// ConnectionStatus interface:
// { connected: boolean, connectionType: 'wifi' | 'cellular' | 'none' | 'unknown' }

// Get status once:
const status = await Network.getStatus(); // status.connected: boolean

// Listen for changes (use in useEffect):
const listener = await Network.addListener('networkStatusChange', (status) => {
  console.log(status.connected); // boolean
});

// Cleanup:
await listener.remove();
```

### Dexie.js Queue Schema — TypeScript
```typescript
// Source: https://dexie.org/docs/Typescript (Dexie 4 docs)
import Dexie, { Table } from 'dexie';

// In Dexie 4, typings are included in the npm package — no @types needed
export class AppDB extends Dexie {
  todos!: Table<Todo>;

  constructor() {
    super('appDatabase');
    this.version(1).stores({
      todos: '++id',  // ++ means auto-increment
    });
  }
}
```

### TestFlight Distribution Workflow (Xcode steps)
```
Prerequisites:
  - Mac with Xcode installed (Xcode 26.0+ required for Capacitor 8 iOS support)
  - Apple Developer Program membership ($99/year)
  - App record created in App Store Connect at appstoreconnect.apple.com

Steps:
  1. Build web assets:        cd frontend && npm run build
  2. Sync to Xcode project:   npx cap sync (from repo root)
  3. Open in Xcode:           npx cap open ios
  4. Select target:           Change target device to "Any iOS Device (arm64)"
  5. Archive:                 Product → Archive (creates .xcarchive)
  6. Distribute:              Organizer window → Distribute App → App Store Connect
  7. Upload:                  Keep "Upload" selected → Automatically manage signing → Upload
  8. Wait:                    App Store Connect processes build (~5-10 min)
  9. TestFlight:              In App Store Connect → TestFlight → Add build → Send to tester
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next export` CLI command | `output: 'export'` in next.config.js | Next.js v13.3 (deprecated), v14.0 (removed) | The CLI command is gone — must use config |
| `@capacitor/android` / `@capacitor/ios` v5 | v6 → v7 → v8 | 2024-2026 | Current is v8.2.0. Plugin packages must match core version exactly |
| Capacitor requiring iOS 13+ | Capacitor 8 requires iOS 15+ | Capacitor 6+ | Minimum iOS 15 — covers >99% of active iPhones (iPhone 6s and later) |
| Framer Motion v10 `drag` | Same API in v10-v12 | No breaking changes | The installed v10.12.16 is fine; all patterns in docs apply |

**Deprecated/outdated:**
- `navigator.onLine`: Still works but unreliable in iOS — use `@capacitor/network`
- `window.addEventListener('online'/'offline')`: Works but fires false positives — supplement with Capacitor Network plugin

---

## Open Questions

1. **`/api/config` Route — Auth Config Strategy for Mobile Build**
   - What we know: The route uses `force-dynamic` to read env vars at request time for OIDC configuration. Static export will fail.
   - What's unclear: Whether auth is even required for the TestFlight build — the existing `NEXT_PUBLIC_AUTH_REQUIRED` env var can be set to `false`, which may be the path of least resistance for the mobile target.
   - Recommendation: Set `NEXT_PUBLIC_AUTH_REQUIRED=false` in the Capacitor mobile build environment. Refactor `lib/auth.ts` to fall back to env vars directly (NEXT_PUBLIC prefixed so they are baked into the static bundle) rather than fetching `/api/config`. The API route can remain for the web deployment; mobile skips it.

2. **Backend CORS for `capacitor://localhost` Origin**
   - What we know: Capacitor serves from `capacitor://localhost` origin. The backend FastAPI app has CORS configuration that was set up for `http://localhost:3000` (dev) and production origin.
   - What's unclear: Whether the backend CORS config currently includes `capacitor://localhost`.
   - Recommendation: The planner should include a task to verify and update the backend CORS allowlist. This is a backend change (outside `frontend/`).

3. **`distDir` Conflict — Custom `.next-clean` vs Static Export `out/`**
   - What we know: `next.config.js` currently sets `distDir: process.env.NEXT_DIST_DIR || '.next-clean'`. Static export always writes to `out/` (or a custom `distDir`). If `distDir` is `.next-clean`, the static export would write to `.next-clean/` not `out/`.
   - What's unclear: Whether the `distDir` setting overrides the static export output directory name.
   - Recommendation: Test: does `output: 'export'` + custom `distDir` write the static files to the custom distDir or always to `out/`? If to distDir, set `webDir` in capacitor.config.ts to `frontend/.next-clean` instead of `frontend/out`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm installs, next build | ✓ | v24.11.1 | — |
| Xcode | `npx cap add ios`, `npx cap open ios`, TestFlight archive | ✗ (Linux/WSL) | — | Must run Xcode steps on a Mac; WSL cannot run Xcode |
| Apple Developer Account | TestFlight distribution | Unknown | — | Cannot distribute to TestFlight without $99/year membership |
| iOS physical device or simulator | End-to-end testing | Unknown | — | Must use a Mac with Xcode for simulator; physical device for haptics testing |

**Missing dependencies with no fallback:**
- **Xcode:** The environment is WSL2 on Linux. `npx cap add ios` and `npx cap open ios` must be run on a Mac or in a CI environment with macOS. The planner should note that iOS build steps are Mac-only and may require a separate machine or CI pipeline.

**Missing dependencies with fallback:**
- **Physical iPhone:** iOS Simulator in Xcode can test most features. Haptic feedback requires a physical device (simulator has no Taptic Engine). Safe area insets can be tested in simulator with "Show Device Bezels" enabled.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 1.x |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npm test -- --run` |
| Full suite command | `cd frontend && npm run test:all` |

### Phase Requirements → Test Map

Phase 7 requirements are primarily structural (Capacitor config, layout changes, new components) and behavioral (offline queue, swipe gestures). Test strategy prioritizes unit tests for the offline queue logic and component-level tests for new UI components.

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| Offline queue: enqueue mutation when offline | unit | `cd frontend && npm test -- --run offlineQueue` | ❌ Wave 0 |
| Offline queue: flush replays mutations in order on reconnect | unit | `cd frontend && npm test -- --run offlineQueue` | ❌ Wave 0 |
| Offline queue: last-write wins conflict (later timestamp wins) | unit | `cd frontend && npm test -- --run offlineQueue` | ❌ Wave 0 |
| BottomTabBar: renders 4 tabs, center button opens QuickCapture | unit | `cd frontend && npm test -- --run BottomTabBar` | ❌ Wave 0 |
| OfflineBanner: shows when isOnline=false, hides when true | unit | `cd frontend && npm test -- --run OfflineBanner` | ❌ Wave 0 |
| SwipeableTaskCard: swipe left past 80px calls onComplete | unit | `cd frontend && npm test -- --run SwipeableTaskCard` | ❌ Wave 0 |
| SwipeableTaskCard: swipe right past 80px calls onEdit | unit | `cd frontend && npm test -- --run SwipeableTaskCard` | ❌ Wave 0 |
| SwipeableTaskCard: partial swipe (<80px) snaps back | unit | `cd frontend && npm test -- --run SwipeableTaskCard` | ❌ Wave 0 |
| Store: isOnline state + setIsOnline action | unit | `cd frontend && npm test -- --run store` | Extend ❌ Wave 0 |
| `next build` with output:export succeeds | smoke | `cd frontend && npm run build` | manual |
| Capacitor static export: Haptics resolves without error on web | unit | `cd frontend && npm test -- --run haptics` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npm test -- --run`
- **Per wave merge:** `cd frontend && npm run test:all`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/lib/offlineQueue.test.ts` — covers offline queue enqueue/flush/conflict logic
- [ ] `frontend/__tests__/components/BottomTabBar.test.tsx` — tab render + center button interaction
- [ ] `frontend/__tests__/components/OfflineBanner.test.tsx` — conditional render based on isOnline
- [ ] `frontend/__tests__/components/SwipeableTaskCard.test.tsx` — swipe threshold behavior
- [ ] Extend `frontend/__tests__/lib/store.test.ts` — add isOnline slice tests

---

## Sources

### Primary (HIGH confidence)
- [Capacitor 8 Getting Started](https://capacitorjs.com/docs/next/getting-started) — installation steps, webDir config
- [Capacitor 8 iOS Docs](https://capacitorjs.com/docs/next/ios) — iOS requirements (iOS 15+, Xcode 26.0+), `npx cap add ios`
- [Capacitor Network Plugin API](https://capacitorjs.com/docs/apis/network) — ConnectionStatus interface, addListener/getStatus
- [Capacitor Haptics Plugin API](https://capacitorjs.com/docs/apis/haptics) — ImpactStyle enum, iOS-only behavior
- [Next.js Static Exports Guide](https://nextjs.org/docs/app/guides/static-exports) — output:export limitations, unsupported features list (updated 2026-03-03)
- [Dexie.js React Tutorial](https://dexie.org/docs/Tutorial/React) — TypeScript schema pattern, Table types
- npm registry: `@capacitor/core@8.2.0` (2026-03-20), `dexie@4.3.0` (2026-03-18)

### Secondary (MEDIUM confidence)
- [Capgo: Next.js + Capacitor 8 guide](https://capgo.app/blog/building-a-native-mobile-app-with-nextjs-and-capacitor/) — confirmed: webDir='out', images.unoptimized=true, `cap sync` workflow
- [Josh Morony: TestFlight deployment steps](https://www.joshmorony.com/deploying-capacitor-applications-to-ios-development-distribution/) — Archive → Distribute App → App Store Connect upload workflow
- [Framer Motion gestures docs](https://www.framer.com/motion/gestures/) + GitHub issues #185, #1482, #1506 — `dragDirectionLock` as established solution for iOS scroll/drag conflict

### Tertiary (LOW confidence, flag for validation)
- GitHub issue observations on Next.js `output:export` + dynamic routes — verified against official Next.js docs (upgraded to HIGH)
- Community reports on WebSocket CORS from `capacitor://localhost` — planner should verify backend CORS config directly

---

## Metadata

**Confidence breakdown:**
- Standard stack (Capacitor 8, Dexie 4): HIGH — verified against npm registry and official docs
- Architecture patterns: HIGH — derived from official Capacitor docs and verified Next.js static export docs
- `/api/config` blocker: HIGH — confirmed by Next.js official error docs
- TestFlight workflow: MEDIUM — official Apple documentation referenced, steps confirmed across multiple guides
- Framer Motion swipe: MEDIUM — `dragDirectionLock` is documented but iOS scroll behavior has known edge cases (see GitHub issues)
- Xcode environment: LOW on this machine (WSL) — cannot validate macOS steps locally

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (Capacitor 8 is stable; Next.js static export API is stable)
