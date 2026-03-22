# Phase 7: Make iPhone Compatible App Version - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 07-make-iphone-compatible-app-version
**Areas discussed:** App delivery mechanism, Mobile layout adaptation, Offline/network behavior, Feature scope on mobile

---

## App Delivery Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| PWA — Add to Home Screen | manifest.json + service worker, runs fullscreen via Safari | |
| Responsive web only | No install, works in Safari browser | |
| Native wrapper (Capacitor/Expo) | Wraps existing web app in a native shell | ✓ |

**User's choice:** Native wrapper
**Follow-up — wrapper tech:**

| Option | Description | Selected |
|--------|-------------|----------|
| Capacitor | Wraps Next.js build into iOS app, minimal code changes | ✓ |
| Expo (React Native) | Port to React Native components — new frontend codebase | |

**User's choice:** Capacitor

**Follow-up — distribution target:**

| Option | Description | Selected |
|--------|-------------|----------|
| Local dev / TestFlight only | Personal use or internal testing, no App Store | ✓ |
| App Store submission | Full release with Apple review process | |

**User's choice:** Local dev / TestFlight only
**Notes:** No App Store submission in this phase. Capacitor + static Next.js export approach.

---

## Mobile Layout Adaptation

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom tab bar | Sticky bottom nav, thumb-reachable, iOS native pattern | ✓ |
| Hamburger side drawer | Slide-in drawer from hamburger icon | |
| Keep existing top nav | Header stays as-is | |

**User's choice:** Bottom tab bar

| Option | Description | Selected |
|--------|-------------|----------|
| Swipe left to complete / swipe right for details | Standard iOS gesture pattern | ✓ |
| Tap to expand, buttons appear inline | No swipe, reveal buttons on tap | |
| Long press for action menu | Long press triggers context menu | |

**User's choice:** Swipe left to complete / swipe right for details

| Option | Description | Selected |
|--------|-------------|----------|
| Keep existing FAB, position above bottom tab bar | Shift up to avoid tab bar overlap | |
| Replace FAB with dedicated tab bar button | Center tab bar icon (like Instagram +) | ✓ |
| Claude decides | Implementation detail deferred to Claude | |

**User's choice:** Replace FAB with center tab bar button

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — use env(safe-area-inset-*) CSS vars | Respect notch, Dynamic Island, home indicator | ✓ |
| No — handle it later | Skip, fix visual clipping when it appears | |

**User's choice:** Yes, handle safe area insets

---

## Offline/Network Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Show offline banner, block actions | Detect offline state, disable mutating actions | |
| Cache last-seen tasks, read-only browsing | localStorage/IndexedDB cache, no mutations offline | |
| Full offline mode with sync queue | Queue mutations locally, replay on reconnect | ✓ |

**User's choice:** Full offline mode with sync queue

**Follow-up — conflict resolution:**

| Option | Description | Selected |
|--------|-------------|----------|
| Last-write wins | Local queue replays in order, overwrites server state | ✓ |
| Server wins | Server state wins, local mutations discarded on conflict | |
| Prompt user on conflict | Show conflict resolution UI | |

**User's choice:** Last-write wins

**Follow-up — which mutations to queue:**

| Mutation | Selected |
|----------|----------|
| Task completion | ✓ |
| Task creation | ✓ |
| Task updates | ✓ |
| Task deletion | ✓ |

**User's choice:** All four mutation types

---

## Feature Scope on Mobile

| Feature | Description | Selected |
|---------|-------------|----------|
| AI suggestions (Phase 6) | "Do This Now" card | ✓ |
| Urgency colors + countdown (Phase 3) | Time-pressure color gradient + timers | ✓ |
| Gamification stats bar (Phase 4) | Daily count, streak, impact message | ✓ |
| Voice capture (Phase 2) | Microphone button for speech-to-task | ✓ |

**User's choice:** All four features included (full feature parity)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — as a tab in bottom nav | Board view included with touch-friendly interaction | ✓ |
| No — dashboard only | Mobile is task list only | |

**User's choice:** Board view included as a tab

---

## Claude's Discretion

- Exact tab bar icons and labels
- Swipe gesture implementation (Capacitor community plugin vs custom touch handlers)
- IndexedDB library for offline mutation queue
- Capacitor plugins needed (Network, Haptics, StatusBar, etc.)
- Haptic feedback on task completion
- Static export config trade-offs (`output: 'export'`)

## Deferred Ideas

- App Store submission — next phase after TestFlight validation
- Push notifications — separate capability
- Android version — iOS only in this phase
- Deep linking — deferred
