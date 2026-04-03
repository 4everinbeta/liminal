# Phase 8: UI Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 08-ui-polish
**Areas discussed:** Value & Effort Presets, CapacitySummary in Focus Mode, Impact Pill Fallback

---

## Value & Effort Presets (POLISH-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Relabel Priority buttons | Change 30/60/90 → Low/Medium/High labels only | ✓ |
| Add explicit Value + Effort rows | Separate Low/Medium/High preset rows for value and effort | |
| Both: relabel + add rows | Relabel Priority AND add separate Value/Effort rows | |

**User's choice:** Relabel Priority buttons only — Duration auto-calc of value/effort stays implicit and unchanged.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Stay minimal | Keep Duration buttons as Quick/Medium/Long — no annotations | ✓ |
| Show value/effort alongside | e.g. "Quick (Low effort)" — makes auto-calc visible | |

**User's choice:** Stay minimal — fewer words, less cognitive load. ADHD-safe.

---

## CapacitySummary in Focus Mode (POLISH-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Compact strip below active task card | Slim row: "● 2.5h left · 3/5 tasks fit" | ✓ |
| Same full blue card below | Reuse existing CapacitySummary component unchanged | |
| Inside the active task card | Small divider section at bottom of hero card | |

**User's choice:** Compact strip below active task card — ambient context without heavy card weight.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, always show it | Show capacity strip even when no active task | ✓ |
| Hide when no active task | Keep empty state clean | |

**User's choice:** Always show — helps user decide what to focus on before picking a task.

---

## Impact Pill Fallback (POLISH-03)

| Option | Description | Selected |
|--------|-------------|----------|
| "short task" | Positive, vague, ADHD-safe | ✓ |
| "~30m" | Numeric estimate fallback | |
| "no estimate" | Honest but neutral | |

**User's choice:** "short task" — no numbers, positive framing.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Both locations | Planning mode task list + Focus mode active card | ✓ |
| Task list only | Focus mode card already has title/priority | |

**User's choice:** Both — consistent everywhere duration appears.

---

## Claude's Discretion

- Exact styling of compact CapacitySummary strip in Focus mode
- Whether to extract a shared `formatDuration(task)` helper or inline the fallback
- Exact Tailwind classes for relabeled Priority buttons
- POLISH-04 (restoreTask offline guard) — purely technical, no user input needed

## Deferred Ideas

None.
