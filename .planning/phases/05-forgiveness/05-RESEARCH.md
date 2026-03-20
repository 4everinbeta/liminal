# Phase 5: Forgiveness - Research

**Researched:** 2026-03-20
**Domain:** React/Next.js recovery UI, Zustand persistent state, Framer Motion ambient animations
**Confidence:** HIGH

## Summary

Phase 5 is primarily a UI surfacing phase — the recovery infrastructure is largely complete. The backend has soft-delete, `/tasks/deleted`, and `/tasks/{id}/restore` endpoints. The Zustand store persists `lastCompletedTask`, `lastDeletedTask`, and `previouslyActiveTaskId` to localStorage. `UndoBanner.tsx` is fully implemented. The "Previously active task" block in focus mode (`previousTask`) already renders. The "Recently Deleted (24h)" section in planning mode already renders with restore buttons.

What remains is: (1) wiring `UndoBanner` into the page layout, (2) adding the `isWhereYouLeftOff` ring visual to `TaskCard`, (3) implementing the `interruptedTaskId` store field and `beforeunload`/route-change trigger, and (4) adding the interrupted badge to `TaskCard`. RECOVERY-02 (session persistence) and RECOVERY-03 (draft auto-recovery) are already satisfied by the existing Zustand `partialize` + `sessionStorage` draft hooks from Phase 2.

**Primary recommendation:** Build incrementally on what exists. Three units of work: (1) wire UndoBanner to layout, (2) extend TaskCard with "where you left off" ring + interrupted badge, (3) add `interruptedTaskId` store field and navigation-away trigger.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Where You Left Off**
- Highlighted task card — the previously active task gets a subtle visual ring/glow on dashboard load
- No banner, no modal, no auto-resume — ambient and non-blocking
- `previouslyActiveTaskId` already persisted in Zustand localStorage; just needs visual treatment
- If the previously active task was completed or deleted, the highlight is silently skipped

**Interruption Tracking**
- Trigger: Navigating away from the dashboard while a task is active (tab close, reload, route change)
- Not triggered by: timer focus/blur events or overnight in-progress status
- Visual surface: Subtle badge/indicator on the interrupted task card — ambient, scannable, no popup
- Resume action: Clicking the interrupted task card (or its badge) sets it as the active task and clears the badge — same as `setActiveTaskId()` pattern already in store
- Does NOT auto-restart the Pomodoro timer on resume

**Undo & Restore UI**
- Pattern: Claude's discretion — consistent with how Phase 2/4 handled animation and toast details
- The store already has `lastCompletedTask` and `lastDeletedTask` with timestamps; the 30s window logic and visual presentation are left to the planner
- Backend already has `/tasks/{id}/restore` endpoint and `restoreTask()` in api.ts

### Claude's Discretion
- Exact undo toast/button style, duration, and positioning
- Whether undo completion and undo deletion share one component or are separate
- Trash/restore access point (inline on task card, section on dashboard, or both)
- Visual style of the interrupted-task badge (icon, border, dot)
- Exact wording for recovery prompts ("Resume?" / "You left this one" / etc.)
- Animation details for badge appear/clear transitions

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RECOVERY-01 | User can undo task completion (30-second undo window) | `UndoBanner.tsx` fully implemented; `lastCompletedTask` in store with timestamp; UNDO_WINDOW_MS=30000. Needs UndoBanner wired into `layout.tsx` or `page.tsx`. |
| RECOVERY-02 | Session state persists across page reload (Zustand persist middleware) | Already complete. `partialize` in store.ts persists `activeTaskId`, `previouslyActiveTaskId`, `lastCompletedTask`, `lastDeletedTask`, `isFocusMode`. No work needed. |
| RECOVERY-03 | Draft task inputs auto-recover after browser crash | Already complete via Phase 2's `sessionStorage` draft hook (`useDraftPreservation`). No work needed. |
| RECOVERY-04 | User can restore recently deleted tasks (soft delete with 24hr retention) | Backend `get_deleted_tasks` + `restore_task` complete. `getDeletedTasks()` + `restoreTask()` in api.ts complete. "Recently Deleted (24h)" section in page.tsx complete. `UndoBanner` handles undo-delete in the 30s window. Verify UndoBanner is wired. |
| MEMORY-01 | User sees "Currently working on" task prominently displayed | "Current Focus" active task card in focus mode already shows `activeTask`. Verify `activeTaskId` survives reload (confirmed via partialize). |
| MEMORY-02 | User can mark task "paused" and it auto-resumes on next session | `handlePauseTask` sets status to 'paused' via API. Paused tasks appear in list with visual treatment. "Auto-resumes" means it's still visible and selectable on next session — `activeTaskId` is persisted. No new mechanism needed. |
| MEMORY-03 | Dashboard shows "Where you left off" on page load | `previousTask` block already renders in focus mode (lines 477–488 page.tsx). Needs the `isWhereYouLeftOff` ring on TaskCard in planning mode. |
| MEMORY-04 | Interruptions tracked and surfaced ("You were working on X before distraction") | Not yet implemented. Requires: new `interruptedTaskId` store field + `beforeunload`/router event trigger + interrupted badge on TaskCard. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^4.3.9 | State + persistence | Already in use; `persist` + `partialize` pattern established |
| framer-motion | ^10.12.16 | Badge/ring animations | Already in use; AnimatePresence + spring patterns established |
| lucide-react | ^0.263.1 | PauseCircle icon for interrupted badge | Already in use |
| next.js | 13.4.12 | Router events for navigation-away detection | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | ^14.1.0 | Component tests | All new components need unit tests |
| vitest | ^1.0.0 | Test runner | Established test framework |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `beforeunload` + Next.js router events | `pagehide` event | `pagehide` more reliable on mobile Safari, but project is web-first desktop-focus |
| `PauseCircle` icon badge | Colored dot | Icon is more scannable at small size; consistent with existing `paused` pill pattern in PlanningTaskRow |

**Installation:** No new packages needed. All stack dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. All changes are extensions of existing files:

```
frontend/
├── components/
│   ├── UndoBanner.tsx          # Already complete — wire into layout
│   └── TaskCard.tsx            # Extend: isWhereYouLeftOff prop + interrupted badge
├── lib/
│   └── store.ts                # Extend: add interruptedTaskId field + actions
└── app/
    ├── layout.tsx              # Add <UndoBanner /> here (app-wide)
    └── page.tsx                # Add useInterruptionTracker hook call
```

### Pattern 1: Wiring UndoBanner Into Layout

`UndoBanner` is already fully built and imported in `page.tsx`'s EOD toast example. The correct placement is `frontend/app/layout.tsx` so it's available app-wide (not just the dashboard route).

```tsx
// frontend/app/layout.tsx — after existing providers
import { UndoBanner } from '@/components/UndoBanner'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <UndoBanner />           {/* fixed position, bottom-24, z-50 */}
        <GlobalQuickCapture />   {/* already here */}
      </body>
    </html>
  )
}
```

**Verify:** Check if `UndoBanner` is currently rendered anywhere. If already in `layout.tsx`, this is already done. If it's only conditionally rendered in `page.tsx`, move to `layout.tsx`.

### Pattern 2: Zustand Store Extension for Interruption Tracking

Add `interruptedTaskId` and `setInterruptedTaskId` to the store, and include it in `partialize`:

```typescript
// store.ts additions (within AppState interface)
interruptedTaskId: string | null
setInterruptedTaskId: (id: string | null) => void

// Within create() body
interruptedTaskId: null,
setInterruptedTaskId: (id) => set({ interruptedTaskId: id }),

// Within partialize
interruptedTaskId: state.interruptedTaskId,
```

**Why persist interruptedTaskId:** The whole point is it survives page reload/tab close so the badge appears on next session.

### Pattern 3: Navigation-Away Interruption Hook

A `useInterruptionTracker` hook in `page.tsx` (not a separate file — too small to warrant extraction) handles two triggers:

**Trigger 1 — Tab close / page reload (`beforeunload`):**
```typescript
// Inside page.tsx Home() component
const { activeTaskId, setInterruptedTaskId } = useAppStore()

useEffect(() => {
  const handleUnload = () => {
    if (activeTaskId) {
      // Zustand store is written to localStorage synchronously by zustand persist
      // We can call setInterruptedTaskId here — it writes before tab closes
      setInterruptedTaskId(activeTaskId)
    }
  }
  window.addEventListener('beforeunload', handleUnload)
  return () => window.removeEventListener('beforeunload', handleUnload)
}, [activeTaskId, setInterruptedTaskId])
```

**Trigger 2 — Next.js route change:**
```typescript
import { useRouter } from 'next/navigation'  // Next.js 13 App Router

// Route changes in a single-page app don't fire beforeunload.
// The dashboard is the only route (/, /board). Navigating to /board
// while a task is active should set interruptedTaskId.
// Use Next.js router.events if available, or detect via useEffect cleanup.

useEffect(() => {
  return () => {
    // Component unmount = navigated away from dashboard
    if (activeTaskId) {
      setInterruptedTaskId(activeTaskId)
    }
  }
}, [activeTaskId, setInterruptedTaskId])
```

**Important caveat — Next.js 13.4 App Router:** `router.events` is NOT available in the App Router (it's Pages Router only). The cleanup `useEffect` return is the reliable approach for Next.js 13 App Router route changes.

### Pattern 4: TaskCard Extensions

Two new behaviors, both via new optional props:

```typescript
interface TaskProps {
  // ... existing ...
  isWhereYouLeftOff?: boolean     // renders ring-2 ring-primary/30 ring-offset-2
  isInterrupted?: boolean         // renders PauseCircle badge
  onResumeFromInterrupt?: () => void  // clears interruptedTaskId + setActiveTaskId
}
```

**Where you left off ring** (MEMORY-03):
```tsx
// Applied to the motion.div className — ambient, no tooltip
className={`... ${isWhereYouLeftOff ? 'ring-2 ring-primary/30 ring-offset-2' : ''}`}
```

**Interrupted badge** (MEMORY-04):
```tsx
// AnimatePresence wraps the badge for enter/exit
{isInterrupted && (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="absolute top-2 right-2"
      onClick={(e) => { e.stopPropagation(); onResumeFromInterrupt?.() }}
    >
      <span className="flex items-center bg-orange-50 rounded px-1.5 py-0.5">
        <PauseCircle size={14} className="text-orange-500" />
      </span>
    </motion.div>
  </AnimatePresence>
)}
```

**Where to pass props from page.tsx:**
```tsx
// Focus mode: TaskCard is not used directly (active task is custom render)
// Planning mode: PlanningTaskRow receives task, passes isWhereYouLeftOff
<PlanningTaskRow
  isWhereYouLeftOff={task.id === previouslyActiveTaskId && task.status !== 'done'}
  isInterrupted={task.id === interruptedTaskId}
  onResumeFromInterrupt={() => {
    setActiveTaskId(task.id)
    setInterruptedTaskId(null)
  }}
/>
```

### Anti-Patterns to Avoid

- **Don't block on undo:** Never show a modal confirming undo — it defeats the purpose for ADHD users. Banner is optimistic and immediate.
- **Don't auto-resume the timer:** Explicitly excluded by user decision. Resume only sets `activeTaskId`, never restarts the Pomodoro.
- **Don't trigger interruption badge on focus/blur:** Only navigation-away (beforeunload, component unmount) triggers it. Timer state changes do not.
- **Don't use `router.events` in Next.js 13 App Router:** That API is Pages Router only. Use `useEffect` cleanup for route-change detection.
- **Don't persist `isQuickCaptureOpen` or `lastUpdate`:** These are already excluded from `partialize`. Don't add runtime-only state to persist.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 30s countdown window | Custom timer with Date tracking | Existing `setInterval` in `UndoBanner.tsx` already does this | Already implemented and correct |
| Soft delete + restore | Custom is_deleted logic | Existing `crud.restore_task()` and `/tasks/{id}/restore` endpoint | Already implemented with 24hr threshold |
| State persistence across reload | Manual localStorage reads/writes | Zustand `persist` + `partialize` already configured | Any new recovery state field just needs to be added to `partialize` |
| Toast/banner animation | Custom CSS animations | `animate-in fade-in slide-in-from-bottom-4` (Tailwind animate-in) used in UndoBanner | Already established; maintain consistency |
| Badge enter/exit animation | CSS transitions | Framer Motion `AnimatePresence` with spring — matches existing patterns | Established pattern in EodSummaryToast, TaskCard |

**Key insight:** This phase is 80% wiring and verification, 20% new code. The heaviest new work is the interruption tracker hook and the TaskCard badge.

---

## Existing Implementation Audit

This is critical context for the planner — shows what's already done vs. what needs work.

### Already Complete — Verify Only
| Feature | Req | Where | Status |
|---------|-----|-------|--------|
| UndoBanner component | RECOVERY-01 | `frontend/components/UndoBanner.tsx` | Complete. 30s window, both completion+delete branches, UNDO button, X dismiss, dark pill style |
| Session state persistence | RECOVERY-02 | `frontend/lib/store.ts` — `partialize` | Complete. `activeTaskId`, `previouslyActiveTaskId`, `lastCompletedTask`, `lastDeletedTask` all persisted |
| Draft auto-recovery | RECOVERY-03 | Phase 2 `sessionStorage` draft hook | Complete |
| Recently Deleted section | RECOVERY-04 | `frontend/app/page.tsx` lines 615–632 | Complete. Shows when `deletedTasks.length > 0`, restore button calls `handleRestoreTask` |
| "Currently working on" display | MEMORY-01 | Focus mode "Current Focus" card | Complete. `activeTask` from store drives the card |
| Pause task (manual) | MEMORY-02 | `handlePauseTask` + API `status: 'paused'` | Complete. Pause button in focus mode + PlanningTaskRow action menu |
| "Previous interruption" in focus mode | MEMORY-03 | `page.tsx` lines 477–488 `previousTask` block | Complete for focus mode. Needs TaskCard ring in planning mode |
| Store fields for lastCompletedTask / lastDeletedTask | RECOVERY-01/04 | `store.ts` | Complete including timestamps |

### Needs New Work
| Feature | Req | Gap | Effort |
|---------|-----|-----|--------|
| UndoBanner wired into layout | RECOVERY-01 | Check if `<UndoBanner />` is in `layout.tsx` — if not, add it | XS |
| TaskCard "where you left off" ring | MEMORY-03 | `isWhereYouLeftOff` prop + ring className not in TaskCard | S |
| `interruptedTaskId` store field | MEMORY-04 | Field doesn't exist in store.ts | XS |
| Interruption trigger (beforeunload + unmount) | MEMORY-04 | No `useEffect` watching `beforeunload` exists in page.tsx | S |
| Interrupted badge on TaskCard | MEMORY-04 | `isInterrupted` prop + AnimatePresence badge not in TaskCard | S |
| Props wiring in page.tsx / PlanningTaskRow | MEMORY-03/04 | PlanningTaskRow doesn't accept or pass `isWhereYouLeftOff` / `isInterrupted` | S |

---

## Common Pitfalls

### Pitfall 1: UndoBanner Already Mounted But Not Visible

**What goes wrong:** Developer adds `<UndoBanner />` to `layout.tsx` but it already exists in `page.tsx` — two instances, one fires, one doesn't.
**Why it happens:** UndoBanner uses `hasMounted` guard and subscribes to Zustand. Two instances subscribe and both fire UNDO on click, causing double API calls.
**How to avoid:** Grep for `<UndoBanner` before adding to layout. Remove from page.tsx if moving to layout. Single source of truth.
**Warning signs:** UNDO fires but task reverts to an unexpected previous state; console shows two "Undo completion failed" or silent double-calls.

### Pitfall 2: `beforeunload` Fires But Store Write Doesn't Persist

**What goes wrong:** `setInterruptedTaskId(activeTaskId)` is called in `beforeunload`, but the tab closes before Zustand's `localStorage.setItem` completes.
**Why it happens:** `beforeunload` is synchronous but Zustand `persist` middleware batches writes. In most browsers this is fine, but in some edge cases the write is deferred.
**How to avoid:** In the `beforeunload` handler, also write directly to `localStorage` as a fallback:
```typescript
window.addEventListener('beforeunload', () => {
  if (activeTaskId) {
    setInterruptedTaskId(activeTaskId)
    // Belt-and-suspenders: direct write
    const stored = JSON.parse(localStorage.getItem('liminal-app') || '{}')
    stored.state = { ...stored.state, interruptedTaskId: activeTaskId }
    localStorage.setItem('liminal-app', JSON.stringify(stored))
  }
})
```
**Warning signs:** Badge never appears after tab close/reload, even though `beforeunload` fired.

### Pitfall 3: `useEffect` Cleanup Fires on Re-Renders, Not Just Navigation

**What goes wrong:** The `useEffect` cleanup for interruption tracking fires when the component re-renders (e.g., `activeTaskId` changes), not just when the user navigates away.
**Why it happens:** `useEffect` cleanup runs on every dep change and on unmount. If `activeTaskId` is in the dep array, the cleanup fires every time a new task is set active.
**How to avoid:** Use a `ref` to capture the current `activeTaskId` without it being a dependency:
```typescript
const activeTaskIdRef = useRef(activeTaskId)
useEffect(() => {
  activeTaskIdRef.current = activeTaskId
}, [activeTaskId])

useEffect(() => {
  return () => {
    // Cleanup only fires on true unmount (navigation away)
    if (activeTaskIdRef.current) {
      setInterruptedTaskId(activeTaskIdRef.current)
    }
  }
}, []) // Empty deps — only fires on unmount
```
**Warning signs:** `interruptedTaskId` gets set every time the user completes a task and moves to the next one.

### Pitfall 4: Interrupted Badge Persists After Task Completion

**What goes wrong:** User has an interrupted badge on task A. User completes task A. Badge still shows because `interruptedTaskId` is still set.
**Why it happens:** `handleCompleteTask` clears `activeTaskId` but doesn't clear `interruptedTaskId`.
**How to avoid:** In `handleCompleteTask` and `handleDeleteTask` in `page.tsx`, add:
```typescript
if (taskId === interruptedTaskId) setInterruptedTaskId(null)
```
**Warning signs:** Ghost badges appear on completed tasks.

### Pitfall 5: `previouslyActiveTaskId` Ring Shows on Active Task

**What goes wrong:** The "where you left off" ring shows on the currently active task, creating visual noise.
**Why it happens:** `previouslyActiveTaskId` is set to the old `activeTaskId` every time `setActiveTaskId` is called. If the user resumes the previous task, it becomes both `activeTaskId` and the ring target.
**How to avoid:** Ring condition must be:
```typescript
isWhereYouLeftOff={
  task.id === previouslyActiveTaskId &&
  task.id !== activeTaskId &&  // Don't show ring on current active task
  task.status !== 'done'
}
```
**Warning signs:** Ring appears on the currently active task in planning mode.

---

## Code Examples

Verified patterns from the actual codebase:

### Store Extension Pattern (matches existing store.ts style)
```typescript
// In AppState interface
interruptedTaskId: string | null
setInterruptedTaskId: (id: string | null) => void

// In create() body
interruptedTaskId: null,
setInterruptedTaskId: (id) => set({ interruptedTaskId: id }),

// In partialize
interruptedTaskId: state.interruptedTaskId,
```

### Framer Motion Badge Pattern (matches EodSummaryToast animate-in)
```tsx
// AnimatePresence at component level (matches existing pattern in TaskCard for isCompleting)
import { motion, AnimatePresence } from 'framer-motion'

<AnimatePresence>
  {isInterrupted && (
    <motion.span
      key="interrupted-badge"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="absolute top-2 right-2 flex items-center bg-orange-50 rounded px-1.5 py-0.5 cursor-pointer"
      onClick={(e) => { e.stopPropagation(); onResumeFromInterrupt?.() }}
    >
      <PauseCircle size={14} className="text-orange-500" />
    </motion.span>
  )}
</AnimatePresence>
```

### Where-You-Left-Off Ring Pattern (matches UI-SPEC)
```tsx
// Applied as additional className on the outer motion.div in TaskCard
className={`group bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-3
  ${isWhereYouLeftOff ? 'ring-2 ring-primary/30 ring-offset-2' : ''}
  ${task.themeColor || task.due_date ? '' : priorityColorClass}
`}
```

### PlanningTaskRow Prop Extension Pattern
```tsx
// page.tsx — extend PlanningTaskRow interface
function PlanningTaskRow({
  task,
  isActive,
  isWhereYouLeftOff,    // new
  isInterrupted,        // new
  onResumeFromInterrupt, // new
  onTaskClick,
  onDelete,
  onComplete,
  onEdit,
  onPause,
}: {
  // ...
  isWhereYouLeftOff?: boolean
  isInterrupted?: boolean
  onResumeFromInterrupt?: () => void
})
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^1.0.0 |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npm test -- --run` |
| Full suite command | `cd frontend && npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RECOVERY-01 | UndoBanner renders when lastCompletedTask is set within 30s window | unit | `cd frontend && npm test -- --run __tests__/components/UndoBanner.test.tsx` | ❌ Wave 0 |
| RECOVERY-01 | UndoBanner UNDO button calls updateTask with original status | unit | same | ❌ Wave 0 |
| RECOVERY-01 | UndoBanner dismisses after 30s timestamp expiry | unit | same | ❌ Wave 0 |
| RECOVERY-04 | UndoBanner renders when lastDeletedTask is set | unit | same | ❌ Wave 0 |
| RECOVERY-04 | UndoBanner UNDO button calls restoreTask | unit | same | ❌ Wave 0 |
| MEMORY-03 | TaskCard applies ring class when isWhereYouLeftOff=true | unit | `cd frontend && npm test -- --run __tests__/components/TaskCard.test.tsx` | ✅ (file exists, needs new test) |
| MEMORY-04 | TaskCard renders interrupted badge when isInterrupted=true | unit | same | ✅ (file exists, needs new test) |
| MEMORY-04 | TaskCard badge click calls onResumeFromInterrupt | unit | same | ✅ (file exists, needs new test) |

### Sampling Rate
- **Per task commit:** `cd frontend && npm test -- --run`
- **Per wave merge:** `cd frontend && npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/components/UndoBanner.test.tsx` — covers RECOVERY-01, RECOVERY-04
- [ ] New test cases in `frontend/__tests__/components/TaskCard.test.tsx` — covers MEMORY-03, MEMORY-04 (file exists, add test cases)

---

## Open Questions

1. **Is UndoBanner already in layout.tsx?**
   - What we know: UndoBanner.tsx is complete and imported in page.tsx (visible in EOD toast import pattern)
   - What's unclear: Whether UndoBanner is currently rendered — it's not visible in the page.tsx render tree we read
   - Recommendation: Planner should grep for `<UndoBanner` in layout.tsx and page.tsx before planning the wiring task. If not found anywhere, add to layout.tsx.

2. **Does Next.js 13.4 App Router support `useRouter` route-change events?**
   - What we know: `router.events` is Pages Router only. App Router (used here — `'use client'` components, `next/navigation`) does not expose route events.
   - What's unclear: Whether there's a reliable App Router equivalent
   - Recommendation: Use `useEffect` cleanup (unmount detection) for route changes. For tab close, use `beforeunload`. This covers all MEMORY-04 trigger cases.

3. **Should the interrupted badge appear in focus mode as well as planning mode?**
   - What we know: The "Previous interruption" block in focus mode already handles `previouslyActiveTaskId` display. The interrupted badge is scoped to TaskCard, which is used in planning mode.
   - What's unclear: Whether focus mode needs a separate interrupted indicator beyond the existing `previousTask` block
   - Recommendation: No. The existing `previousTask` block in focus mode already satisfies the "surfacing" intent of MEMORY-04. The badge is planning-mode only. This avoids redundancy.

---

## Sources

### Primary (HIGH confidence)
- Direct code reading: `frontend/components/UndoBanner.tsx` — complete implementation verified
- Direct code reading: `frontend/lib/store.ts` — `lastCompletedTask`, `lastDeletedTask`, `previouslyActiveTaskId`, `partialize` all confirmed
- Direct code reading: `frontend/app/page.tsx` — `previousTask` block (lines 477–488), "Recently Deleted" section (lines 615–632), `handleCompleteTask`, `handleDeleteTask` confirmed
- Direct code reading: `frontend/components/TaskCard.tsx` — existing props interface, motion.div structure, no existing ring/badge props
- Direct code reading: `backend/app/routers/tasks.py` — `/tasks/deleted` GET + `/tasks/{id}/restore` POST confirmed
- Direct code reading: `.planning/phases/05-forgiveness/05-UI-SPEC.md` — visual contract: orange-50 badge, ring-2 ring-primary/30, animation specs
- Direct code reading: `frontend/vitest.config.ts` + existing test files — Vitest + @testing-library/react confirmed

### Secondary (MEDIUM confidence)
- Next.js 13 App Router behavior re: `router.events` — training knowledge verified against App Router architecture (confirmed: events API is Pages Router only)
- `beforeunload` + Zustand sync write behavior — training knowledge; direct test recommended

### Tertiary (LOW confidence)
- Belt-and-suspenders direct `localStorage` write in `beforeunload` handler — pattern inferred from browser event timing; validate in testing

---

## Metadata

**Confidence breakdown:**
- What's already built: HIGH — verified by direct code reading
- Standard stack: HIGH — all packages confirmed in package.json
- Architecture patterns: HIGH — derived from existing code patterns in the codebase
- Pitfalls: MEDIUM — derived from React/Next.js knowledge + code analysis; beforeunload timing pitfall is LOW without direct test
- Validation architecture: HIGH — vitest.config.ts and test files confirmed

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable stack, no fast-moving dependencies)
