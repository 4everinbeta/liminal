# Phase 8: UI Polish - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 4 targeted rough edges from v1.0:
1. EditTaskModal — relabel Priority buttons (Low/Medium/High instead of 30/60/90)
2. CapacitySummary — show in Focus mode as a compact strip below the active task card
3. Impact pill — show "short task" fallback when estimated_duration is null
4. restoreTask offline guard — add enqueueOfflineMutation fallback (mirrors existing create/update/delete pattern)

This phase is polish only — no new capabilities, no new fields, no new routes.

</domain>

<decisions>
## Implementation Decisions

### POLISH-01: EditTaskModal Presets (value & effort)
- **D-01:** The Duration picker (Quick/Medium/Long) already auto-sets value_score AND effort_score — this implicit coupling is correct and stays unchanged.
- **D-02:** The fix is to relabel the Priority buttons: change raw numbers (30, 60, 90) → labels "Low / Medium / High".
- **D-03:** Duration buttons stay minimal — do NOT annotate them with value/effort derivations. ADHD-safe: fewer words, less cognitive load.
- **D-04:** No separate Value or Effort preset rows — the Duration auto-calc covers them implicitly.

### POLISH-02: CapacitySummary in Focus Mode
- **D-05:** Show a compact strip (not the full blue card) below the active task card in Focus mode.
- **D-06:** Compact strip format: `● 2.5h left · 3/5 tasks fit` — one line, inline, ambient. Uses the same blue palette but condensed.
- **D-07:** Strip appears always in Focus mode — including when there is no active task (the empty state). Helps the user decide what to focus on even before picking a task.
- **D-08:** The full CapacitySummary card remains unchanged in Planning mode. Two render paths: full card (Planning), compact strip (Focus).

### POLISH-03: Impact Pill Fallback
- **D-09:** Fallback text is `"short task"` — positive, vague, ADHD-safe. No numbers.
- **D-10:** Fallback applies in BOTH places where duration is rendered:
  - Task list in Planning mode (`page.tsx` ~line 71)
  - Active task card in Focus mode (`page.tsx` ~line 526)
- **D-11:** Render logic: `{task.estimated_duration ? `${task.estimated_duration}m` : 'short task'}`

### POLISH-04: Offline Restore Guard
- **D-12:** Claude's discretion — add the same offline guard pattern already used in createTask/updateTask/deleteTask: check `navigator.onLine`, if offline enqueue `{ type: 'restoreTask', taskId, payload: {} }` into offlineQueue. No user decision needed.

### Claude's Discretion
- Exact styling of the compact CapacitySummary strip in Focus mode (padding, font size, color weight)
- Whether to extract a shared `formatDuration(task)` helper or inline the fallback at each callsite
- The exact Tailwind classes for the relabeled Priority buttons

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §UI Polish — POLISH-01 through POLISH-04 acceptance criteria

### Core Components
- `frontend/components/EditTaskModal.tsx` — Priority buttons to relabel; Duration preset pattern to preserve
- `frontend/components/CapacitySummary.tsx` — Full card component; compact strip variant to be derived from this
- `frontend/app/page.tsx` — Both duration render sites (~line 71 and ~line 526); Focus mode layout where compact strip goes
- `frontend/lib/api.ts` — restoreTask function (~line 242); offline guard pattern established by createTask (~line 169)
- `frontend/lib/offlineQueue.ts` — Queue type definitions and enqueueOfflineMutation usage

### Prior Phase Patterns
- Phase 2 CONTEXT: duration presets established (Quick/Medium/Long); button styling pattern
- Phase 5 CONTEXT: offline queue pattern; enqueueOfflineMutation usage in api.ts

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CapacitySummary.tsx`: Full blue card — has all capacity calculation logic. Compact strip should reuse the same `useMemo` calculation, just render differently.
- `enqueueOfflineMutation` in `offlineQueue.ts`: Already used by create/update/delete. restoreTask just needs to add the same `navigator.onLine` check + enqueue call.
- Priority button pattern in EditTaskModal (~line 132): Already styled — just needs label strings changed from `{p}` to `'Low'/'Medium'/'High'`.

### Established Patterns
- Offline guard: `if (!navigator.onLine) { await enqueueOfflineMutation({ type: 'X', taskId, payload: {} }); return optimistic }` — exact pattern in api.ts lines 169, 195, 206.
- Duration auto-calc: line 116-117 in EditTaskModal — value_score and effort_score derived from minutes. Do not change.
- Conditional duration render: `{task.estimated_duration && <span>...}` — two occurrences in page.tsx to update.

### Integration Points
- `CapacitySummary` is imported in `page.tsx` and passed `tasks` prop. Compact strip in Focus mode needs the same `tasks` prop — already available at that scope.
- restoreTask is called from `UndoBanner.tsx` — offline guard goes in api.ts, not the component.

</code_context>

<specifics>
## Specific Ideas

- Compact strip mockup confirmed: `● 2.5h left · 3/5 tasks fit` — one-line ambient row, blue palette, below the active task card.
- Priority button labels: Low (30), Medium (60), High (90) — keeps the same score values, just surfaces human labels.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-ui-polish*
*Context gathered: 2026-04-02*
