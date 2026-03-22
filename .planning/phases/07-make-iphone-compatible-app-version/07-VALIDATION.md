---
phase: 7
slug: make-iphone-compatible-app-version
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend unit) + manual iOS device/simulator |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npm test -- --run` |
| **Full suite command** | `cd frontend && npm test -- --run --coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm test -- --run`
- **After every plan wave:** Run `cd frontend && npm test -- --run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | Capacitor init | build | `npx cap doctor` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 1 | Static export | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 7-02-01 | 02 | 1 | Offline queue | unit | `cd frontend && npm test -- --run offlineQueue` | ❌ W0 | ⬜ pending |
| 7-02-02 | 02 | 1 | api.ts wrap | unit | `cd frontend && npm test -- --run api` | ✅ | ⬜ pending |
| 7-03-01 | 03 | 1 | Bottom tab bar | unit | `cd frontend && npm test -- --run BottomTabBar` | ❌ W0 | ⬜ pending |
| 7-03-02 | 03 | 1 | Safe area insets | manual | Open in iOS Simulator — verify no clipping | n/a | ⬜ pending |
| 7-04-01 | 04 | 1 | Swipe gestures | unit | `cd frontend && npm test -- --run TaskCard` | ✅ | ⬜ pending |
| 7-04-02 | 04 | 2 | iOS build | manual | `npx cap sync && npx cap open ios` (Mac only) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/__tests__/offlineQueue.test.ts` — stubs for Dexie mutation queue
- [ ] `frontend/__tests__/BottomTabBar.test.tsx` — stubs for bottom tab bar component
- [ ] `npm install dexie @capacitor/core @capacitor/network` — if not already installed

*Existing vitest infrastructure covers unit testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Safe area insets (notch/home indicator) | D-05 | Requires real device or iOS Simulator | Open in Simulator, verify content not clipped at top/bottom |
| Swipe gesture feel | D-06 | Native gesture physics can't be unit-tested | Test swipe left/right on iPhone, verify smooth animation |
| TestFlight build upload | D-02 | Requires Xcode on Mac | Archive in Xcode, upload to TestFlight |
| Offline mutation sync | D-07 | Requires airplane mode toggle | Enable airplane mode, complete/create tasks, re-enable, verify sync |
| Capacitor native haptics | discretion | Device-only | Touch task completion, verify haptic feedback fires |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
