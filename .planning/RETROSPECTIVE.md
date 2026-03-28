# Retrospective: Liminal ADHD Optimization

---

## Milestone: v1.0 — ADHD Optimization MVP

**Shipped:** 2026-03-28
**Phases:** 7 | **Plans:** 22 | **Commits:** 280
**Timeline:** Dec 2025 → Mar 2026 (~3.5 months)

### What Was Built

1. Progressive disclosure capture — title-only with auto-calculated scores
2. Global FAB + Cmd/Ctrl+N + voice input + optimistic creation + confetti
3. Urgency system — chroma-js gradients, rAF countdowns, task aging, capacity summary, notifications
4. Gamification — StatsBar (streaks, daily count, impact), end-of-day wins toast
5. Forgiveness — "where you left off" ring, interrupted badge, auto-resume, 30s undo, soft delete
6. Inline AI "Do This Now" card — 15-min refresh, accept/dismiss, focus mode switch
7. Capacitor iOS shell — static export, Dexie.js offline queue, bottom tab nav, swipe gestures

### What Worked

- **ADHD-first design principle** was a strong forcing function — warm orange instead of red, wins-only toasts, no shame mechanics. Having the "why" documented made decisions fast.
- **rAF over setInterval** for countdowns was the right call early; background tab drift would have been a persistent bug.
- **canvas-confetti** was a good dependency pick — zero ceremony, GPU-accelerated, works immediately.
- **Dexie.js + fake-indexeddb** for offline queue made the IndexedDB layer testable without mocking gymnastics.
- **Phased approach** (capture → urgency → gamification → forgiveness → AI → mobile) delivered usable value at every phase without blocking later work.

### What Was Inefficient

- **Phase 04 skipped VERIFICATION.md** — no formal checkpoint created. Caught by audit but required retroactive integration-checker work to confirm gamification was actually wired.
- **FEEDBACK-01/02/03 confetti gap** — confetti was built in Phase 2 but never wired to `page.tsx handleCompleteTask`. The primary completion path shipped without the central dopamine mechanic. A cross-phase integration check after Phase 2 would have caught this.
- **REQUIREMENTS.md never updated during execution** — traceability table stayed "Pending" for all requirements through v1.0 completion. Audit had to re-derive status from code, which doubled work.
- **Root-owned `.next-clean/server` files** from Docker became a local build blocker. Gitignoring `.next-clean` prevented it from being committed, but didn't prevent the permission issue.
- **Lint errors committed** — two `react/no-unescaped-entities` errors in `page.tsx` and `StatsBar.tsx` were committed and would have broken CI. Should run `npm run lint` before milestone completion.

### Patterns Established

- Warm orange (#f97316) for urgency/overdue — ADHD-safe, not shame-inducing
- Dynamic `import('@capacitor/...')` inside `useEffect` — SSR guard for static export
- `registerOnlineChecker` pattern — avoids circular imports between api.ts and store.ts
- `useRef` for interruption tracker — stable ref across renders avoids stale closure
- `beforeunload` + direct localStorage write — belt-and-suspenders for Zustand persist timing
- Local date parsing (year/month/day split) — avoids UTC offset when displaying due dates

### Key Lessons

1. **Wire integration checkpoints after each phase** — confetti gap happened because Phase 2 built the utility but Phase 3+ never verified it was called from all completion paths.
2. **Run lint before archiving** — `npm run lint` is fast; catching lint errors before milestone completion saves a fix commit.
3. **Keep VERIFICATION.md mandatory** — Phase 4's missing VERIFICATION.md created audit uncertainty. The verification step exists for a reason.
4. **Update REQUIREMENTS.md traceability during execution** — marking requirements complete as phases ship makes the final audit a 5-minute read instead of a 30-minute code archaeology session.
5. **Document the "why" for non-obvious decisions** — warm orange instead of red looks like an aesthetic choice without the RSD note. The STATE.md decisions log made Phase 7 design consistent with Phase 3.

### Cost Observations

- Sessions: ~15-20 across 3.5 months
- Model: Claude Sonnet 4.6 throughout
- Most expensive phases: Phase 07 (Capacitor/mobile — novel territory) and Phase 06 (AI refactor — 102-token plan)
- Fastest phases: Phase 01-02 (frictionless board, 2.2 min avg/plan)

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Timeline | Req Coverage |
|-----------|--------|-------|----------|-------------|
| v1.0 MVP | 7 | 22 | 3.5 mo | 53/53 |

*Updated after each milestone*
