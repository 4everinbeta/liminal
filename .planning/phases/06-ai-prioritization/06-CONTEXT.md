# Phase 6: AI Prioritization - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface AI-powered "Do This Now" prioritization in the task list — intelligently suggesting which task to work on next. The backend (`AIPrioritizationService`, `/tasks/ai-suggestion`, `/tasks/{id}/ai-feedback` endpoints), task model fields (`ai_relevance_score`, `ai_suggestion_status`), and frontend wiring in `page.tsx` are already largely in place. This phase completes the UI surface, wires the remaining gaps, and validates the full system works end-to-end.

Does NOT add new AI capabilities or change the scoring algorithm.

</domain>

<decisions>
## Implementation Decisions

### "Do This Now" Suggestion Card
- **D-01:** Inline pinned card above the task list in Planning mode — NOT the current floating overlay
- **D-02:** Card shows: task title, due date + estimated duration, AI reasoning text, Accept and Dismiss buttons
- **D-03:** Card is persistent until the user acts (accept or dismiss); it re-appears on the next polling cycle if a new suggestion is available
- **D-04:** The existing `AISuggestion.tsx` floating overlay should be replaced by an inline version rendered in the Planning mode section of `page.tsx`

### Accept Behavior
- **D-05:** Clicking "Accept" sets the task as `activeTaskId` AND switches to Focus mode immediately
- **D-06:** On accept, call `sendAiFeedback(taskId, 'accepted')` (already implemented in api.ts)

### Dismiss Behavior
- **D-07:** Clicking "Dismiss" hides the card and calls `sendAiFeedback(taskId, 'dismissed')` — no mode switch
- **D-08:** After dismiss, card is hidden for the session (or until the next polling cycle surface a different task)

### AI Score Visibility
- **D-09:** AI relevance scores are hidden from the user — task order silently reflects AI scoring
- **D-10:** No badges, numbers, or "AI sorted" indicators on individual task cards
- **D-11:** The existing "AI Sorting" toggle in Planning mode toggles is sufficient — label stays as-is

### Claude's Discretion
- Exact styling of the inline pinned card (should feel consistent with `EodSummaryToast` and other non-blocking feedback patterns)
- Whether to fade out the floating `AISuggestion.tsx` component immediately or remove it from the page.tsx render entirely (prefer removal — avoid rendering both)
- Animation details for card enter/exit (Framer Motion already in use)
- Exact wording of "Do This Now" label and Accept/Dismiss button text

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend AI Surface
- `frontend/components/AISuggestion.tsx` — Existing floating overlay component; inline card should reuse the same props interface or replace this component
- `frontend/app/page.tsx` — Dashboard; AI suggestion fetch, 15-min polling, accept/dismiss handlers, sortingMode logic already wired here; inline card goes in Planning mode section
- `frontend/lib/api.ts` — `getAiSuggestion()`, `sendAiFeedback()`, `AISuggestion` interface already defined

### Frontend State
- `frontend/lib/store.ts` — `sortingMode: 'ai' | 'manual'` (persisted), `setSortingMode` already in store; no new state fields needed

### Backend AI Service
- `backend/app/agents/prioritization.py` — Full `AIPrioritizationService`; scores all active tasks and returns `suggested_task_id` + `reasoning`
- `backend/app/routers/tasks.py` — `GET /tasks/ai-suggestion` and `POST /tasks/{id}/ai-feedback` endpoints

### Data Model
- `backend/app/models.py` — `Task.ai_relevance_score` (0-100), `Task.ai_suggestion_status` (AISuggestionStatus enum: none/suggested/accepted/dismissed/ignored)
- `frontend/lib/api.ts` — `Task` interface with `ai_relevance_score` and `ai_suggestion_status` fields already defined

### Prior Phase Patterns
- `.planning/phases/05-forgiveness/05-CONTEXT.md` — non-blocking feedback patterns; inline pinned card should follow same ambient, non-interrupting philosophy
- `.planning/phases/04-gamification/04-CONTEXT.md` — EOD toast pattern; reuse Framer Motion enter/exit conventions

### Requirements
- `.planning/REQUIREMENTS.md` — AI-01 through AI-06

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AISuggestion.tsx`: Props (`taskTitle`, `reasoning`, `isVisible`, `onAccept`, `onDismiss`) and Framer Motion animation are reusable — the positioning needs to change from `fixed top-24` to `relative` inline
- `sendAiFeedback()` / `getAiSuggestion()` in api.ts: Already fully implemented
- `handleAcceptSuggestion` / `handleDismissSuggestion` in page.tsx: Already implemented — accept handler just needs `toggleFocusMode()` / `handleSwitchToFocus()` added
- `sortingMode` store field + toggle UI: Already rendered in Planning mode in page.tsx

### Established Patterns
- Framer Motion: `AnimatePresence` + `motion.div` used throughout for enter/exit (see `EodSummaryToast`, interrupted badge in `PlanningTaskRow`)
- Non-blocking feedback: No modals; toasts and inline components only
- Optimistic UI: Accept/dismiss should update state immediately before awaiting API call

### Integration Points
- **Planning mode section of `page.tsx`** (around line 586): Inline pinned card goes between the Toggles Row and the Quick Capture section — or between Quick Capture and the task list
- **`handleAcceptSuggestion` (page.tsx line 293)**: Needs `handleSwitchToFocus()` call added after `setActiveTaskId(taskId)`
- **`AISuggestion` render at bottom of page.tsx (line 729)**: Should be removed (replaced by inline card)

</code_context>

<specifics>
## Specific Ideas

- The inline pinned card should feel like it belongs to the task list — not a toast, not a modal. Think: a highlighted row or a card that slots naturally above the list.
- The "Accept" CTA should be decisive and immediate — user clicks it, task becomes active, mode switches to Focus. No confirmation needed.
- The floating overlay (`AISuggestion.tsx` rendered at bottom of page.tsx) should be removed entirely to avoid rendering both patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-ai-prioritization*
*Context gathered: 2026-03-21*
