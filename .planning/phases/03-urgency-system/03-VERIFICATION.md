---
phase: 03-urgency-system
verified: 2026-02-19T12:00:00Z
status: human_needed
score: 6/6 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/6
  gaps_closed:
    - "Tasks visually change color as deadline approaches (green to yellow to orange to red border)"
    - "Tasks in backlog for 3+ days fade and desaturate (visual aging)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Urgency color gradient on task cards"
    expected: "A task with a due date 2 hours from now shows a yellow-orange left border. A task due tomorrow shows a green border. A task due in 5 minutes shows a red border."
    why_human: "Color rendering requires visual inspection; automated checks confirm the logic is wired but cannot confirm the correct hex color renders visually in the browser"
  - test: "Stale backlog task visual aging"
    expected: "A task with status 'backlog' created 4+ days ago appears faded (50% opacity, slight grayscale) compared to a fresh task"
    why_human: "Opacity and CSS filter rendering require live browser inspection"
  - test: "Notification soft-ask session persistence"
    expected: "After clicking 'Not now' on the banner, refresh the page — the 'Get reminded 1 hour before deadlines?' banner should NOT reappear"
    why_human: "sessionStorage read-on-mount and React re-render behavior require live browser interaction to confirm"
  - test: "Countdown timer live updates"
    expected: "A task with a due date in the near future (e.g., 30 minutes) shows countdown text that updates approximately every second without any page refresh"
    why_human: "requestAnimationFrame real-time behavior requires live browser observation"
---

# Phase 3: Urgency System Verification Report

**Phase Goal:** Users experience visual time pressure that creates NOW-ness and activates ADHD focus
**Verified:** 2026-02-19T12:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (PlanningTaskRow added to page.tsx)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Tasks visually change color as deadline approaches (green to yellow to orange to red border) | VERIFIED | `PlanningTaskRow` in `app/page.tsx` (line 33) calls `useUrgencyColor(task.due_date, task.created_at, task.status)` and applies `{ borderLeft: '4px solid', borderLeftColor: urgencyColor }` as an inline style conditioned on `task.due_date` existing (lines 36-38). Every active task in the planning view list is rendered via `PlanningTaskRow` (line 466). |
| 2 | Tasks display countdown timer showing time remaining in human-readable format | VERIFIED | `UrgencyIndicator` imported at `page.tsx` line 10 and rendered at line 55 inside `PlanningTaskRow` for every task. `useCountdown` (RAF-based, `formatDistanceToNowStrict`) powers the live display. |
| 3 | Overdue tasks show warm orange treatment with encouraging "Let's finish this" framing | VERIFIED | `UrgencyIndicator.tsx` line 33-40: `isOverdue` path renders `text-orange-500 font-medium` with "Let's finish this" text. `COLOR_OVERDUE = '#f97316'` (orange-500) in `urgency.ts` line 23. No shame language found. |
| 4 | Tasks in backlog for 3+ days fade and desaturate (visual aging) | VERIFIED | `PlanningTaskRow` (line 34) calls `isStaleTask(task.created_at, task.status)`. Line 45 applies `style={{ opacity: stale ? 0.5 : 1, filter: stale ? 'grayscale(30%)' : undefined }}` directly to the rendered `<li>` element. |
| 5 | Due today section visible on dashboard with capacity summary | VERIFIED | `CapacitySummary` imported at `page.tsx` line 9, rendered at line 439 inside the planning mode view (`{!isFocusMode && ...}`). Shows `{hoursRemaining.toFixed(1)}h left` and `{tasksFit} of {todayTasks.length} tasks fit`, with over-capacity in `text-orange-600`. |
| 6 | Notification soft-ask appears when tasks with due dates load, opt-in only | VERIFIED | `useNotifications` wired at `page.tsx` line 12-13 (import), line 89 (destructure). `triggerSoftAsk()` fires in `useEffect` (lines 149-163) when tasks have `due_dates` and permission is `'default'` and not dismissed. Browser dialog only triggered on "Enable" button click (line 311). `sessionStorage` dismissal confirmed (lines 97-103). |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/lib/urgency.ts` | getUrgencyColor, getUrgencyLevel, isStaleTask | VERIFIED | All 3 functions exported. HSL gradient via chroma-js. `COLOR_OVERDUE = '#f97316'` (warm orange). Gray for done/no-date. 117 lines, substantive. |
| `frontend/lib/hooks/useCountdown.ts` | requestAnimationFrame countdown hook | VERIFIED | RAF with 1000ms throttle. `formatDistanceToNowStrict` for human-readable display. Stops loop on overdue. 83 lines, substantive. |
| `frontend/lib/hooks/useUrgencyColor.ts` | Memoized urgency color hook | VERIFIED | Wraps `getUrgencyColor` in `useMemo` with `[dueDate, createdAt, status]` deps. 36 lines. |
| `frontend/components/CapacitySummary.tsx` | Due today capacity display | VERIFIED | Renders `hoursRemaining.toFixed(1)h left`, greedy task fit count, over-capacity in orange. `useMemo` on calculation. 93 lines, substantive. |
| `frontend/lib/notifications.ts` | requestNotificationPermission, scheduleTaskNotification, cancelTaskNotification | VERIFIED | Full SSR-safe implementation. 1-hour-before scheduling via `setTimeout`. 25-day ceiling. Module-level `Map` for deduplication. 90 lines, substantive. |
| `frontend/lib/hooks/useNotifications.ts` | Notification permission hook with soft-ask | VERIFIED | Soft-ask pattern: `triggerSoftAsk()` separated from `requestPermission()`. SSR-safe guards. 94 lines, substantive. |
| `frontend/components/UrgencyIndicator.tsx` | Countdown display with urgency styling | VERIFIED | `useCountdown` wired. Overdue: "Let's finish this" in `text-orange-500`. Critical: `text-red-500`. Soon/urgent: amber. Safe: gray. 54 lines, substantive. |
| `frontend/components/TaskCard.tsx` | Task card with urgency color border and visual aging | VERIFIED (wired to tests, also contains urgency logic) | Fully implemented with urgency border, stale fade, `React.memo`. Used in test files. Note: the live dashboard now uses `PlanningTaskRow` (inline in page.tsx) rather than TaskCard for the task list — TaskCard still wires urgency correctly and could be used in future views (board, etc.). |
| `frontend/app/page.tsx` | Dashboard with PlanningTaskRow (urgency color + stale aging), CapacitySummary, UrgencyIndicator, notification soft-ask | VERIFIED | All four urgency concerns wired: (1) `PlanningTaskRow` with urgency border + stale styling; (2) `UrgencyIndicator` per task; (3) `CapacitySummary` in planning view; (4) notification soft-ask banner. |
| `frontend/next.config.js` | transpilePackages: ['chroma-js'] | VERIFIED | Line 4: `transpilePackages: ['chroma-js']`. Required for chroma-js v3 ESM compatibility with Next.js webpack. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `PlanningTaskRow` (page.tsx) | `useUrgencyColor.ts` | `useUrgencyColor` hook call | VERIFIED | page.tsx line 13: import; line 33: `useUrgencyColor(task.due_date, task.created_at, task.status)`; line 37: applied via inline `borderLeftColor` style |
| `PlanningTaskRow` (page.tsx) | `urgency.ts` | `isStaleTask` for visual aging | VERIFIED | page.tsx line 14: `import { isStaleTask } from '@/lib/urgency'`; line 34: `const stale = isStaleTask(task.created_at, task.status)`; line 45: applied to `<li>` opacity/filter inline style |
| `useUrgencyColor.ts` | `urgency.ts` | `import getUrgencyColor` | VERIFIED | Line 2: `import { getUrgencyColor } from '@/lib/urgency'`; line 33: called inside `useMemo` |
| `useCountdown.ts` | `date-fns` | `formatDistanceToNowStrict` | VERIFIED | Lines 2, 54, 69: `formatDistanceToNowStrict` used for display string |
| `UrgencyIndicator.tsx` | `useCountdown.ts` | `useCountdown` hook | VERIFIED | Line 4: import; line 26: `useCountdown(dueDate)` called with result destructured |
| `UrgencyIndicator.tsx` | `urgency.ts` | `getUrgencyLevel` for styling | VERIFIED | Line 5: import; line 30: `getUrgencyLevel(dueDate)` to determine color class |
| `useNotifications.ts` | `notifications.ts` | import scheduling functions | VERIFIED | Lines 14-18: `cancelTaskNotification`, `requestNotificationPermission`, `scheduleTaskNotification` all imported |
| `page.tsx` | `CapacitySummary.tsx` | component import and render | VERIFIED | Line 9: import; line 439: `<CapacitySummary tasks={tasks} />` inside planning mode section |
| `page.tsx` | `useNotifications` | hook call and soft-ask wiring | VERIFIED | Line 12: import; line 89: destructure including `triggerSoftAsk`; lines 149-163: useEffect triggers `triggerSoftAsk()`; lines 306-323: banner UI with conditional render |
| `page.tsx` | `UrgencyIndicator.tsx` | rendered inside PlanningTaskRow | VERIFIED | Line 10: import; line 55: `<UrgencyIndicator dueDate={task.due_date} size="sm" />` inside each `PlanningTaskRow` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| URGENCY-01 | 03-03 | Tasks change color as deadline approaches (visual time pressure) | SATISFIED | `PlanningTaskRow` in page.tsx: `useUrgencyColor` → `borderLeftColor: urgencyColor` inline style on `<li>`. Every active task in planning view gets urgency border when `task.due_date` is set. |
| URGENCY-02 | 03-03 | Tasks show "X hours left" countdown (scarcity framing) | SATISFIED | `UrgencyIndicator` renders inside `PlanningTaskRow` at page.tsx line 55. `useCountdown` (RAF-based) provides live `timeLeft` string displayed as "{timeLeft} left". |
| URGENCY-03 | 03-03 | Overdue tasks have distinct visual treatment (not shame-inducing) | SATISFIED | `UrgencyIndicator.tsx` `isOverdue` path: `text-orange-500 font-medium` + "Let's finish this". No "late", "fail", "behind", or "missed" language found anywhere in urgency-related components. |
| URGENCY-04 | 03-02 | "Due today" section shows time-boxed capacity ("2 hours left, 3 tasks remaining") | SATISFIED | `CapacitySummary` at page.tsx line 439 in planning mode. Renders `{hoursRemaining.toFixed(1)}h left` and `{tasksFit} of {todayTasks.length} tasks fit`. Over-capacity in warm `text-orange-600`. |
| URGENCY-05 | 03-03 | Tasks visually "age" after 3 days in backlog (fade/change style) | SATISFIED | `PlanningTaskRow` calls `isStaleTask(task.created_at, task.status)` (page.tsx line 34) and applies `opacity: stale ? 0.5 : 1, filter: stale ? 'grayscale(30%)' : undefined` (line 45) to the rendered `<li>`. |
| URGENCY-06 | 03-02/03-03 | User receives browser notification 1 hour before deadline (opt-in) | SATISFIED | Full soft-ask flow: `triggerSoftAsk()` in useEffect, banner shown via `showSoftAsk && !softAskDismissed`, "Enable" button calls `requestPermission()` on user click only. `scheduleTaskNotification` uses `setTimeout` 1 hour before due. `sessionStorage` prevents repeat prompts. |

Note: REQUIREMENTS.md still marks all 6 as `[ ] Pending` — that file tracks planned status only and was not modified during this phase. All 6 URGENCY requirements are satisfied in the codebase.

No orphaned requirements: all 6 requirements mapped to Phase 3 in REQUIREMENTS.md are accounted for by plan 03-01, 03-02, and 03-03.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/next.config.js` | 8-10 | `typescript: { ignoreBuildErrors: true }` | Warning | TypeScript errors suppressed at build time. Pre-existing TS issues noted in deferred-items.md. Does not block urgency features but masks type regressions. |

No blocker anti-patterns. Previously-flagged orphaned `TaskCard` issue is resolved — `PlanningTaskRow` now implements the urgency wiring directly in page.tsx for the planning task list.

### Human Verification Required

All automated checks pass. The following items require running the application with live data to confirm visual/real-time behavior:

#### 1. Urgency color gradient on task cards

**Test:** Start the app and create three tasks: one with a due date 2 hours from now, one due tomorrow, one with no due date. View all three in planning mode.
**Expected:** 2-hour task has a yellow-orange left border. Tomorrow's task has a green left border. No-due-date task has no left border (no urgency color applied).
**Why human:** Color rendering requires visual inspection. The logic is verified wired (urgency.ts chroma-js scale returns the correct hex, inline style applies it), but actual browser color rendering cannot be confirmed programmatically.

#### 2. Stale backlog task visual aging

**Test:** Find or create a task with status "backlog" created more than 3 days ago. View in planning mode alongside a fresh task.
**Expected:** The stale task appears visually faded (approximately half opacity) and slightly desaturated compared to fresh tasks.
**Why human:** Opacity and CSS filter effects require live browser rendering to confirm visual appearance.

#### 3. Notification soft-ask session persistence

**Test:** Load the dashboard with at least one task that has a due date. Observe the "Get reminded 1 hour before deadlines?" banner. Click "Not now". Refresh the page.
**Expected:** Banner does not reappear after clicking "Not now" and refreshing.
**Why human:** `sessionStorage.getItem('notif-soft-ask-dismissed')` on mount and React re-render behavior require live browser interaction.

#### 4. Countdown timer live updates

**Test:** View a task with a due date 30 minutes in the future. Watch the countdown text for 3-5 seconds.
**Expected:** The countdown text (e.g., "30 minutes left") updates approximately every second without page refresh.
**Why human:** requestAnimationFrame behavior and live DOM updates require browser observation.

### Gaps Summary

No gaps remain. Both previously-failed items are now VERIFIED:

**Gap 1 closed (URGENCY-01):** `PlanningTaskRow` extracted as a named function component in `app/page.tsx` (lines 18-67). This component calls `useUrgencyColor` per task and applies the result as an inline `borderLeftColor` style on the `<li>` element when `task.due_date` is present. All active tasks in the planning view task list are rendered via `PlanningTaskRow` (line 466).

**Gap 2 closed (URGENCY-05):** `PlanningTaskRow` also calls `isStaleTask(task.created_at, task.status)` and applies `opacity: 0.5` and `filter: grayscale(30%)` inline on the `<li>` element when `stale` is true. The logic matches the spec exactly (backlog tasks older than 3 days).

The fix correctly chose the alternative approach from the previous gap recommendations: instead of replacing `<li>` elements with the full `TaskCard` component, urgency color and stale styling were applied directly to the planning view row via the new `PlanningTaskRow` wrapper component. This is valid and equivalent — the visual effects (border color, opacity, filter) are identical to what `TaskCard` would have provided.

---

_Verified: 2026-02-19T12:00:00Z_
_Re-verified after gap closure: PlanningTaskRow added to app/page.tsx with useUrgencyColor (URGENCY-01) and isStaleTask (URGENCY-05)_
_Verifier: Claude (gsd-verifier)_
