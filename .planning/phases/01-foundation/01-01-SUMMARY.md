---
phase: 01-foundation
plan: 01
subsystem: ui
tags: [react, framer-motion, progressive-disclosure, adhd-ux]

# Dependency graph
requires:
  - phase: 00-research
    provides: ADHD-friendly UX patterns and progressive disclosure research
provides:
  - Title-only task creation with smart defaults
  - Progressive disclosure form pattern
  - Auto-calculated priority/value/effort from urgency signals
  - ADHD-friendly capture-first workflow
affects: [02-chat, 03-prioritization, 04-gamification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Smart defaults calculation based on urgency (NOW/NOT NOW)"
    - "Progressive disclosure with AnimatePresence"
    - "Preset buttons replacing abstract numeric inputs"

key-files:
  created:
    - frontend/lib/smartDefaults.ts
  modified:
    - frontend/components/TaskForm.tsx
    - frontend/lib/api.ts

key-decisions:
  - "Auto-calculate priority from due_date urgency rather than requiring manual input"
  - "Remove all abstract 1-100 numeric inputs, replace with presets or auto-calc"
  - "Use native Date math instead of date-fns for simple urgency calculations"
  - "Apply smart defaults in both TaskForm and parseQuickCapture for consistency"

patterns-established:
  - "calculateSmartDefaults: Urgency-based auto-scoring (due today = 90, this week = 70, later = 30)"
  - "Progressive disclosure: Show title only, expand to due_date/duration/description on demand"
  - "Duration presets: Quick (15m), Medium (30m), Long (60m), Custom"

# Metrics
duration: 3min
completed: 2026-02-01
---

# Phase 01-01: Smart Defaults & Progressive Disclosure Summary

**Title-only task creation with ADHD-friendly auto-scoring from urgency signals, progressive disclosure for optional fields, and preset buttons replacing abstract numeric inputs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-01T17:05:54Z
- **Completed:** 2026-02-01T17:09:17Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created smart defaults utility that auto-calculates priority/value/effort based on urgency (NOW/NOT NOW)
- Refactored TaskForm to show only title by default with progressive disclosure for optional fields
- Eliminated abstract 1-100 numeric inputs (replaced with duration presets)
- Integrated smart defaults into both TaskForm and parseQuickCapture for consistent behavior
- Reduced cognitive load at moment of capture from 4+ decisions to 1 (title only)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create smart defaults utility** - `da6ccfd` (feat)
2. **Task 2: Refactor TaskForm to progressive disclosure with title-only default** - `abe6a69` (feat)
3. **Task 3: Update parseQuickCapture to use smart defaults** - `41f176a` (feat)

## Files Created/Modified

### Created
- `frontend/lib/smartDefaults.ts` - Auto-calculates priority/value/effort from due_date + duration using ADHD-friendly urgency logic

### Modified
- `frontend/components/TaskForm.tsx` - Progressive disclosure form (title only default, optional fields behind "Add details" toggle)
- `frontend/lib/api.ts` - Updated parseQuickCapture to use smart defaults with user shorthand overrides

## Decisions Made

1. **Native Date math over date-fns:** For simple urgency calculations (hours until due), native Date.getTime() is sufficient. No need for external dependency.

2. **Smart defaults formula:**
   - Priority: Due <24h = 90 (high), <72h = 70, <7d = 50, else 30
   - Value: Duration <15m = 90 (quick win), <30m = 70, <60m = 50, else 30
   - Effort: Equals estimated_duration

3. **Progressive disclosure pattern:** Show only required field (title) by default. Optional fields (due_date, duration, description) behind "Add details" toggle using Framer Motion AnimatePresence.

4. **Preset buttons for duration:** Quick (15m), Medium (30m), Long (60m), Custom input. Removes cognitive load of abstract numeric scoring.

5. **parseQuickCapture integration:** Apply smart defaults first, then overlay user-specified shorthand (!high, v:90, 30m). Preserves power user shortcuts while providing smart defaults for plain input.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **npm dependencies not installed:** Frontend node_modules didn't exist at execution start. Ran `npm install` to resolve. Build and TypeScript checks passed after installation.

2. **Existing uncommitted changes:** Found modified EditTaskModal.tsx and package-lock.json from previous work. Left these unstaged as they're not part of current plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next phase:**
- Smart defaults foundation enables AI-assisted task creation in Phase 2 (Chat interface)
- Progressive disclosure pattern can be reused for theme assignment, initiative creation
- parseQuickCapture ready to be enhanced with natural language parsing via LLM

**No blockers identified.**

---
*Phase: 01-foundation*
*Completed: 2026-02-01*
