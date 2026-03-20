---
phase: 5
slug: forgiveness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

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
| 05-01-01 | 01 | 1 | RECOVERY-01 | unit | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |
| 05-01-02 | 01 | 1 | RECOVERY-02 | unit | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |
| 05-01-03 | 01 | 1 | RECOVERY-03 | unit | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |
| 05-01-04 | 01 | 1 | RECOVERY-04 | unit | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |
| 05-02-01 | 02 | 2 | MEMORY-01 | unit | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |
| 05-02-02 | 02 | 2 | MEMORY-02 | unit | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |
| 05-02-03 | 02 | 2 | MEMORY-03 | unit | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |
| 05-02-04 | 02 | 2 | MEMORY-04 | unit | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UndoBanner visible after task completion | RECOVERY-01 | UI timing/animation | Complete a task, verify banner appears within 2s with undo CTA |
| Dashboard "Where you left off" on load | MEMORY-01 | Requires browser navigation | Reload dashboard, verify previously active task highlighted |
| Draft recovery after browser crash | RECOVERY-03 | Requires browser crash simulation | Close browser mid-draft, reopen, verify input restored |
| Task auto-resumes on next session | MEMORY-03 | Cross-session state | Complete session with active task, reload, verify task is still active |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
