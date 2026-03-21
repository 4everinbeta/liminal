# Phase 6: AI Prioritization - Research

**Researched:** 2026-03-21
**Domain:** React/Next.js component refactor + Framer Motion inline card pattern
**Confidence:** HIGH — all key artifacts verified by direct source code inspection

## Summary

Phase 6 is almost entirely a **UI refactor** rather than a new feature build. The full AI stack — `AIPrioritizationService`, `/tasks/ai-suggestion`, `/tasks/{id}/ai-feedback` endpoints, `Task.ai_relevance_score`, `Task.ai_suggestion_status`, all API client functions, store fields, and polling logic — already exists in production code. The 15-minute polling interval is already wired into `page.tsx` (line 254-261). AI sorting is already implemented in `fetchTasks()`. The handlers `handleAcceptSuggestion` and `handleDismissSuggestion` are already implemented.

The sole gap is the UI surface: the existing `AISuggestion` component renders as `fixed top-24` (floating overlay at the bottom of `page.tsx` line 729-735). This phase replaces it with an inline pinned card in the Planning mode section, and adds a `handleSwitchToFocus()` call to the accept handler. No backend changes are required.

The work amounts to: (1) convert `AISuggestion.tsx` from fixed-positioned overlay to inline relative card, (2) insert the inline card between the Toggles Row and Quick Capture section (~line 586 of page.tsx), (3) remove the old floating render at line 729-735, (4) add `handleSwitchToFocus()` to `handleAcceptSuggestion`. That is the complete scope.

**Primary recommendation:** Refactor `AISuggestion.tsx` to accept a `variant: 'inline' | 'overlay'` prop (or simply replace it entirely), add `due_date` and `estimated_duration` display from the task lookup, and wire the four changed lines in `page.tsx`. No new libraries, no backend work.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Inline pinned card above the task list in Planning mode — NOT the current floating overlay
- **D-02:** Card shows: task title, due date + estimated duration, AI reasoning text, Accept and Dismiss buttons
- **D-03:** Card is persistent until the user acts (accept or dismiss); it re-appears on the next polling cycle if a new suggestion is available
- **D-04:** The existing `AISuggestion.tsx` floating overlay should be replaced by an inline version rendered in the Planning mode section of `page.tsx`
- **D-05:** Clicking "Accept" sets the task as `activeTaskId` AND switches to Focus mode immediately
- **D-06:** On accept, call `sendAiFeedback(taskId, 'accepted')` (already implemented in api.ts)
- **D-07:** Clicking "Dismiss" hides the card and calls `sendAiFeedback(taskId, 'dismissed')` — no mode switch
- **D-08:** After dismiss, card is hidden for the session (or until the next polling cycle surfaces a different task)
- **D-09:** AI relevance scores are hidden from the user — task order silently reflects AI scoring
- **D-10:** No badges, numbers, or "AI sorted" indicators on individual task cards
- **D-11:** The existing "AI Sorting" toggle in Planning mode toggles is sufficient — label stays as-is

### Claude's Discretion
- Exact styling of the inline pinned card (should feel consistent with `EodSummaryToast` and other non-blocking feedback patterns)
- Whether to fade out the floating `AISuggestion.tsx` component immediately or remove it from the page.tsx render entirely (prefer removal — avoid rendering both)
- Animation details for card enter/exit (Framer Motion already in use)
- Exact wording of "Do This Now" label and Accept/Dismiss button text

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | User sees "Do This Now" AI suggestion at top of task list | Inline card inserted between Toggles Row and Quick Capture in Planning mode section of page.tsx |
| AI-02 | AI suggestion considers time of day, deadline proximity, estimated duration | Already implemented in `AIPrioritizationService.get_prioritization_prompt()` — the prompt passes due_date, estimated_duration, capacity, and feedback history to the LLM |
| AI-03 | User can easily dismiss/override AI suggestion (one click) | `handleDismissSuggestion` already calls `sendAiFeedback(taskId, 'dismissed')` and clears `aiSuggestion` state — Dismiss button wires to this |
| AI-04 | AI adapts to user patterns (learns what gets done vs ignored) | Already implemented — `ai_suggestion_status` field is passed as "Feedback" in every LLM prompt; scores are updated per cycle |
| AI-05 | AI suggestion updates every 15 minutes (fresh recommendations) | Already implemented — `setInterval` at page.tsx lines 254-261, 15 * 60 * 1000 ms |
| AI-06 | Task list auto-sorts by urgency + AI score (manual override available) | Already implemented — `sortingMode === 'ai'` branch in `fetchTasks()` sorts by `ai_relevance_score`; "AI Sorting" toggle in page.tsx lines 589-605 |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| framer-motion | Already in use | Enter/exit animation for inline card | Established pattern in `EodSummaryToast`, interrupted badge in `PlanningTaskRow` |
| lucide-react | Already in use | Wand2, Check, X icons | Already in `AISuggestion.tsx` |
| zustand | Already in use | `sortingMode`, `setActiveTaskId`, `toggleFocusMode` | All needed store fields already exist |
| Next.js / React | Already in use | Component and page framework | Project baseline |

**No new libraries need to be installed.**

### Alternatives Considered
None. All required libraries are already in use. The algorithm and endpoints are pre-built.

## Architecture Patterns

### Existing Code Structure (verified from source)

```
frontend/
├── app/page.tsx                  # Dashboard — all AI wiring lives here
│   ├── line 172: aiSuggestion state (AISuggestionType | null)
│   ├── line 196-201: fetchTasks() calls getAiSuggestion() in parallel
│   ├── line 254-261: 15-min polling interval
│   ├── line 293-304: handleAcceptSuggestion (MISSING: toggleFocusMode call)
│   ├── line 306-316: handleDismissSuggestion (complete)
│   ├── line 586-624: Planning mode Toggles Row (AI card goes AFTER this)
│   └── line 729-735: EXISTING floating AISuggestion render (REMOVE THIS)
├── components/AISuggestion.tsx   # Existing floating overlay component (REFACTOR)
└── lib/
    ├── api.ts                    # getAiSuggestion(), sendAiFeedback() — complete
    └── store.ts                  # sortingMode: 'manual' | 'ai' — complete
```

### Pattern 1: Inline Pinned Card (new position for AISuggestion)

The inline card replaces the `fixed top-24` overlay with a `relative` element inside the Planning mode section. The Framer Motion spring animation is the same pattern used by the interrupted badge in `PlanningTaskRow`:

```typescript
// Source: frontend/components/AISuggestion.tsx (existing, to be refactored)
// Change: className from "fixed top-24 left-1/2 -translate-x-1/2 ... z-50"
//         to a relative/block element inside the Planning mode <div>
<AnimatePresence>
  {isVisible && (
    <motion.div
      className="bg-white border border-primary/20 rounded-2xl p-5 mb-4"
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -16, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* task title, due date + duration, reasoning, Accept/Dismiss */}
    </motion.div>
  )}
</AnimatePresence>
```

### Pattern 2: Accept Handler — Add Focus Mode Switch

The current `handleAcceptSuggestion` (page.tsx line 293) sets `activeTaskId` but does NOT switch to Focus mode. The fix is a one-line addition:

```typescript
// Source: frontend/app/page.tsx line 293-304 (current)
const handleAcceptSuggestion = async () => {
  if (aiSuggestion) {
    const taskId = aiSuggestion.suggested_task_id;
    setActiveTaskId(taskId);
    setAiSuggestion(null);
    handleSwitchToFocus();  // ADD THIS LINE — per D-05
    try {
      await sendAiFeedback(taskId, 'accepted');
    } catch (err) {
      console.error("Failed to send AI feedback:", err);
    }
  }
}
```

Note: `handleSwitchToFocus()` already exists at page.tsx line 421-424 — it saves scroll position and calls `toggleFocusMode()`.

### Pattern 3: Inline Card Placement in Planning Mode

```typescript
// Source: frontend/app/page.tsx — Planning mode section (~line 586)
{!isFocusMode && (
  <div className="space-y-6 py-6">
    {/* Toggles Row — lines 588-624 */}
    <div className="flex items-center justify-end gap-6 ...">...</div>

    {/* AI Suggestion — INSERT HERE (per D-01) */}
    <AISuggestion
      isVisible={!!aiSuggestion}
      taskTitle={tasks.find(t => t.id === aiSuggestion?.suggested_task_id)?.title || ""}
      dueDate={tasks.find(t => t.id === aiSuggestion?.suggested_task_id)?.due_date}
      estimatedDuration={tasks.find(t => t.id === aiSuggestion?.suggested_task_id)?.estimated_duration}
      reasoning={aiSuggestion?.reasoning || ""}
      onAccept={handleAcceptSuggestion}
      onDismiss={handleDismissSuggestion}
    />

    {/* Quick Capture — lines 626-631 */}
    <div className="bg-white border ...">
      <TaskForm onTaskCreated={fetchTasks} />
    </div>
    ...
  </div>
)}
```

### Pattern 4: Remove Old Floating Render

Line 729-735 in `page.tsx` renders the floating `AISuggestion` component outside of mode conditions. This entire block must be removed (per D-04):

```typescript
// REMOVE lines 729-735:
<AISuggestion
  isVisible={!!aiSuggestion}
  taskTitle={tasks.find(t => t.id === aiSuggestion?.suggested_task_id)?.title || ""}
  reasoning={aiSuggestion?.reasoning || ""}
  onAccept={handleAcceptSuggestion}
  onDismiss={handleDismissSuggestion}
/>
```

### Anti-Patterns to Avoid

- **Rendering both inline and floating simultaneously:** The floating render at line 729 is outside any mode condition — it shows in both Focus and Planning mode. Remove it entirely before adding the inline version.
- **Calling toggleFocusMode() conditionally:** `handleSwitchToFocus()` saves scroll position AND toggles mode — always use this instead of calling `toggleFocusMode()` directly from planning context.
- **Adding new store fields for dismiss state:** The existing `aiSuggestion` state being set to `null` on dismiss is sufficient session-level hiding (D-08). No new store field needed.
- **Showing AI scores on task cards:** D-09/D-10 explicitly forbid this. The `ai_relevance_score` field must never be rendered in `PlanningTaskRow`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Enter/exit animation | Custom CSS transition | Framer Motion `AnimatePresence` + `motion.div` | Already in use; spring physics consistent with existing components |
| Optimistic UI for accept/dismiss | Delay state update until API returns | Set `aiSuggestion(null)` before `await sendAiFeedback()` | Established pattern in `handleAcceptSuggestion` (line 297) and `handleDismissSuggestion` (line 308) |
| 15-min polling | Build a new scheduler | Existing `setInterval` in `page.tsx` line 254 | Already implemented and correct |
| Session-level dismiss hiding | New boolean store field | `aiSuggestion` state = null (already works) | Polling brings a fresh suggestion; null state hides the card until next poll |

**Key insight:** The backend AI system is complete. Every new line of code in this phase is UI-layer only.

## Common Pitfalls

### Pitfall 1: Rendering Both Overlay and Inline Card
**What goes wrong:** The old floating render (line 729-735) remains after adding the inline card. Both render simultaneously — the overlay appears on top, the inline card is buried, user sees duplicated UI.
**Why it happens:** The floating render is outside both mode blocks (Focus/Planning), so it is always active.
**How to avoid:** Remove lines 729-735 in the same PR/commit as adding the inline version. Never add the inline render without removing the floating render first.
**Warning signs:** Two AI suggestion cards visible on screen; AI suggestion appears in Focus mode where it shouldn't.

### Pitfall 2: Accept Without Mode Switch
**What goes wrong:** `handleAcceptSuggestion` sets `activeTaskId` but user stays in Planning mode. D-05 requires an immediate switch to Focus mode.
**Why it happens:** The existing handler (line 293-304) does NOT call `handleSwitchToFocus()`. The scroll position is not saved either.
**How to avoid:** Add `handleSwitchToFocus()` call after `setActiveTaskId(taskId)` in `handleAcceptSuggestion`.
**Warning signs:** After clicking Accept, user remains on the planning screen instead of seeing the Focus mode task card.

### Pitfall 3: AISuggestion Props Interface Mismatch
**What goes wrong:** The current `AISuggestionProps` interface lacks `dueDate` and `estimatedDuration`. D-02 requires the inline card to show due date + estimated duration. Adding props without updating the interface causes TypeScript errors.
**Why it happens:** The floating overlay didn't need to display those fields (they were implicit in the task list). The inline card per D-02 must display them.
**How to avoid:** Extend `AISuggestionProps` with `dueDate?: string` and `estimatedDuration?: number` when refactoring the component.
**Warning signs:** TypeScript build error on `dueDate` or `estimatedDuration` prop.

### Pitfall 4: AI Card Visible in Focus Mode
**What goes wrong:** If the inline `AISuggestion` render is placed outside the `{!isFocusMode && ...}` block, the suggestion card appears over the Focus mode task card, obscuring it.
**Why it happens:** Developer places the inline card at page root level for convenience.
**How to avoid:** The inline card MUST be inside `{!isFocusMode && (...)}` — in the Planning mode section.
**Warning signs:** AI suggestion card visible while in Focus mode.

### Pitfall 5: Task Lookup Returning Empty String
**What goes wrong:** The inline card renders with blank title/duration because the task hasn't loaded yet or the ID doesn't match.
**Why it happens:** `aiSuggestion` arrives asynchronously; `tasks` array may still be loading when suggestion arrives.
**How to avoid:** Guard the card render with `!!aiSuggestion && tasks.find(...)` — only show when the task is found. The existing pattern `tasks.find(t => t.id === aiSuggestion?.suggested_task_id)?.title || ""` already handles this gracefully.
**Warning signs:** Card shows with empty title and zero duration.

## Code Examples

### Existing AISuggestion Component (source of truth for refactor)
```typescript
// Source: frontend/components/AISuggestion.tsx
interface AISuggestionProps {
  taskTitle: string
  reasoning: string
  isVisible: boolean
  onAccept: () => void
  onDismiss: () => void
}
// className: "fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-md ... z-50"
// animation: initial={{ y: -80, opacity: 0 }}, exit={{ y: -80, opacity: 0 }}
```

### Existing AI Feedback API (already complete)
```typescript
// Source: frontend/lib/api.ts lines 197-206
export interface AISuggestion {
  suggested_task_id: string;
  reasoning: string;
}

export async function getAiSuggestion(): Promise<AISuggestion> {
  return request<AISuggestion>(`${API_BASE_URL}/tasks/ai-suggestion`);
}

export async function sendAiFeedback(taskId: string, status: 'accepted' | 'dismissed' | 'ignored'): Promise<Task> {
  return request<Task>(`${API_BASE_URL}/tasks/${taskId}/ai-feedback`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}
```

### Existing Sort Logic (AI mode already works)
```typescript
// Source: frontend/app/page.tsx lines 206-226 (inside fetchTasks)
if (sortingMode === 'ai') {
  const scoreA = a.ai_relevance_score || 0
  const scoreB = b.ai_relevance_score || 0
  if (scoreA !== scoreB) return scoreB - scoreA
}
```

### Backend Endpoint (complete, no changes needed)
```python
# Source: backend/app/routers/tasks.py lines 24-33
@router.get("/ai-suggestion", response_model=dict)
async def get_ai_suggestion(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    prioritization_service = AIPrioritizationService(session, current_user.id)
    suggestion = await prioritization_service.get_ai_suggestion()
    if not suggestion:
        raise HTTPException(status_code=404, detail="No active tasks or AI failed to provide a suggestion.")
    return suggestion
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Floating overlay (`fixed top-24`) | Inline pinned card (relative, inside Planning mode) | This phase | Eliminates overlay competing with task list; feels like part of the task list |
| Accept closes card only | Accept sets active task + switches to Focus mode | This phase | User immediately enters execution mode |

**Deprecated/outdated in this phase:**
- `AISuggestion` component `fixed` positioning — replaced by inline `relative` layout
- Old `AISuggestion` render at page.tsx line 729 — removed entirely

## Open Questions

1. **Due date display format in inline card**
   - What we know: D-02 requires showing due date; `task.due_date` is an ISO string
   - What's unclear: Whether to show relative ("in 2 days") or absolute ("Mar 23") — `UrgencyIndicator` component already handles urgency display in `PlanningTaskRow`, could be reused
   - Recommendation: Use `UrgencyIndicator` component (already imported in page.tsx) for consistency — this is Claude's discretion per CONTEXT.md

2. **Behavior when `aiSuggestion` is null but suggestion was dismissed mid-polling-cycle**
   - What we know: After dismiss, `aiSuggestion` is set to null — card hides. Next 15-min poll will call `getAiSuggestion()`, which may return the same task if it's still highest-scored.
   - What's unclear: Should dismiss within a polling cycle prevent that task from being re-shown until the next poll?
   - Recommendation: Current behavior (null = hidden until next poll) is correct per D-08. The 15-min cycle is the natural re-surface window. No additional dismissal state needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd /home/rbrown/workspace/liminal/frontend && npx vitest run --reporter=verbose 2>&1 \| tail -20` |
| Full suite command | `cd /home/rbrown/workspace/liminal/frontend && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | Inline card renders in Planning mode with task title | unit | `npx vitest run __tests__/components/AISuggestion.test.tsx` | ❌ Wave 0 |
| AI-02 | Card shows due date + estimated duration from task | unit | `npx vitest run __tests__/components/AISuggestion.test.tsx` | ❌ Wave 0 |
| AI-03 | Dismiss button calls onDismiss, card hides | unit | `npx vitest run __tests__/components/AISuggestion.test.tsx` | ❌ Wave 0 |
| AI-04 | sendAiFeedback called with correct status | unit | `npx vitest run __tests__/components/AISuggestion.test.tsx` | ❌ Wave 0 |
| AI-05 | Polling interval set to 15 minutes | manual | Verify `setInterval` constant in page.tsx | n/a |
| AI-06 | AI sorting toggle changes sort order | manual | Human verification in browser | n/a |

### Sampling Rate
- **Per task commit:** `cd /home/rbrown/workspace/liminal/frontend && npx vitest run __tests__/components/AISuggestion.test.tsx`
- **Per wave merge:** `cd /home/rbrown/workspace/liminal/frontend && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/components/AISuggestion.test.tsx` — covers AI-01, AI-02, AI-03, AI-04: inline card renders with task data, accept triggers mode switch, dismiss hides card
- [ ] No additional framework setup needed — vitest + React Testing Library already configured

## Sources

### Primary (HIGH confidence)
- Direct source inspection: `frontend/components/AISuggestion.tsx` — existing component structure and props
- Direct source inspection: `frontend/app/page.tsx` — full AI integration, polling, handlers, exact line numbers
- Direct source inspection: `frontend/lib/api.ts` — AISuggestion interface, getAiSuggestion(), sendAiFeedback()
- Direct source inspection: `frontend/lib/store.ts` — sortingMode field, setSortingMode, all required store state
- Direct source inspection: `backend/app/agents/prioritization.py` — AIPrioritizationService, full scoring algorithm
- Direct source inspection: `backend/app/routers/tasks.py` — GET /tasks/ai-suggestion, POST /tasks/{id}/ai-feedback
- Direct source inspection: `backend/app/models.py` — ai_relevance_score, ai_suggestion_status, AISuggestionStatus enum
- Direct source inspection: `frontend/components/EodSummaryToast.tsx` — reference pattern for non-blocking inline card
- Direct source inspection: `frontend/vitest.config.ts` — test framework configuration

### Secondary (MEDIUM confidence)
None needed — all findings are from direct source code inspection.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json usage and direct component inspection
- Architecture: HIGH — all patterns verified from source code with exact line numbers
- Pitfalls: HIGH — derived from direct reading of the gaps between current code and CONTEXT.md requirements
- Test framework: HIGH — vitest.config.ts and existing test files verified

**Research date:** 2026-03-21
**Valid until:** Until page.tsx or AISuggestion.tsx is modified by another phase (these files are stable)
