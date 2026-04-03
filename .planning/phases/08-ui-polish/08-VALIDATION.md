---
phase: 8
slug: ui-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 0 | POLISH-01 | unit | `npx vitest run EditTaskModal` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | POLISH-01 | unit | `npx vitest run EditTaskModal` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 0 | POLISH-02 | unit | `npx vitest run CapacitySummaryStrip` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | POLISH-02 | unit | `npx vitest run CapacitySummaryStrip` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 0 | POLISH-03 | unit | `npx vitest run PlanningTaskRow` | ❌ W0 | ⬜ pending |
| 08-03-02 | 03 | 1 | POLISH-03 | unit | `npx vitest run PlanningTaskRow` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 1 | POLISH-04 | unit | `npx vitest run api.test` | ✅ | ⬜ pending |
| 08-04-02 | 04 | 1 | POLISH-04 | unit | `npx vitest run api.test` | ✅ | ⬜ pending |
| 08-04-03 | 04 | 1 | POLISH-04 | unit | `npx vitest run api.test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/EditTaskModal.test.tsx` — stubs for POLISH-01 (priority label display)
- [ ] `src/__tests__/CapacitySummaryStrip.test.tsx` — stubs for POLISH-02 (compact strip in Focus mode)
- [ ] `src/__tests__/PlanningTaskRow.test.tsx` — stubs for POLISH-03 (fallback label in impact pill)

*Existing `src/__tests__/api.test.ts` covers POLISH-04 offline queue tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CapacitySummary strip visible in Focus mode empty state | POLISH-02 | Requires full page render with mode toggle | Switch to Focus mode, verify strip shows hours remaining below task list |
| Offline restore enqueue visible in UI | POLISH-04 | Requires network simulation | Go offline, restore task, verify queue indicator, reconnect, verify sync |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
