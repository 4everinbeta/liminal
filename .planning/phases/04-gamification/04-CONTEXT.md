# Phase 4: Gamification - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a momentum and reward layer on top of the existing dashboard: daily completion count, weekly streak counter, concrete impact message ("You freed up 2 hours today"), and an optional end-of-day wins summary. Progress visualizations use smooth animations. This phase does NOT add new task capabilities — it adds metrics and feedback derived from task completions.

</domain>

<decisions>
## Implementation Decisions

### Streak Mechanics
- **Hard reset on missed day**, but with encouraging framing — "You hit 7 days! Start a new run." (No shame, celebrates the run just ended)
- **Personal best tracked** — show current + best side by side: "5 days (best: 12)"
- **Both daily and weekly granularity** — daily count (tasks done today) and consecutive active days (weekly streak) are separate metrics
- **What counts as active day:** Claude's discretion — likely 1 task completed (low bar, high success rate, consistent with ADHD-safe design)

### Dashboard Placement
- **Compact header bar at top** of the dashboard — above the task list
- **Ambient weight** — present but not competing with tasks; task list remains the hero
- **Live update on task completion** — stats tick up immediately when a task is checked off (consistent with confetti/celebration pattern from Phase 2)
- **Mobile: collapsible** — on narrow screens, stats are hidden behind a tap/toggle; tasks shown first

### End-of-Day Summary
- **Time-based trigger** — fires at end of workday (5pm, consistent with the 9-5 hardcoded workday from Phase 3)
- **Toast / banner notification** — appears at top or bottom, auto-dismisses after a few seconds (non-blocking)
- **Opt-in via settings** — feature is off by default; user enables in preferences (consistent with notification soft-ask pattern from Phase 3)
- **Content:** Claude's discretion — wins-only framing (tasks completed, time freed, streak), no incomplete count shown (ADHD-safe)

### Claude's Discretion
- What counts as an "active" day (likely 1 task completed)
- Exact end-of-day summary content and copy
- Animation style for stats (Framer Motion is already in the stack)
- Exact toast duration and positioning

</decisions>

<specifics>
## Specific Ideas

- Stats row should feel like a glanceable status bar, not a trophy case — ambient, readable at a glance
- Hard reset framing should feel celebratory not punitive: "You hit N days!" not "Streak broken"
- EOD toast should be pure wins: tasks done, time freed, streak milestone if applicable

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-gamification*
*Context gathered: 2026-02-19*
