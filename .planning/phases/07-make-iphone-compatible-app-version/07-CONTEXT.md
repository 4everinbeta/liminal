# Phase 7: Make iPhone Compatible App Version - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Wrap the existing Next.js web app in a Capacitor iOS shell, adapt the UI for mobile touch patterns, add a full offline sync queue, and deliver a TestFlight-ready iPhone build. All existing ADHD-optimization features (urgency colors, AI suggestions, gamification, voice capture) are included at full parity.

This phase does NOT add new ADHD features — it makes the existing feature set available on iPhone.

</domain>

<decisions>
## Implementation Decisions

### App Delivery
- **D-01:** Use **Capacitor** to wrap the existing Next.js web build into an iOS native app. No new frontend framework — Capacitor bridges the WKWebView to native iOS APIs.
- **D-02:** Distribution target is **local dev / TestFlight only**. No App Store submission in this phase.

### Mobile Navigation
- **D-03:** Replace top header navigation with a **bottom tab bar** — standard iOS thumb-reachable pattern. Tabs: Dashboard, Board, (center: Quick Capture), and any settings/profile entry.
- **D-04:** Quick capture moves from a floating FAB to a **center tab bar button** (à la Instagram/Reminders). This is the primary capture entry point on mobile.
- **D-05:** Safe area insets must be applied using `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` CSS variables so content is not clipped by iPhone notch, Dynamic Island, or home indicator bar.

### Task Card Touch Interactions
- **D-06:** Task cards support **swipe left to complete, swipe right for detail/edit**. Standard iOS gesture pattern matching Things 3 / Reminders.

### Offline / Network Behavior
- **D-07:** Full **offline mode with mutation sync queue**. Users can complete, create, update, and delete tasks while offline.
- **D-08:** Mutations queued offline: task completion, task creation, task updates, task deletion (all four).
- **D-09:** Conflict resolution strategy: **last-write wins**. On reconnect, queued mutations are replayed in order. If server state diverged, the local queue wins.
- **D-10:** Offline state should be visually indicated (banner or indicator) so the user knows they are offline and changes will sync.

### Feature Scope
- **D-11:** Full feature parity — all ADHD-optimization features built in prior phases are included:
  - AI "Do This Now" suggestion card (Phase 6)
  - Urgency color gradient + countdown timers (Phase 3)
  - Gamification stats bar — daily count, streak, impact (Phase 4)
  - Voice capture via microphone button (Phase 2)
- **D-12:** Kanban board view is included as a **tab in the bottom navigation bar** with touch-friendly interaction.

### Claude's Discretion
- Exact tab bar icon choices and labels
- Whether to use a Capacitor community plugin for swipe gestures or implement custom touch handlers
- IndexedDB library selection for the offline mutation queue (e.g., Dexie.js vs raw IndexedDB API)
- Specific Capacitor plugins needed (Network, Haptics, StatusBar, etc.)
- Whether to add haptic feedback on task completion (native feel enhancement)
- Next.js static export config (required for Capacitor — `output: 'export'`) vs dynamic server rendering trade-offs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Project Foundation
- `.planning/PROJECT.md` — Core ADHD design principles (urgency over importance, frictionless capture)
- `.planning/REQUIREMENTS.md` — Active requirements list and constraints

### Codebase
- `frontend/next.config.js` — Current Next.js config; will need `output: 'export'` for Capacitor static build
- `frontend/app/page.tsx` — Dashboard page (primary mobile surface)
- `frontend/app/board/page.tsx` — Board page (needs mobile layout)
- `frontend/app/layout.tsx` — Root layout (add viewport meta, safe area CSS)
- `frontend/lib/store.ts` — Zustand store (extend for offline queue state)
- `frontend/lib/api.ts` — API client (wrap calls with offline detection + queue)

### Codebase Maps
- `.planning/codebase/STACK.md` — Technology stack
- `.planning/codebase/STRUCTURE.md` — Directory structure and where to add new code

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/lib/api.ts` — All API calls go through this file; ideal place to intercept and queue offline mutations
- `frontend/lib/store.ts` — Zustand store already used for global state; extend with `offlineQueue` and `isOnline` state
- `frontend/components/GlobalQuickCapture.tsx` — Existing quick capture modal; repurpose for center tab trigger
- Framer Motion — already installed; useful for swipe gesture animations on task cards
- `env(safe-area-inset-*)` — CSS variables available in WKWebView automatically via Capacitor's `viewport-fit=cover` viewport meta

### Established Patterns
- Zustand for global state — offline queue should live in the store
- `inline style={{ backgroundColor }}` for dynamic colors (Tailwind dynamic classes don't work at build time)
- React.memo on TaskCard — important for mobile performance (prevents re-renders from RAF countdown timers)
- Optimistic UI already established in Phase 2 — offline mutations should follow the same pattern (update locally, sync later)

### Integration Points
- `frontend/app/layout.tsx` — Add `<meta name="viewport" content="viewport-fit=cover">` and safe area CSS variables
- `frontend/app/page.tsx` — Bottom tab bar replaces header nav; layout restructure required
- `frontend/lib/api.ts` — Wrap all mutating API calls (POST/PATCH/DELETE) with offline detection
- New Capacitor config at repo root: `capacitor.config.ts` + `ios/` directory

</code_context>

<specifics>
## Specific Ideas

- Capacitor wraps the Next.js build — requires `output: 'export'` in `next.config.js` (static HTML/CSS/JS export, no server-side rendering). The backend API continues to run separately.
- Swipe gestures on task cards: swipe left → complete (green fill animation) / swipe right → expand detail drawer
- Center tab quick-capture button opens the existing GlobalQuickCapture modal
- TestFlight distribution workflow: Xcode → Archive → TestFlight upload

</specifics>

<deferred>
## Deferred Ideas

- App Store submission — explicitly deferred (D-02). Next phase if TestFlight build is validated.
- Push notifications via Capacitor's PushNotifications plugin — would enhance the urgency system but is a separate capability.
- Android version — this phase is iOS/iPhone only.
- Deep linking (e.g., open specific task from a notification) — deferred.

</deferred>

---

*Phase: 07-make-iphone-compatible-app-version*
*Context gathered: 2026-03-22*
