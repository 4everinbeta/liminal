# Phase 5: Forgiveness - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable users to recover from mistakes, interruptions, and lost context. This phase surfaces recovery infrastructure that is largely already built (soft delete, Zustand persistence, lastCompletedTask/lastDeletedTask store fields) with new UI components to make it visible. Does NOT add new task capabilities — it exposes recovery affordances and working memory cues.

Scope: undo task completion (30s window), restore deleted tasks (24hr soft delete), "where you left off" on page load, and interruption tracking when a user navigates away mid-task.

</domain>

<decisions>
## Implementation Decisions

### Where You Left Off
- **Highlighted task card** — the previously active task gets a subtle visual ring/glow on dashboard load
- No banner, no modal, no auto-resume — ambient and non-blocking
- `previouslyActiveTaskId` already persisted in Zustand localStorage; just needs visual treatment
- If the previously active task was completed or deleted, the highlight is silently skipped

### Interruption Tracking
- **Trigger:** Navigating away from the dashboard while a task is active (tab close, reload, route change)
- **Not triggered by:** timer focus/blur events or overnight in-progress status
- **Visual surface:** Subtle badge/indicator on the interrupted task card — ambient, scannable, no popup
- **Resume action:** Clicking the interrupted task card (or its badge) sets it as the active task and clears the badge — same as `setActiveTaskId()` pattern already in store
- **Does NOT auto-restart the Pomodoro timer** on resume

### Undo & Restore UI
- **Pattern:** Claude's discretion — consistent with how Phase 2/4 handled animation and toast details
- The store already has `lastCompletedTask` and `lastDeletedTask` with timestamps; the 30s window logic and visual presentation are left to the planner
- Backend already has `/tasks/{id}/restore` endpoint and `restoreTask()` in api.ts

### Claude's Discretion
- Exact undo toast/button style, duration, and positioning
- Whether undo completion and undo deletion share one component or are separate
- Trash/restore access point (inline on task card, section on dashboard, or both)
- Visual style of the interrupted-task badge (icon, border, dot)
- Exact wording for recovery prompts ("Resume?" / "You left this one" / etc.)
- Animation details for badge appear/clear transitions

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### State & Persistence
- `frontend/lib/store.ts` — Zustand store; `lastCompletedTask`, `lastDeletedTask`, `activeTaskId`, `previouslyActiveTaskId` already defined and persisted to localStorage. Phase 5 should extend, not replace.

### Backend Recovery
- `backend/app/routers/tasks.py` — `/tasks/deleted` (GET) and `/tasks/{id}/restore` (POST) endpoints already exist
- `backend/app/crud.py` — `get_deleted_tasks()`, `restore_task()`, soft delete via `is_deleted` field
- `backend/app/models.py` — `is_deleted: bool` field on Task model, 24hr threshold already enforced in `get_deleted_tasks`

### Frontend API Client
- `frontend/lib/api.ts` — `restoreTask()` and `getDeletedTasks()` already implemented; Phase 5 connects these to UI

### Prior Phase Patterns
- `.planning/phases/04-gamification/04-CONTEXT.md` — EOD toast pattern (non-blocking, auto-dismiss, opt-in); undo toast should follow same non-blocking principle
- `.planning/phases/02-capture-and-feedback/02-CONTEXT.md` — optimistic UI first; undo should optimistically restore task before API confirms

### Requirements
- `.planning/REQUIREMENTS.md` — RECOVERY-01 through RECOVERY-04, MEMORY-01 through MEMORY-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useAppStore` / Zustand store: `lastCompletedTask`, `lastDeletedTask`, `previouslyActiveTaskId`, `setActiveTaskId` — all directly usable for recovery logic
- `restoreTask()` in `frontend/lib/api.ts` — backend call already written
- EOD `EodSummaryToast` component (Phase 4) — reusable toast pattern for undo notifications
- Framer Motion — already in stack for badge/toast animations

### Established Patterns
- Optimistic UI: update state first, refetch on error (see CONVENTIONS.md error handling)
- Non-blocking feedback: toasts auto-dismiss, no blocking modals (Phase 1 principle)
- `setActiveTaskId()`: sets activeTaskId + saves previouslyActiveTaskId — resume is just calling this
- localStorage persistence: already set up via `partialize` in store; any new recovery state fields should be added to `partialize`

### Integration Points
- `frontend/app/page.tsx` — Dashboard; interrupted task badge and "where you left off" highlight go here
- `frontend/components/TaskCard.tsx` — interrupted badge and highlighted-card visual treatment go here
- `backend/app/routers/tasks.py` — already has restore route; no backend changes needed for RECOVERY-01/03/04

</code_context>

<specifics>
## Specific Ideas

- Highlighted card (where you left off) should feel like a subtle glow/ring — not a colored background, not a tooltip. Glanceable at a scroll.
- Interrupted badge should be ambient — something the user notices when they scan the list, not something that demands attention. A small icon (e.g., pause icon) or a colored dot on the card edge.
- Resume action is just `setActiveTaskId()` — no new abstraction needed.
- Undo window is 30 seconds per RECOVERY-01 — the timestamp in `lastCompletedTask` is already stored; just needs countdown + dismiss logic.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-forgiveness*
*Context gathered: 2026-03-19*
