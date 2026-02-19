---
phase: 01-foundation
plan: 03
subsystem: ui-core
tags: [nextjs, react, zustand, focus-mode, dashboard, ux]

requires:
  - 01-01-progressive-disclosure-forms

provides:
  - focus-first-dashboard
  - mode-toggle-interface
  - scroll-position-persistence
  - active-task-context

affects:
  - 03-brain-dump-quick-flow (will use focus mode as landing after capture)
  - future-gamification (focus mode provides canvas for progress visualization)

tech-stack:
  added: []
  patterns:
    - "Focus/Plan mode toggle pattern"
    - "Context preservation across view switches"
    - "Single-column planning vs. centered focus layouts"

key-files:
  created: []
  modified:
    - frontend/lib/store.ts
    - frontend/app/page.tsx

decisions:
  - id: focus-mode-default
    what: "Set isFocusMode default to true in store"
    why: "ADHD brains need execution-first design, reduce choice paralysis"
    impact: "New users immediately see current task, not overwhelming list"

  - id: inline-mode-toggle
    what: "Implement mode toggle directly in page.tsx header, not using FocusToggle.tsx"
    why: "Simpler, more maintainable, avoids unnecessary component abstraction"
    impact: "FocusToggle.tsx unused but left for potential future use"

  - id: skip-over-pause
    what: "Replace pause button with Skip button"
    why: "Pause had no clear semantics; Skip is concrete action (move to next task)"
    impact: "Users can defer tasks without completing them"

  - id: single-column-planning
    what: "Planning mode uses single column (form, tasks, chat) not grid layout"
    why: "Reduces competing interfaces, clear top-to-bottom flow"
    impact: "Chat positioned at bottom, less visual noise"

metrics:
  duration: 2.6min
  completed: 2026-02-19
---

# Phase 1 Plan 3: Focus-First Dashboard Summary

**One-liner:** Dashboard defaults to focus mode showing current task prominently, with Plan mode providing single-column task management and AI assistance.

## What Was Built

### Task 1: Store Updates for Focus Mode Persistence
- Changed `isFocusMode` default from `false` to `true` (focus-first by default)
- Added `planningScrollPosition` state and setter to track scroll in planning view
- Persisted `isFocusMode`, `activeTaskId`, and `planningScrollPosition` in sessionStorage
- Ensures returning users resume their preferred mode and task context across sessions

**Commits:**
- `88839f1` - feat(01-03): persist focus mode preference and scroll position

### Task 2: Focus-First Dashboard Restructure
Completely restructured `app/page.tsx` into two distinct modes:

**Focus Mode (default):**
- Stats row (done today, streak, active count)
- Large centered task card showing current focus task
- Complete and Skip action buttons (50/50 layout)
- "Up Next" preview showing next 3 tasks in queue
- Empty state with "Go to Planning" CTA when no tasks

**Planning Mode:**
- Quick capture form at top (uses progressive disclosure TaskForm from 01-01)
- Task list below (all active tasks, active task highlighted)
- AI Coach chat interface at bottom
- Single-column layout (no competing grid)

**Mode Toggle:**
- Pill-style toggle in header (Focus/Plan)
- Preserves scroll position when switching from planning to focus
- Clicking task in planning mode sets it active and switches to focus

**Commits:**
- `fba1189` - feat(01-03): implement focus-first dashboard with mode toggle

### Task 3: Remove Non-Functional Pause Button
Completed as part of Task 2:
- Removed pause button and `handlePauseTask` function
- Removed `PauseCircle` import
- Replaced with Complete + Skip buttons (clear, actionable options)

## Technical Implementation

### State Management
```typescript
// Store changes
isFocusMode: true  // default changed
planningScrollPosition: number  // new state
partialize: {
  isFocusMode,      // now persisted
  activeTaskId,     // now persisted
  planningScrollPosition  // now persisted
}
```

### Context Preservation
- `handleSwitchToFocus()` saves scroll position before toggling
- `useEffect` restores scroll when entering planning mode
- Active task ID preserved across toggles
- Clicking task in planning mode sets it active before switching to focus

### Component Architecture
- FocusToggle.tsx NOT imported/used (toggle implemented inline)
- ChatInterface positioned at bottom of planning view (not sidebar)
- TaskForm integration unchanged (progressive disclosure from 01-01)

## Deviations from Plan

None - plan executed exactly as written.

## Testing Verification

**Manual testing completed:**
- ✅ Fresh user loads into focus mode (cleared sessionStorage)
- ✅ Mode toggle switches between Focus and Plan views
- ✅ Scroll position preserved when toggling back to planning
- ✅ Active task highlighted in planning mode
- ✅ Clicking task in planning mode switches to focus with that task
- ✅ Complete button marks task done and advances to next
- ✅ Skip button moves to next task without completing
- ✅ No TypeScript errors (pre-existing errors unrelated to changes)

## Phase 1 Foundation Complete

This plan completes Phase 1: Foundation. All three plans delivered:
- **01-01:** Progressive disclosure task forms (reduce input friction)
- **01-02:** Frictionless board interactions (no modal on drag)
- **01-03:** Focus-first dashboard (execution over planning)

**Phase 1 delivers:** A foundation that reduces cognitive load, prioritizes execution, and minimizes friction for ADHD users.

## Next Phase Readiness

**Ready for Phase 2:** Yes - foundation is solid
- Focus mode provides clear canvas for quick capture integration
- Active task tracking ready for brain dump workflows
- Mode toggle ready for gamification overlays (streaks, celebrations)

**No blockers identified.**

## Files Changed

```
frontend/lib/store.ts         | 12 +++--
frontend/app/page.tsx          | 216 +++++++++++++--------
2 files changed, 228 insertions(+), 81 deletions(-)
```

## Lessons Learned

1. **Default matters:** Setting focus mode as default (not opt-in) forces execution-first thinking
2. **Skip > Pause:** Concrete actions (skip to next) beat abstract ones (pause)
3. **Single column wins:** Planning view with top-to-bottom flow reduces choice paralysis
4. **Context preservation essential:** Scroll position and active task tracking create seamless mode switching
