---
phase: 06-ai-prioritization
plan: "01"
subsystem: frontend
tags: [ai-suggestion, component, tdd, accessibility]
dependency_graph:
  requires: []
  provides: [AISuggestion-inline-card, AISuggestion-tests]
  affects: [frontend/app/page.tsx]
tech_stack:
  added: []
  patterns: [TDD-red-green, framer-motion-spring, vitest-rtl]
key_files:
  created:
    - frontend/__tests__/components/AISuggestion.test.tsx
  modified:
    - frontend/components/AISuggestion.tsx
decisions:
  - Use local date parsing (year/month/day split) instead of new Date(ISO) to avoid UTC timezone offset shifting displayed date
  - Find buttons by visible text (getByText) not role+name when aria-label overrides accessible name
metrics:
  duration_seconds: 102
  completed_date: "2026-03-21"
  tasks_completed: 2
  files_changed: 2
requirements:
  - AI-01
  - AI-02
  - AI-03
  - AI-04
---

# Phase 06 Plan 01: AISuggestion Inline Card Refactor Summary

AISuggestion converted from fixed floating overlay to inline pinned card with dueDate/estimatedDuration props, WCAG-compliant touch targets, and 7 passing unit tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write AISuggestion unit tests (RED) | 02d762f | frontend/__tests__/components/AISuggestion.test.tsx |
| 2 | Refactor AISuggestion to inline card (GREEN) | 0240bee | frontend/components/AISuggestion.tsx, frontend/__tests__/components/AISuggestion.test.tsx |

## What Was Built

**AISuggestion component** refactored from a `fixed top-24 z-50` floating overlay to a `bg-white border border-gray-100 rounded-2xl p-6 mb-4 shadow-sm` inline block element that flows naturally in the Planning mode layout.

**New props added:**
- `dueDate?: string` — ISO date string rendered as "Due Mar 25"
- `estimatedDuration?: number` — minutes rendered as "30 min"

**Button text updated** per UI-SPEC copywriting contract:
- "Accept" -> "Start This Task" (with aria-label for screen readers)
- "Dismiss" -> "Not Now" (with aria-label for screen readers)

**Animation updated:** `y: -80` -> `y: -16` for subtler inline entry matching EodSummaryToast pattern.

**Accessibility:** Both buttons get `min-h-[44px]` (WCAG 2.5.5), decorative icons get `aria-hidden="true"`.

**Tests:** 7 unit tests covering render, optional props display, visibility=false (empty DOM), accept click, dismiss click, label text, and undefined optional props.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed UTC timezone date offset in due date display**
- **Found during:** Task 2 verification (tests still failing after initial GREEN attempt)
- **Issue:** `new Date('2026-03-25')` parses as UTC midnight, then `.toLocaleDateString()` with negative UTC offset renders as "Mar 24" instead of "Mar 25"
- **Fix:** Parse ISO date string manually (`dueDate.split('-').map(Number)`) and construct `new Date(year, month-1, day)` in local time
- **Files modified:** frontend/components/AISuggestion.tsx
- **Commit:** 0240bee

**2. [Rule 1 - Bug] Fixed button query in tests using aria-label**
- **Found during:** Task 2 verification (tests failing with "Unable to find accessible element with name /Start This Task/i")
- **Issue:** `getByRole('button', { name: /Start This Task/i })` fails when button has `aria-label` attribute overriding its accessible name. The aria-label text is "Accept AI suggestion: start working on Fix login bug", not "Start This Task"
- **Fix:** Changed test queries from `getByRole('button', { name: ... })` to `getByText('Start This Task')` and `getByText('Not Now')` to match visible button text
- **Files modified:** frontend/__tests__/components/AISuggestion.test.tsx
- **Commit:** 0240bee

## Known Stubs

None — the component renders all data from props. Wiring into page.tsx (inserting inline in Planning section, removing floating render) is handled in plan 06-02.

## Self-Check: PASSED

- frontend/components/AISuggestion.tsx — exists, contains `dueDate?: string`, `estimatedDuration?: number`, `shadow-sm`, `mb-4`, `Start This Task`, `Not Now`, `min-h-[44px]` (x2), `y: -16`, `aria-label`. Does NOT contain `fixed top-24` or `z-50`.
- frontend/__tests__/components/AISuggestion.test.tsx — exists, contains `describe('AISuggestion'`, 7 `it(` blocks, `vi.mock('framer-motion'`, `'Start This Task'`, `'Not Now'`, `'AI Suggestion: Do This Now'`.
- Commits 02d762f and 0240bee confirmed in git log.
- All 7 tests pass: `Test Files 1 passed (1), Tests 7 passed (7)`.
