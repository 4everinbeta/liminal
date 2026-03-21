---
phase: 6
slug: ai-prioritization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | AI-01 | unit | `npm test -- --run AISuggestion` | ✅ | ⬜ pending |
| 06-01-02 | 01 | 1 | AI-02 | unit | `npm test -- --run AISuggestion` | ✅ | ⬜ pending |
| 06-01-03 | 01 | 1 | AI-01 | visual | manual — see Manual Verifications | - | ⬜ pending |
| 06-01-04 | 01 | 1 | AI-03 | unit | `npm test -- --run AISuggestion` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — vitest and all test utilities are already installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Inline card visually positioned in Planning mode section | AI-01 | UI placement requires visual inspection | Open app in Planning mode, confirm "Do This Now" card appears inline below Toggles Row, not as floating overlay |
| No double-render in Focus mode | AI-01 | Regression check for floating overlay removal | Switch to Focus mode, confirm zero AISuggestion components visible |
| Animation spring feel | AI-01 | Subjective quality check | Accept/dismiss suggestion, confirm smooth spring animation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
