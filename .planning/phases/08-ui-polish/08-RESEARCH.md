# Phase 8: UI Polish - Research

**Researched:** 2026-04-03
**Domain:** Next.js / React frontend — targeted component surgery (no new routes, no new backend)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**POLISH-01: EditTaskModal Presets (value & effort)**
- D-01: Duration picker (Quick/Medium/Long) already auto-sets value_score AND effort_score — implicit coupling is correct and stays unchanged.
- D-02: Fix is to relabel the Priority buttons: change raw numbers (30, 60, 90) → labels "Low / Medium / High".
- D-03: Duration buttons stay minimal — do NOT annotate them with value/effort derivations.
- D-04: No separate Value or Effort preset rows — the Duration auto-calc covers them implicitly.

**POLISH-02: CapacitySummary in Focus Mode**
- D-05: Show a compact strip (not the full blue card) below the active task card in Focus mode.
- D-06: Compact strip format: `● 2.5h left · 3/5 tasks fit` — one line, inline, ambient. Uses the same blue palette but condensed.
- D-07: Strip appears always in Focus mode — including when there is no active task (the empty state).
- D-08: Full CapacitySummary card remains unchanged in Planning mode. Two render paths: full card (Planning), compact strip (Focus).

**POLISH-03: Impact Pill Fallback**
- D-09: Fallback text is `"short task"` — positive, vague, ADHD-safe. No numbers.
- D-10: Fallback applies in BOTH places where duration is rendered: task list in Planning mode (page.tsx ~line 71) and active task card in Focus mode (page.tsx ~line 526).
- D-11: Render logic: `{task.estimated_duration ? \`${task.estimated_duration}m\` : 'short task'}`

**POLISH-04: Offline Restore Guard**
- D-12: Claude's discretion — add same offline guard pattern already used in createTask/updateTask/deleteTask: check `navigator.onLine`, if offline enqueue `{ type: 'restoreTask', taskId, payload: {} }` into offlineQueue.

### Claude's Discretion
- Exact styling of the compact CapacitySummary strip in Focus mode (padding, font size, color weight)
- Whether to extract a shared `formatDuration(task)` helper or inline the fallback at each callsite
- The exact Tailwind classes for the relabeled Priority buttons

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POLISH-01 | User can select Low/Medium/High presets for value and effort in EditTaskModal instead of typing a number (1-100) | Priority buttons at line 133 of EditTaskModal.tsx use `{p}` render — change the label strings only; scores (30/60/90) unchanged |
| POLISH-02 | User can see CapacitySummary (hours remaining, task count) while in Focus mode, not just Planning mode | CapacitySummary.tsx contains all calculation logic in a `useMemo`; a compact strip variant can consume the same output without duplicating logic |
| POLISH-03 | User sees meaningful fallback text in the impact pill (e.g., "short task") when a task has no estimated_duration set | Two conditional renders in page.tsx use `&&` guard (lines 71 and 526) — both must change to ternary with "short task" fallback |
| POLISH-04 | User's restored (soft-deleted) tasks are enqueued in the offline mutation queue when offline and synced on reconnect | `restoreTask` in api.ts (line 242) has no offline guard; `MutationType` union in offlineQueue.ts must be extended; `replayMutation` switch in api.ts must handle the new type |
</phase_requirements>

---

## Summary

Phase 8 is a targeted, low-risk polish pass on four specific rough edges in the v1.0 frontend. All four changes are isolated to existing files — no new routes, no schema changes, no new dependencies.

The two most mechanically simple changes are POLISH-01 (change three string literals in EditTaskModal.tsx) and POLISH-03 (change two conditional renders in page.tsx). POLISH-02 requires deciding where and how to render the compact strip — the calculation logic already exists in CapacitySummary.tsx and must not be duplicated. POLISH-04 is a pattern completion: it adds the same three-line offline guard that already exists in createTask, updateTask, and deleteTask, but requires a TypeScript type extension in offlineQueue.ts and a new case in the replayMutation switch.

**Primary recommendation:** Implement in dependency order — POLISH-01 and POLISH-03 first (zero-risk label/render changes), then POLISH-02 (new render path, no logic change), then POLISH-04 (type extension + guard pattern).

---

## Standard Stack

### Core (already in project — no installs needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js (App Router) | detected in project | React SSR/SSG framework | Project baseline |
| React | detected in project | UI component model | Project baseline |
| Tailwind CSS | detected in project | Utility-first styling | Project baseline |
| Dexie.js | detected in project | IndexedDB wrapper for offline queue | Established in Phase 5 |
| Vitest | detected in project (config: vitest.config.ts) | Unit/component test runner | Established test framework |
| @testing-library/react | detected in node_modules | Component rendering in tests | Established test pattern |
| fake-indexeddb | detected in offlineQueue.test.ts | IndexedDB mock for Dexie tests | Established pattern |

**No new dependencies are required for any of the four changes.**

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending MutationType union | Separate queue for restoreTask | Consistent with established pattern; no reason to diverge |
| Inline fallback at two callsites | Shared `formatDuration` helper | Helper is slightly cleaner but introduces indirection for a 1-line change; both are valid (Claude's discretion) |
| Compact strip in page.tsx inline | Extracted `CapacitySummaryStrip` component | Extracted component is more testable and keeps page.tsx clean; recommended |

---

## Architecture Patterns

### Recommended Project Structure (no changes)
```
frontend/
├── app/page.tsx              # Duration fallback patches (POLISH-03) + compact strip insertion (POLISH-02)
├── components/
│   ├── EditTaskModal.tsx     # Priority label change (POLISH-01)
│   ├── CapacitySummary.tsx   # Source of capacity logic; compact strip variant derived here or alongside
│   └── CapacitySummaryStrip.tsx  # NEW: compact strip component (POLISH-02)
└── lib/
    ├── api.ts                # restoreTask offline guard + replayMutation case (POLISH-04)
    └── offlineQueue.ts       # MutationType union extension (POLISH-04)
```

### Pattern 1: Priority Button Label Change (POLISH-01)
**What:** Replace numeric render `{p}` with a label map keyed to priority score values.
**When to use:** Any time a button displays a raw score instead of a human label.

Current code (EditTaskModal.tsx line 133):
```tsx
{[30, 60, 90].map(p => (
  <button key={p} ...>
    {p}
  </button>
))}
```

Target pattern — score-to-label map, values unchanged:
```tsx
const PRIORITY_LABELS: Record<number, string> = { 30: 'Low', 60: 'Medium', 90: 'High' }

{[30, 60, 90].map(p => (
  <button key={p} ...>
    {PRIORITY_LABELS[p]}
  </button>
))}
```
The `priority_score` value written to state (`p`) is unchanged — only the displayed string changes.

### Pattern 2: Duration Fallback (POLISH-03)
**What:** Replace `&&` guard with ternary so null `estimated_duration` renders "short task".
**When to use:** Any conditional render that should show a fallback rather than nothing.

Current (page.tsx line 71):
```tsx
{task.estimated_duration && <span>{task.estimated_duration}m</span>}
```

Target (both line 71 and line 526):
```tsx
<span>{task.estimated_duration ? `${task.estimated_duration}m` : 'short task'}</span>
```

Optional helper (Claude's discretion):
```tsx
// lib/formatDuration.ts
export function formatDuration(task: Task): string {
  return task.estimated_duration ? `${task.estimated_duration}m` : 'short task'
}
```

### Pattern 3: Compact CapacitySummary Strip (POLISH-02)
**What:** A new render variant that consumes the same `useMemo` capacity calculation from CapacitySummary.tsx but renders a single ambient line instead of the full blue card.
**When to use:** Focus mode only. Full card stays in Planning mode.

The safest implementation extracts the capacity calculation into a shared hook or passes the computed values as props, avoiding duplication of the `useMemo` logic.

Option A — Extract shared hook (recommended for testability):
```tsx
// components/useCapacity.ts
export function useCapacity(tasks: Task[]) {
  return useMemo(() => { /* existing logic from CapacitySummary */ }, [tasks])
}

// CapacitySummary.tsx — uses useCapacity(tasks)
// CapacitySummaryStrip.tsx — uses useCapacity(tasks), renders one-liner
```

Option B — Prop drilling (simpler, still acceptable):
```tsx
// CapacitySummary.tsx accepts variant prop
<CapacitySummary tasks={tasks} variant="strip" />
```
Option B risks growing prop surface of an already-done component. Option A is cleaner.

Compact strip mockup (confirmed in CONTEXT.md):
```tsx
// CapacitySummaryStrip.tsx
<div className="flex items-center gap-2 text-xs text-blue-600 py-2">
  <span className="text-blue-400">●</span>
  <span>{hoursRemaining.toFixed(1)}h left · {tasksFit}/{todayTasks.length} tasks fit</span>
</div>
```
Strip must render in both active-task state and no-active-task empty state (D-07).

Insertion point in page.tsx — after the active task card closing `</div>`, before the closing `</div>` of the Focus mode block (around line 598-600):
```tsx
{/* Capacity Strip — always visible in Focus mode */}
<CapacitySummaryStrip tasks={tasks} />
```

### Pattern 4: restoreTask Offline Guard (POLISH-04)
**What:** Add the standard three-line offline guard to `restoreTask` in api.ts, extend `MutationType` union, and add a `replayMutation` case.
**When to use:** Every mutating API call that a user might trigger while offline.

Step 1 — offlineQueue.ts: extend `MutationType`
```ts
// Before:
export type MutationType = 'createTask' | 'updateTask' | 'deleteTask' | 'completeTask'
// After:
export type MutationType = 'createTask' | 'updateTask' | 'deleteTask' | 'completeTask' | 'restoreTask'
```

Step 2 — api.ts: add guard to `restoreTask`
```ts
export async function restoreTask(taskId: string): Promise<Task> {
  if (!getIsOnline()) {
    await enqueueOfflineMutation({ type: 'restoreTask', taskId, payload: {} })
    return { id: taskId } as Task  // optimistic stub — caller (UndoBanner) reads triggerUpdate
  }
  return request<Task>(`${API_BASE_URL}/tasks/${taskId}/restore`, {
    method: 'POST',
  })
}
```

Step 3 — api.ts: add case to `replayMutation`
```ts
case 'restoreTask':
  await request<Task>(`${API_BASE_URL}/tasks/${mutation.taskId}/restore`, {
    method: 'POST',
  })
  break
```

The caller (UndoBanner.tsx) calls `triggerUpdate()` after `restoreTask` returns — no change needed there because the offline path returns an optimistic stub, and the real sync happens on reconnect via `flushOfflineQueue`.

### Anti-Patterns to Avoid
- **Duplicating the capacity useMemo:** Copy-pasting the calculation from CapacitySummary.tsx into page.tsx or a new strip component means two divergence-prone implementations. Extract shared logic instead.
- **Changing priority_score values:** POLISH-01 only changes labels. The scores 30/60/90 must remain — they map to the `priority` enum and are used in sorting/scoring.
- **Putting the offline guard in UndoBanner.tsx:** The guard belongs in api.ts (D-12, consistent with createTask/updateTask/deleteTask). The component should not know about the queue.
- **Skipping the replayMutation case:** If the TypeScript union is extended but the switch statement is not updated, queued restoreTask mutations will be silently dropped on reconnect.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Offline mutation queuing | Custom localStorage-based queue | Existing `enqueueOfflineMutation` + Dexie | Already implemented, tested with fake-indexeddb |
| Capacity hours calculation | Duplicate useMemo in page.tsx | Extract `useCapacity` hook or strip component that reuses existing logic | Single source of truth for the 9-5 workday model |
| Priority score-to-label mapping | Implicit string formatting | Explicit `PRIORITY_LABELS` const map | Readable, type-safe, easy to change |

---

## Common Pitfalls

### Pitfall 1: MutationType Union Not Extended
**What goes wrong:** TypeScript compiles, but `enqueueOfflineMutation({ type: 'restoreTask', ... })` fails at runtime or is rejected by TypeScript's strict check.
**Why it happens:** `MutationType` in offlineQueue.ts is a string union — adding a new type requires updating the union explicitly.
**How to avoid:** Update offlineQueue.ts first; the TypeScript compiler will then surface any gaps in the switch statement.
**Warning signs:** `Argument of type '"restoreTask"' is not assignable to parameter of type 'MutationType'` TypeScript error.

### Pitfall 2: replayMutation Missing restoreTask Case
**What goes wrong:** When the user comes back online, `flushOfflineQueue` calls `replayMutation` for each queued item. If the switch has no `restoreTask` case (and no default throw), the mutation is silently deleted without being replayed — task is never actually restored on the server.
**Why it happens:** The switch in `replayMutation` has no `default` fallback.
**How to avoid:** Add the case explicitly; optionally add a `default: throw` to surface unhandled types.
**Warning signs:** Task appears restored in UI (optimistic) but is still deleted after page refresh.

### Pitfall 3: CapacitySummaryStrip Not Rendering in Empty State
**What goes wrong:** Strip only appears when `activeTask` is truthy — user in Focus mode with no active task sees nothing.
**Why it happens:** Developer places the strip inside the `{activeTask ? ... : ...}` branch.
**How to avoid:** Place the strip outside both branches of the activeTask conditional, at the same level as the full Focus mode container (D-07).
**Warning signs:** Strip disappears on the "No active tasks" empty state screen.

### Pitfall 4: estimated_duration Falsy-But-Set Edge Case
**What goes wrong:** If `estimated_duration` is ever `0` (technically valid), the ternary `task.estimated_duration ? ...m : 'short task'` renders "short task" incorrectly.
**Why it happens:** JavaScript treats `0` as falsy.
**How to avoid:** Use explicit null check: `task.estimated_duration != null ? \`${task.estimated_duration}m\` : 'short task'`. In practice the current codebase never sets duration to 0, but defensive coding is better.
**Warning signs:** A task with 0m duration shows "short task" instead of "0m".

### Pitfall 5: Stale Capacity Logic After Extract
**What goes wrong:** CapacitySummary.tsx continues to work, but the strip uses a different copy of the calculation that diverges over time.
**Why it happens:** Extracting a hook but not updating the original component to use it.
**How to avoid:** After extracting `useCapacity`, update CapacitySummary.tsx to consume it too — both render paths share one implementation.

---

## Code Examples

### POLISH-01: Relabeled Priority Buttons
```tsx
// Source: direct inspection of EditTaskModal.tsx lines 131-151
const PRIORITY_LABELS: Record<number, string> = { 30: 'Low', 60: 'Medium', 90: 'High' }

<div className="flex gap-2">
  {[30, 60, 90].map(p => (
    <button
      key={p}
      type="button"
      onClick={() => setEditedTask({
        ...editedTask,
        priority_score: p,
        priority: p >= 67 ? 'high' : p >= 34 ? 'medium' : 'low'
      })}
      className={`flex-1 py-2 rounded-lg capitalize border ${
        editedTask.priority_score === p
          ? 'bg-primary text-white border-primary'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {PRIORITY_LABELS[p]}
    </button>
  ))}
</div>
```

### POLISH-03: Duration Fallback (both callsites)
```tsx
// Callsite 1: page.tsx ~line 71 (PlanningTaskRow task list)
<span>{task.estimated_duration != null ? `${task.estimated_duration}m` : 'short task'}</span>

// Callsite 2: page.tsx ~line 526 (Focus mode active task card)
<span>{activeTask.estimated_duration != null ? `${activeTask.estimated_duration}m` : 'short task'}</span>
```

### POLISH-04: Full offline guard for restoreTask
```ts
// offlineQueue.ts — extend MutationType
export type MutationType = 'createTask' | 'updateTask' | 'deleteTask' | 'completeTask' | 'restoreTask'

// api.ts — restoreTask with guard
export async function restoreTask(taskId: string): Promise<Task> {
  if (!getIsOnline()) {
    await enqueueOfflineMutation({ type: 'restoreTask', taskId, payload: {} })
    return { id: taskId } as Task
  }
  return request<Task>(`${API_BASE_URL}/tasks/${taskId}/restore`, {
    method: 'POST',
  })
}

// api.ts — replayMutation: add case before closing brace of switch
case 'restoreTask':
  await request<Task>(`${API_BASE_URL}/tasks/${mutation.taskId}/restore`, {
    method: 'POST',
  })
  break
```

---

## Runtime State Inventory

> Phase 8 is a frontend code-only change. No renames, no migrations.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no field renames, no collection renames | None |
| Live service config | None — no service reconfiguration | None |
| OS-registered state | None | None |
| Secrets/env vars | None — no env var changes | None |
| Build artifacts | None — no package renames | None |

---

## Environment Availability

> Phase 8 is frontend-only. External dependency check is scoped to the dev toolchain.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | `npm run test` (vitest) | Expected ✓ | project-managed | — |
| Vitest | Unit tests | ✓ (vitest.config.ts present) | detected | — |
| fake-indexeddb | offlineQueue.test.ts | ✓ (used in existing tests) | detected | — |
| @testing-library/react | Component tests | ✓ (in node_modules) | detected | — |

**No missing dependencies.**

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts) |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npm test -- --run` |
| Full suite command | `cd frontend && npm test -- --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POLISH-01 | Priority buttons display "Low"/"Medium"/"High" not "30"/"60"/"90" | unit (component) | `cd frontend && npm test -- --run __tests__/components/EditTaskModal.test.tsx` | ❌ Wave 0 |
| POLISH-02 | CapacitySummaryStrip renders in Focus mode with active task | unit (component) | `cd frontend && npm test -- --run __tests__/components/CapacitySummaryStrip.test.tsx` | ❌ Wave 0 |
| POLISH-02 | CapacitySummaryStrip renders in Focus mode with no active task (empty state) | unit (component) | same file | ❌ Wave 0 |
| POLISH-03 | Impact pill shows "short task" when estimated_duration is null | unit (component) | `cd frontend && npm test -- --run __tests__/components/PlanningTaskRow.test.tsx` | ❌ Wave 0 |
| POLISH-04 | restoreTask enqueues mutation when offline | unit (api) | `cd frontend && npm test -- --run __tests__/lib/api.test.ts` | ✅ (file exists, test TBD) |
| POLISH-04 | replayMutation handles restoreTask type | unit (api) | same file | ✅ (file exists, test TBD) |
| POLISH-04 | MutationType union accepts 'restoreTask' | type-check | `cd frontend && npx tsc --noEmit` | ✅ (implicit) |

### Sampling Rate
- **Per task commit:** `cd frontend && npm test -- --run`
- **Per wave merge:** `cd frontend && npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/components/EditTaskModal.test.tsx` — covers POLISH-01 (button labels)
- [ ] `frontend/__tests__/components/CapacitySummaryStrip.test.tsx` — covers POLISH-02 (strip renders in both states)
- [ ] `frontend/__tests__/components/PlanningTaskRow.test.tsx` — covers POLISH-03 (duration fallback in planning list)
- `frontend/__tests__/lib/api.test.ts` already exists — add `restoreTask` offline tests there (POLISH-04)

---

## Open Questions

1. **Shared hook vs. prop variant for POLISH-02**
   - What we know: CapacitySummary.tsx has self-contained useMemo logic; the compact strip needs the same numbers.
   - What's unclear: Whether to extract `useCapacity` hook (more refactor) or use a `variant` prop (simpler but muddies CapacitySummary API).
   - Recommendation: Extract `useCapacity` hook — cleaner, both components benefit, testable in isolation. This is Claude's discretion per CONTEXT.md.

2. **formatDuration helper vs. inline ternary for POLISH-03**
   - What we know: Two callsites need the same logic.
   - What's unclear: Whether a helper is worth adding for two lines.
   - Recommendation: Inline for now. If a third callsite appears, extract. Two occurrences don't justify added indirection.

3. **Optimistic return value for restoreTask offline path**
   - What we know: UndoBanner.tsx calls `restoreTask(id)` then `triggerUpdate()` — it does not read the returned Task object beyond discarding.
   - What's unclear: Whether `{ id: taskId } as Task` stub causes any TypeScript strictness issues.
   - Recommendation: Cast is acceptable here; same pattern as updateTask offline return `{ id: taskId, ...data } as Task`. The full Task is fetched on next `triggerUpdate`.

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `frontend/components/EditTaskModal.tsx` — confirmed Priority button structure (lines 131-151), Duration preset pattern (lines 104-128)
- Direct file inspection: `frontend/components/CapacitySummary.tsx` — confirmed full useMemo calculation logic, render states
- Direct file inspection: `frontend/app/page.tsx` — confirmed both `estimated_duration &&` conditional render sites (lines 71 and 526), CapacitySummary insertion point (line 663)
- Direct file inspection: `frontend/lib/api.ts` — confirmed offline guard pattern in createTask/updateTask/deleteTask (lines 168, 194, 205), restoreTask location (line 242), replayMutation switch (lines 214-236)
- Direct file inspection: `frontend/lib/offlineQueue.ts` — confirmed MutationType union (line 3), enqueueOfflineMutation signature (line 27)
- Direct file inspection: `frontend/components/UndoBanner.tsx` — confirmed restoreTask call site (line 66), triggerUpdate usage
- Direct file inspection: `frontend/vitest.config.ts` — confirmed test framework, environment, setup
- Direct file inspection: `frontend/__tests__/lib/offlineQueue.test.ts` — confirmed fake-indexeddb pattern, test structure
- Direct file inspection: `.planning/phases/08-ui-polish/08-CONTEXT.md` — confirmed all locked decisions

### Secondary (MEDIUM confidence)
- None required — all findings sourced directly from project files.

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- POLISH-01 (label change): HIGH — code is fully read, change is three string literals
- POLISH-02 (compact strip): HIGH — useMemo logic is clear; strip format confirmed in CONTEXT.md; insertion point confirmed in page.tsx
- POLISH-03 (fallback render): HIGH — both callsites identified and confirmed in source
- POLISH-04 (offline guard): HIGH — pattern is established in three other functions; TypeScript type change is a one-line union extension; replayMutation switch structure is confirmed
- Validation architecture: HIGH — vitest config, existing test files, and fake-indexeddb usage all confirmed from source

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable codebase, no external API dependencies)
