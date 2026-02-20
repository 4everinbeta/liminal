# Phase 4: Gamification - Research

**Researched:** 2026-02-19
**Domain:** Streak mechanics, stats display, end-of-day summary, Framer Motion counter animations, ADHD-safe reward design
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Streak Mechanics
- **Hard reset on missed day**, but with encouraging framing — "You hit 7 days! Start a new run." (No shame, celebrates the run just ended)
- **Personal best tracked** — show current + best side by side: "5 days (best: 12)"
- **Both daily and weekly granularity** — daily count (tasks done today) and consecutive active days (weekly streak) are separate metrics
- **What counts as active day:** Claude's discretion — likely 1 task completed (low bar, high success rate, consistent with ADHD-safe design)

#### Dashboard Placement
- **Compact header bar at top** of the dashboard — above the task list
- **Ambient weight** — present but not competing with tasks; task list remains the hero
- **Live update on task completion** — stats tick up immediately when a task is checked off (consistent with confetti/celebration pattern from Phase 2)
- **Mobile: collapsible** — on narrow screens, stats are hidden behind a tap/toggle; tasks shown first

#### End-of-Day Summary
- **Time-based trigger** — fires at end of workday (5pm, consistent with the 9-5 hardcoded workday from Phase 3)
- **Opt-in via settings** — feature is off by default; user enables in preferences (consistent with notification soft-ask pattern from Phase 3)
- **Content:** Claude's discretion — wins-only framing (tasks completed, time freed, streak), no incomplete count shown (ADHD-safe)

### Claude's Discretion
- What counts as an "active" day (likely 1 task completed)
- Exact end-of-day summary content and copy
- Animation style for stats (Framer Motion is already in the stack)
- Exact toast duration and positioning

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GAMIFY-01 | User sees daily completion count ("3 done today") | Stats already partially built in page.tsx `stats.doneToday`; needs extraction to StatsBar component, Framer Motion counter animation |
| GAMIFY-02 | User sees weekly streak ("5 days in a row") | Streak already partially built in page.tsx `stats.streak`; needs personal best tracking (localStorage), celebratory hard-reset framing |
| GAMIFY-03 | User sees concrete impact ("You freed up 2 hours today") | Not yet built; derive from `estimated_duration` sum of done-today tasks; static calculation, no new dependencies |
| GAMIFY-04 | Streak system is flexible (no penalties for breaks, optional participation) | Hard-reset with celebratory copy ("You hit N days!"); personal best preserves achievement; no negative language |
| GAMIFY-05 | Daily summary shows wins highlighted (no focus on incomplete tasks) | EOD toast at 5pm using setTimeout pattern from notifications.ts; opt-in flag in Zustand store (sessionStorage-persisted); wins-only copy |
| GAMIFY-06 | Progress visualizations use animations (smooth, satisfying transitions) | Framer Motion 10.12.16 already installed; useSpring / animate number from 0 → target on mount; AnimatePresence for mount/unmount |
</phase_requirements>

---

## Summary

Phase 4 builds a momentum layer on the existing dashboard. The good news: the groundwork is already laid. `page.tsx` already computes `stats.doneToday` and `stats.streak` in a `useMemo` block (lines 172–207) and renders them in a 3-column stats row inside focus mode. The gamification work is primarily about (1) making those stats live-update on task completion, (2) adding personal best tracking via localStorage, (3) adding the impact message ("You freed up X hours"), (4) extracting the stats row into a proper `StatsBar` component with Framer Motion counter animations, (5) making the row collapsible on mobile, and (6) adding the optional end-of-day summary toast.

The stack is entirely composed of already-installed libraries. Framer Motion 10.12.16 provides `useSpring` + `useTransform` for animated counters and `AnimatePresence` for toast mount/unmount. Zustand 4.3.9 handles the EOD opt-in preference (persisted to sessionStorage). The impact calculation ("You freed up X hours") is a pure derivation from `estimated_duration` on completed tasks — no new libraries needed. Personal best is the one piece of state that genuinely needs cross-session persistence: it must survive tab close, so `localStorage` (not sessionStorage) is the correct choice.

The critical design constraint is ADHD-safety: hard reset on missed day must be framed as "You hit 7 days! Start a new run." not "Streak broken." The stats bar is ambient — glanceable, not trophy-case. The EOD summary is opt-in and shows wins only (tasks completed, time freed, streak milestone if hit). No incomplete count is ever shown. Animations are smooth and satisfying but not distracting.

**Primary recommendation:** Extract the existing stats row into `StatsBar` component with Framer Motion animated counters; add personal best to localStorage; derive impact message from done-today tasks' estimated_duration; add EOD toast using setTimeout (same pattern as notification scheduling); add opt-in toggle in Zustand store.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Framer Motion | 10.12.16 | Counter animations, toast animations, collapsible transition | Already installed; useSpring for smooth number animation, AnimatePresence for mount/unmount |
| Zustand | 4.3.9 | EOD opt-in preference, global stats access | Already installed; persist middleware already used for isFocusMode etc |
| canvas-confetti | 1.9.4 | Streak milestone celebrations | Already installed; triggerTaskComplete() already exists in confetti.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| localStorage | Browser API | Personal best streak persistence across sessions | Cross-session data that must survive tab close; sessionStorage is session-scoped only |
| sessionStorage | Browser API | EOD dismissal state within session | Already used for notification soft-ask dismissal; consistent pattern |
| date-fns | 2.30.0 | Date comparison for streak calculation, day boundary detection | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| localStorage for personal best | Backend API endpoint | Backend requires DB migration, auth, API call; localStorage is sufficient for user preference data with no multi-device sync requirement |
| Framer Motion useSpring | CSS counter-animation / count-up library | No count-up library installed; Framer Motion useSpring + useTransform covers the use case with zero new dependencies |
| setTimeout for EOD | node-cron / date-fns-tz scheduler | setTimeout with 5pm target is the same pattern already used in notifications.ts; no new dependency needed |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
```

---

## Current State: What Exists vs What Needs Building

### Already Built (from Phase 3 + earlier phases)

The existing `page.tsx` has a partial gamification implementation:

```typescript
// ALREADY EXISTS in page.tsx (lines 172-207)
const stats = useMemo(() => {
  const today = new Date()
  const todayStr = today.toDateString()

  const doneToday = tasks.filter(t =>
    t.status === 'done' && t.updated_at &&
    new Date(t.updated_at).toDateString() === todayStr
  ).length

  // Streak: consecutive days with at least one completion
  const completedDates = new Set(
    tasks
      .filter(t => t.status === 'done' && t.updated_at)
      .map(t => new Date(t.updated_at!).toDateString())
  )
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    if (completedDates.has(d.toDateString())) {
      streak++
    } else if (i === 0) {
      continue  // Today with no completions doesn't break streak yet
    } else {
      break
    }
  }

  return { doneToday, backlog, inProgress, streak }
}, [tasks])

// ALREADY EXISTS: stats row in focus mode (lines 336-364)
<div className="grid grid-cols-3 gap-4">
  // doneToday, streak, active count rendered as static numbers
</div>
```

### Needs Building

1. **`StatsBar` component** — extracts stats row, adds Framer Motion counters, Framer Motion collapse on mobile, GAMIFY-01 display, GAMIFY-02 display with personal best
2. **`useGamificationStats` hook** — extends existing stats calculation to add: impact hours (GAMIFY-03), personal best (GAMIFY-02), streak reset copy generation (GAMIFY-04)
3. **Personal best persistence** — localStorage read/write when streak changes
4. **Impact message** — derive from `estimated_duration` sum of done-today tasks
5. **EOD toast** — opt-in, fires at 5pm, wins-only content (GAMIFY-05)
6. **EOD opt-in setting** — add `eodSummaryEnabled` boolean to Zustand store, persisted (GAMIFY-05)
7. **Framer Motion counter animations** — number counts from previous value to new value on task completion (GAMIFY-06)

---

## Architecture Patterns

### Recommended Project Structure

```
frontend/
├── components/
│   ├── StatsBar.tsx              # NEW — compact header stats row with animations
│   └── EodSummaryToast.tsx       # NEW — end-of-day summary overlay/toast
├── lib/
│   ├── hooks/
│   │   └── useGamificationStats.ts  # NEW — stats + personal best + impact calculation
│   ├── store.ts                  # MODIFY — add eodSummaryEnabled, personalBestStreak
│   └── gamification.ts           # NEW — pure utilities: calculateImpactHours, getStreakCopy
└── app/
    └── page.tsx                  # MODIFY — replace inline stats with <StatsBar />, add EOD trigger
```

### Pattern 1: Framer Motion Animated Counter

**What:** Number animates from previous value to new value on change using useSpring.
**When to use:** doneToday count, streak display — any stat that ticks up on task completion.

```typescript
// Source: Framer Motion 10.x docs — useSpring + useTransform + useMotionValue
import { useSpring, useTransform, useMotionValue, motion } from 'framer-motion'
import { useEffect } from 'react'

function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { stiffness: 200, damping: 20, restDelta: 0.001 })
  const rounded = useTransform(spring, (v) => Math.round(v))

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  return <motion.span className={className}>{rounded}</motion.span>
}
```

**Why useSpring over useAnimate:** useSpring produces natural deceleration (feels satisfying, not mechanical). The spring stiffness/damping values above give a ~300ms animation that completes smoothly without overshoot for integer increments.

**CRITICAL: Framer Motion version note.** The project uses Framer Motion 10.12.16, which exports `useSpring`, `useTransform`, `useMotionValue` from `framer-motion` directly. The Motion for React (v11+) API uses a different import path (`motion/react`). Do NOT use v11 import paths with v10.

### Pattern 2: Collapsible Stats Bar on Mobile

**What:** On narrow screens, stats bar collapses behind a toggle button; tasks shown first.
**When to use:** Mobile viewport (tailwind `sm:` breakpoint is 640px).

```typescript
// Source: Framer Motion AnimatePresence docs + Tailwind responsive design
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

function StatsBar({ stats }: { stats: GamificationStats }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mb-4">
      {/* Mobile: show toggle button; desktop: always show stats */}
      <button
        className="sm:hidden text-xs text-gray-500 flex items-center gap-1 mb-2"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-controls="stats-bar-content"
      >
        <span>Today</span>
        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Mobile: collapse/expand; Desktop: always visible */}
      <div className="hidden sm:flex gap-3">
        <StatsContent stats={stats} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            id="stats-bar-content"
            className="sm:hidden flex gap-3"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <StatsContent stats={stats} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Mobile breakpoint:** The project uses Tailwind 3.3.3. `sm:` = 640px and up. Hide toggle button on desktop with `sm:hidden`, hide stats-for-desktop block on mobile with `hidden sm:flex`.

### Pattern 3: Personal Best Streak via localStorage

**What:** Track all-time best streak across sessions.
**When to use:** Read on mount, write whenever current streak > stored best.

```typescript
// Source: MDN localStorage API — SSR-safe pattern consistent with existing code
const PERSONAL_BEST_KEY = 'liminal-streak-best'

export function getPersonalBest(): number {
  if (typeof window === 'undefined') return 0
  const stored = localStorage.getItem(PERSONAL_BEST_KEY)
  return stored ? parseInt(stored, 10) : 0
}

export function updatePersonalBest(currentStreak: number): number {
  if (typeof window === 'undefined') return currentStreak
  const best = getPersonalBest()
  if (currentStreak > best) {
    localStorage.setItem(PERSONAL_BEST_KEY, String(currentStreak))
    return currentStreak
  }
  return best
}
```

**Why localStorage (not sessionStorage):** Personal best must survive browser close. The Zustand store already uses sessionStorage for transient state (isFocusMode etc). Personal best is permanent achievement data — localStorage is correct.

**Why not Zustand persist with localStorage:** Zustand store currently uses sessionStorage. Adding a separate localStorage key for personal best avoids migrating the entire store's storage adapter and keeps concerns separated.

### Pattern 4: Impact Hours Calculation

**What:** Sum `estimated_duration` of tasks completed today → convert to hours → format as "You freed up X hours today".
**When to use:** Displayed in stats bar next to doneToday count.

```typescript
// Source: derived from existing capacity calculation patterns in CapacitySummary.tsx
export function calculateImpactHours(tasks: Task[]): number {
  const todayStr = new Date().toDateString()
  const minutesFreed = tasks
    .filter(t =>
      t.status === 'done' &&
      t.updated_at &&
      new Date(t.updated_at).toDateString() === todayStr &&
      t.estimated_duration // Only count tasks with duration estimates
    )
    .reduce((sum, t) => sum + (t.estimated_duration || 0), 0)

  return minutesFreed / 60
}

export function formatImpactMessage(hours: number): string {
  if (hours === 0) return ''  // Don't show if no estimates available
  if (hours < 0.5) return 'You freed up some time today'
  const rounded = Math.round(hours * 2) / 2  // Round to nearest 0.5
  return `You freed up ${rounded === 1 ? '1 hour' : `${rounded} hours`} today`
}
```

**Edge case:** Many tasks have no `estimated_duration`. When sum is 0, show no impact message (don't show "You freed up 0 hours today"). The stat is optional/bonus — it only appears when data exists.

### Pattern 5: End-of-Day Summary Toast

**What:** At 5pm, show a full-screen overlay or prominent toast with wins summary. Opt-in via settings.
**When to use:** Component mounts after 5pm if user has completed tasks today and has opted in.

```typescript
// Source: setTimeout pattern from frontend/lib/notifications.ts + Framer Motion AnimatePresence
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export function useEodSummaryScheduler(
  isEnabled: boolean,
  stats: GamificationStats
) {
  const [showSummary, setShowSummary] = useState(false)

  useEffect(() => {
    if (!isEnabled) return

    const now = new Date()
    const eodToday = new Date()
    eodToday.setHours(17, 0, 0, 0) // 5pm today

    const msUntilEod = eodToday.getTime() - now.getTime()

    // Already past 5pm today — check if we already showed it today
    if (msUntilEod <= 0) {
      const lastShownDate = sessionStorage.getItem('eod-summary-shown-date')
      if (lastShownDate !== now.toDateString()) {
        setShowSummary(true)
      }
      return
    }

    // Schedule for 5pm
    const timeoutId = window.setTimeout(() => {
      setShowSummary(true)
    }, msUntilEod)

    return () => clearTimeout(timeoutId)
  }, [isEnabled])

  const dismissSummary = () => {
    setShowSummary(false)
    sessionStorage.setItem('eod-summary-shown-date', new Date().toDateString())
  }

  return { showSummary, dismissSummary }
}
```

**EOD content spec (wins-only, ADHD-safe):**
- Headline: "Great work today!" or streak milestone variant
- "Tasks completed: N" (never show incomplete count)
- "Time freed: X hours" (only if estimated_duration data available)
- "Streak: N days" (current) + "Best: M days" if new personal best
- Dismiss: "Close" button or tap/click outside

**No incomplete count** — this is non-negotiable per CONTEXT.md. The EOD summary is purely celebratory.

### Pattern 6: Streak Reset Celebratory Copy

**What:** When current streak is 0 (user hasn't completed anything yet today) AND yesterday had a streak, show celebratory reset message not shame.
**When to use:** In StatsBar when comparing current streak to yesterday.

```typescript
// Source: CONTEXT.md — "You hit 7 days! Start a new run."
export function getStreakDisplayCopy(
  currentStreak: number,
  previousStreak: number  // Yesterday's streak before reset
): { primary: string; secondary?: string } {
  if (currentStreak === 0 && previousStreak > 0) {
    // Hard reset — celebrate the run just ended
    return {
      primary: '0 days',
      secondary: `You hit ${previousStreak} days! Start a new run.`
    }
  }
  return {
    primary: `${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`,
  }
}
```

**Previous streak detection:** Store yesterday's streak in sessionStorage on load; compare with today's streak. If today < yesterday (and yesterday > 0), a reset occurred.

### Anti-Patterns to Avoid

- **Showing incomplete task count anywhere in gamification UI:** "You have 5 tasks left" triggers anxiety/avoidance in ADHD users. The EOD summary, stats bar, and streak copy NEVER mention incomplete counts.
- **Showing "0 days" as the primary stat after reset:** Leads with the negative number. Show "0 days" secondary to the celebratory "You hit N days!" message.
- **Animation duration > 500ms for counter updates:** Feels sluggish. Keep spring animations snappy (300-400ms to settle). Stats update should feel instant, not theatrical.
- **useMotionValue in Zustand or global state:** motion values are local to the component they're used in — they're imperative animation primitives, not React state. Don't store them in Zustand.
- **Reading localStorage in component render body without SSR guard:** Next.js renders server-side; `window` is undefined during SSR. Always guard with `typeof window !== 'undefined'`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Animated number counter | CSS transition on text / custom JS interval | Framer Motion useSpring + useTransform | Spring physics produce natural deceleration; handles rapid updates (multiple task completions in quick succession) correctly |
| Toast/overlay mount animation | CSS class toggle | Framer Motion AnimatePresence | AnimatePresence handles unmount animation (exit) which CSS class toggle cannot do — the element disappears before animation completes without it |
| Date boundary detection for streak | Manual getTime() comparisons | date-fns `isSameDay`, `subDays`, `isYesterday` | Already installed; handles DST edge cases, leap years, timezone offsets |
| Persistent personal best | Re-derive from all historical tasks | localStorage single value | Task list only shows current tasks, not historical completed ones; localStorage is the only way to persist an all-time best |

**Key insight:** The impact calculation ("You freed up X hours") is tempting to make smart (e.g., subtracting actual_duration from scheduled time, factoring context switches). Keep it simple: sum `estimated_duration` of done-today tasks. Users understand "I checked off tasks that I'd budgeted X hours for." Overcomplicated math produces confusing numbers.

---

## Common Pitfalls

### Pitfall 1: Streak Logic Off-By-One for "Today"

**What goes wrong:** If user hasn't completed a task yet today (but has a 7-day streak), the streak calculator breaks the streak at day 0 (today) and shows "0 days" when it should show "7 days."

**Why it happens:** The streak loop in page.tsx already handles this with `if (i === 0 && !completedDates.has(dStr)) { continue }` — the "skip today if no completions yet" logic. But it's subtle and easy to break when refactoring.

**How to avoid:** Keep the existing `i === 0` early-continue pattern. When extracting to `useGamificationStats`, copy this logic exactly. Write a unit test: "streak of 7 with no task today returns 7."

**Warning signs:** Streak shows 0 in the morning for a user who had a 7-day streak yesterday.

### Pitfall 2: Personal Best Not Updating on Same-Session Completions

**What goes wrong:** User starts session with 5-day streak. Completes a task. Streak becomes 6. Personal best was 5. Personal best should update to 6, but doesn't.

**Why it happens:** If personal best is only read on mount (not reactive to streak changes), the live update during the session won't trigger a best update.

**How to avoid:** Call `updatePersonalBest(currentStreak)` inside the `useGamificationStats` hook's calculation, so it runs every time stats recompute (on task completion).

**Warning signs:** Personal best only updates after page refresh.

### Pitfall 3: EOD Toast Showing Multiple Times Per Day

**What goes wrong:** EOD toast fires at 5pm, user dismisses. They refresh the page. Toast fires again.

**Why it happens:** `showSummary` state initialized false on mount, setTimeout reschedules for 5pm — but it's already past 5pm, so the "already past 5pm" branch fires immediately.

**How to avoid:** Persist the "shown today" flag to `sessionStorage` with today's date string as the value. On mount, check `sessionStorage.getItem('eod-summary-shown-date') === today.toDateString()`. If true, don't show.

**Warning signs:** Multiple EOD toasts per day reported by users.

### Pitfall 4: Framer Motion useSpring Jumping to Final Value Immediately

**What goes wrong:** Counter jumps from 0 to final value on first render instead of animating.

**Why it happens:** `useMotionValue(0)` + `useSpring(motionValue)` + `useEffect(() => motionValue.set(value), [value])` — on first render, the effect hasn't run yet. If the component renders with `value=5`, the spring starts at 0 and animates. But if `motionValue` is initialized to the current value (not 0), there's no animation. Conversely, if starting from 0 always, the count-up from 0 happens on every mount (page load shows count from 0 to 3, which is fine and intentional).

**How to avoid:** Initialize `useMotionValue(0)` always — count-up from 0 on mount is the correct behavior (it's the "loading" animation). On subsequent updates (task completions), the spring animates from current displayed value to new value naturally.

**Warning signs:** Count animation plays on every page load (expected behavior), or counter instantly snaps to value on task completion (bug).

### Pitfall 5: Zustand Store EOD Preference Not Surviving Refresh

**What goes wrong:** User enables EOD summary in settings. Refreshes page. Setting reverted to false.

**Why it happens:** The Zustand store uses `partialize` to control what gets persisted. New `eodSummaryEnabled` field must be added to the `partialize` function, not just the state definition.

**How to avoid:** When adding `eodSummaryEnabled` to the store, also add it to the `partialize` object.

**Warning signs:** Settings toggle works during session but resets on refresh.

### Pitfall 6: Impact Calculation Inflating Due to Duplicates

**What goes wrong:** "You freed up 40 hours today" when user completed 8 tasks with 5-hour estimates.

**Why it happens:** If `estimated_duration` contains minutes but is being treated as hours in the sum.

**How to avoid:** The `Task` model uses `estimated_duration` as minutes (legacy field). Divide by 60 to get hours. The formula in CapacitySummary.tsx already does this correctly: `(t.estimated_duration || t.effort_score || 30) / 60`.

**Warning signs:** Impact hours showing implausibly large numbers.

---

## Code Examples

### Complete useGamificationStats Hook

```typescript
// Source: Extension of existing page.tsx stats useMemo, Phase 4 addition
import { useMemo } from 'react'
import { Task } from '@/lib/api'
import { getPersonalBest, updatePersonalBest, calculateImpactHours } from '@/lib/gamification'

export interface GamificationStats {
  doneToday: number
  currentStreak: number
  personalBest: number
  impactHours: number
  activeTasks: number
}

export function useGamificationStats(tasks: Task[]): GamificationStats {
  return useMemo(() => {
    const today = new Date()
    const todayStr = today.toDateString()

    // Done today
    const doneToday = tasks.filter(t =>
      t.status === 'done' &&
      t.updated_at &&
      new Date(t.updated_at).toDateString() === todayStr
    ).length

    // Consecutive active days (1 task completed = active day)
    const completedDates = new Set(
      tasks
        .filter(t => t.status === 'done' && t.updated_at)
        .map(t => new Date(t.updated_at!).toDateString())
    )

    let currentStreak = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dStr = d.toDateString()

      if (completedDates.has(dStr)) {
        currentStreak++
      } else if (i === 0) {
        // Today with no completions yet doesn't break streak
        continue
      } else {
        break
      }
    }

    // Personal best — read + update if improved
    const personalBest = updatePersonalBest(currentStreak)

    // Impact hours from estimated_duration of done-today tasks
    const impactHours = calculateImpactHours(tasks)

    const activeTasks = tasks.filter(t => t.status !== 'done').length

    return { doneToday, currentStreak, personalBest, impactHours, activeTasks }
  }, [tasks])
}
```

### StatsBar Component with Animated Counters

```typescript
// Source: Framer Motion docs + CONTEXT.md design decisions
'use client'
import { useSpring, useTransform, useMotionValue, motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { CheckCircle, Flame, Clock } from 'lucide-react'
import { GamificationStats } from '@/lib/hooks/useGamificationStats'
import { formatImpactMessage } from '@/lib/gamification'

function AnimatedCounter({ value }: { value: number }) {
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { stiffness: 200, damping: 20, restDelta: 0.001 })
  const rounded = useTransform(spring, (v) => Math.round(v))

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  return <motion.span>{rounded}</motion.span>
}

export function StatsBar({ stats }: { stats: GamificationStats }) {
  const [expanded, setExpanded] = useState(false)
  const impactMsg = formatImpactMessage(stats.impactHours)

  return (
    <div className="mb-4">
      {/* Mobile toggle */}
      <button
        className="sm:hidden flex items-center gap-1 text-xs text-gray-400 mb-2"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        Today's progress {expanded ? '▲' : '▼'}
      </button>

      {/* Desktop: always visible */}
      <div className="hidden sm:flex gap-3">
        <StatsPills stats={stats} impactMsg={impactMsg} />
      </div>

      {/* Mobile: collapsible */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="sm:hidden flex gap-3"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <StatsPills stats={stats} impactMsg={impactMsg} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatsPills({ stats, impactMsg }: { stats: GamificationStats; impactMsg: string }) {
  return (
    <div className="flex flex-wrap gap-3 w-full">
      {/* Done today */}
      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
        <CheckCircle size={16} className="text-green-500" />
        <span className="text-sm font-semibold">
          <AnimatedCounter value={stats.doneToday} />
        </span>
        <span className="text-xs text-gray-500">done today</span>
      </div>

      {/* Streak with personal best */}
      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
        <Flame size={16} className="text-orange-500" />
        <span className="text-sm font-semibold">
          <AnimatedCounter value={stats.currentStreak} />
        </span>
        <span className="text-xs text-gray-500">
          days {stats.personalBest > stats.currentStreak && `(best: ${stats.personalBest})`}
        </span>
      </div>

      {/* Impact message — only show when data available */}
      {impactMsg && (
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
          <Clock size={16} className="text-blue-500" />
          <span className="text-xs text-gray-600">{impactMsg}</span>
        </div>
      )}
    </div>
  )
}
```

### EOD Summary Toast

```typescript
// Source: AnimatePresence pattern + sessionStorage dismissal pattern from notifications
'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { GamificationStats } from '@/lib/hooks/useGamificationStats'

interface EodSummaryToastProps {
  stats: GamificationStats
  isVisible: boolean
  onDismiss: () => void
}

export function EodSummaryToast({ stats, isVisible, onDismiss }: EodSummaryToastProps) {
  const isNewBest = stats.currentStreak > 0 && stats.currentStreak === stats.personalBest
  const impactMsg = formatImpactMessage(stats.impactHours)

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
          />
          {/* Toast card */}
          <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 z-50 text-center"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="text-2xl mb-2">
              {isNewBest ? 'New personal best!' : 'Great work today!'}
            </div>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <div>Tasks completed: <strong>{stats.doneToday}</strong></div>
              {impactMsg && <div>{impactMsg}</div>}
              {stats.currentStreak > 0 && (
                <div>
                  Streak: <strong>{stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}</strong>
                  {stats.personalBest > 0 && ` (best: ${stats.personalBest})`}
                </div>
              )}
            </div>
            <button
              onClick={onDismiss}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

### EOD Opt-in Setting in Zustand Store

```typescript
// Source: Existing store.ts pattern — add to AppState interface and persist partialize
// MODIFY frontend/lib/store.ts

interface AppState {
  // ... existing fields ...

  // Gamification: EOD summary opt-in
  eodSummaryEnabled: boolean
  setEodSummaryEnabled: (enabled: boolean) => void
}

// In create():
eodSummaryEnabled: false,  // Off by default per CONTEXT.md
setEodSummaryEnabled: (enabled) => set({ eodSummaryEnabled: enabled }),

// In partialize():
partialize: (state) => ({
  chatMessages: state.chatMessages,
  isFocusMode: state.isFocusMode,
  activeTaskId: state.activeTaskId,
  planningScrollPosition: state.planningScrollPosition,
  eodSummaryEnabled: state.eodSummaryEnabled,  // ADD
}),
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS counter animations (counter-increment) | Framer Motion useSpring | 2023+ | Spring physics feel natural; CSS counters can't animate decimal → integer correctly |
| Manual streak reset with "Streak broken!" | Hard reset with celebration copy | 2024+ ADHD app design | "You hit N days!" reframes loss as achievement; preserves motivation |
| localStorage for all persistence | sessionStorage for session data, localStorage for permanent data | Project convention | Zustand store uses sessionStorage; personal best uses localStorage — each at correct scope |

**Deprecated/outdated:**
- **react-countup:** Not installed and not needed — Framer Motion useSpring handles the use case.
- **setInterval for EOD timer:** Use setTimeout targeting 5pm (same pattern as notifications.ts). setInterval doesn't account for timer drift.

---

## Open Questions

1. **Impact message when no tasks have estimates**
   - What we know: Many tasks lack `estimated_duration`. If all 5 done-today tasks have no estimate, impact = 0.
   - What's unclear: Should we show "You cleared N tasks" as fallback, or hide the impact pill entirely?
   - Recommendation: Hide the impact pill when hours = 0. Showing "You freed up 0 hours" is meaningless. "You cleared N tasks" duplicates the doneToday count. Zero data = no pill.

2. **EOD trigger timing — already-past-5pm on mount**
   - What we know: If user opens the app at 5:30pm, the EOD trigger fires at mount (not at 5pm). If they opened the app at 4pm and left it open, the setTimeout fires at 5pm.
   - What's unclear: Is "fire on mount if past 5pm and not yet shown today" the correct UX?
   - Recommendation: Yes — show once per day at or after 5pm. The `sessionStorage` date-check prevents duplicate shows within the same day.

3. **Streak: "active day" definition — 1 task minimum**
   - What we know: CONTEXT.md marks this as Claude's discretion, notes "likely 1 task completed."
   - Recommendation: Use 1 task completed = active day. This is the lowest bar consistent with ADHD-safe design (high success rate, not punishing light days). The existing streak calculation already effectively uses this threshold (any day with at least 1 done task is included in `completedDates`).

4. **StatsBar placement — focus mode only vs both modes**
   - What we know: CONTEXT.md says "compact header bar at top of the dashboard — above the task list." Currently, the stats row is inside the focus mode section.
   - What's unclear: Should StatsBar appear in planning mode too, or only focus mode?
   - Recommendation: Show StatsBar in both modes (it's a global status indicator, not focus-mode-specific). Place it at the top of the page, before the mode-specific content, so it's always visible.

5. **EOD summary: optional settings UI location**
   - What we know: EOD must be opt-in. CONTEXT.md says "user enables in preferences."
   - What's unclear: There's no settings page yet. Where does the toggle live?
   - Recommendation: Add a minimal settings toggle inline on the dashboard (e.g., in the header or as a small link under the StatsBar: "End-of-day summary: on/off"). Full settings page is out of scope for Phase 4.

---

## Sources

### Primary (HIGH confidence)
- `/home/rbrown/workspace/liminal/frontend/app/page.tsx` — Existing stats calculation (lines 172–207) and stats row UI (lines 336–364); confirmed live code
- `/home/rbrown/workspace/liminal/frontend/lib/confetti.ts` — triggerTaskComplete() implementation; confirms canvas-confetti pattern
- `/home/rbrown/workspace/liminal/frontend/lib/store.ts` — Zustand store with persist/partialize; confirms sessionStorage usage and extension pattern
- `/home/rbrown/workspace/liminal/frontend/lib/notifications.ts` — setTimeout scheduling pattern for EOD timer; SSR-safe localStorage/sessionStorage patterns
- `/home/rbrown/workspace/liminal/frontend/package.json` — Framer Motion 10.12.16, Zustand 4.3.9, canvas-confetti 1.9.4 confirmed installed
- `/home/rbrown/workspace/liminal/.planning/phases/03-urgency-system/03-RESEARCH.md` — Established patterns: inline styles for dynamic colors, React.memo, Framer Motion animate object

### Secondary (MEDIUM confidence)
- Framer Motion 10.x docs (from training data, verified against installed version 10.12.16) — useSpring, useTransform, useMotionValue, AnimatePresence export from 'framer-motion'
- MDN localStorage API — SSR-safe `typeof window !== 'undefined'` guard pattern; consistent with existing codebase usage

### Tertiary (LOW confidence)
- ADHD app design principles for streak framing — "celebratory hard reset" over shame-based reset; consistent with CONTEXT.md locked decisions and Phase 3 ADHD design research

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in package.json; no new dependencies needed
- Architecture: HIGH — based on reading existing live code (page.tsx, store.ts, confetti.ts, notifications.ts); extension patterns are verified
- Framer Motion API: MEDIUM — version 10.12.16 confirmed installed; API patterns from training data cross-referenced with installed version; note v11 has different import paths
- Pitfalls: HIGH — based on direct code inspection of the existing partial implementation; off-by-one streak logic identified in live code

**Research date:** 2026-02-19
**Valid until:** 60 days (~April 2026) — all dependencies stable, no fast-moving APIs involved

**No new packages required.** Phase 4 is a pure composition of existing stack.

**Key discovery:** The dashboard already renders a stats row with `doneToday` and `streak` in focus mode (page.tsx lines 336–364). The Phase 4 work is primarily: (1) extract to StatsBar component, (2) add Framer Motion counter animations, (3) add personal best via localStorage, (4) add impact hours calculation, (5) add mobile collapse, (6) add EOD toast with opt-in toggle. The foundation is already there.
