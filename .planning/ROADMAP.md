# Roadmap: Liminal ADHD Optimization

## Milestones

- ✅ **v1.0 MVP** — Phases 1–7, 22 plans (shipped 2026-03-28) → [archive](.planning/milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Polish & Ship** — Phases 8–11 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–7) — SHIPPED 2026-03-28</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed 2026-02-19
- [x] Phase 2: Capture & Feedback (4/4 plans) — completed 2026-02-07
- [x] Phase 3: Urgency System (3/3 plans) — completed 2026-02-19
- [x] Phase 4: Gamification (3/3 plans) — completed 2026-02-19
- [x] Phase 5: Forgiveness (2/2 plans) — completed 2026-03-21
- [x] Phase 6: AI Prioritization (2/2 plans) — completed 2026-03-21
- [x] Phase 7: iPhone App (5/5 plans) — completed 2026-03-27

Full phase details: [.planning/milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

### 🚧 v1.1 Polish & Ship (In Progress)

**Milestone Goal:** Clear v1.0 tech debt and deliver a production-ready iOS app on TestFlight with a hardened backend.

- [ ] **Phase 8: UI Polish** - Fix EditTaskModal presets, CapacitySummary in Focus mode, impact pill fallback, and offline restore guard
- [ ] **Phase 9: Mobile CI/CD** - Fastlane + GitHub Actions pipeline that builds a signed IPA and uploads to TestFlight automatically
- [ ] **Phase 10: Backend Hardening** - Production secrets via Railway env vars, CORS lockdown, demo-auth gated, Sentry error capture
- [ ] **Phase 11: Compliance** - Retroactive Nyquist VALIDATION.md for Phases 1–4

## Phase Details

### Phase 8: UI Polish
**Goal**: Users experience a fully refined task editing flow with no numeric friction, capacity awareness in all modes, and reliable offline restore
**Depends on**: Nothing (first phase of v1.1; all v1.0 phases complete)
**Requirements**: POLISH-01, POLISH-02, POLISH-03, POLISH-04
**Success Criteria** (what must be TRUE):
  1. User can set value and effort in EditTaskModal by selecting Low/Medium/High — no number input visible
  2. User can see the CapacitySummary (hours remaining, task count) while in Focus mode, not just Planning mode
  3. User sees a non-empty fallback label (e.g., "short task") in the impact pill when a task has no estimated_duration
  4. User who restores a soft-deleted task while offline sees the restore enqueued in the mutation queue and synced on reconnect
**Plans**: 2 plans
Plans:
- [ ] 08-01-PLAN.md — Relabel priority buttons + duration fallback
- [ ] 08-02-PLAN.md — Capacity strip in Focus mode + offline restore guard
**UI hint**: yes

### Phase 9: Mobile CI/CD
**Goal**: A single git tag produces a signed IPA uploaded to TestFlight with no manual steps and no secrets in the repository
**Depends on**: Phase 8
**Requirements**: MOBILE-01, MOBILE-02, MOBILE-03
**Success Criteria** (what must be TRUE):
  1. Running `fastlane ios build` locally produces a valid signed IPA without manual Xcode configuration
  2. Pushing a git tag triggers a GitHub Actions workflow that completes and uploads an IPA to TestFlight
  3. No Apple certificates, provisioning profiles, or API keys are present in any committed file — all stored as GitHub Secrets
**Plans**: TBD

### Phase 10: Backend Hardening
**Goal**: The production backend runs with all secrets injected via environment variables, CORS locked to the production domain, demo-auth disabled, and unhandled exceptions captured in Sentry
**Depends on**: Phase 9
**Requirements**: BACKEND-01, BACKEND-02, BACKEND-03
**Success Criteria** (what must be TRUE):
  1. No secrets (DATABASE_URL, SECRET_KEY, AI provider keys) appear in any committed file or default .env — all configured via Railway environment variables
  2. A request from an unlisted origin is rejected with a CORS error; demo-user auto-auth returns 403 when DEMO_AUTH_ENABLED=false in production
  3. A deliberate unhandled exception in the FastAPI backend creates a Sentry event tagged with the correct environment (production vs development)
**Plans**: TBD

### Phase 11: Compliance
**Goal**: Every Phase 1–4 feature has documented Nyquist coverage evidence so the planning record is complete and auditable
**Depends on**: Phase 10
**Requirements**: DOCS-01
**Success Criteria** (what must be TRUE):
  1. Each of Phases 1–4 has a VALIDATION.md file in `.planning/` listing what was tested, how it was verified, and evidence of coverage
  2. All four VALIDATION.md files follow the Nyquist validation format used by Phases 5–7
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-02-19 |
| 2. Capture & Feedback | v1.0 | 4/4 | Complete | 2026-02-07 |
| 3. Urgency System | v1.0 | 3/3 | Complete | 2026-02-19 |
| 4. Gamification | v1.0 | 3/3 | Complete | 2026-02-19 |
| 5. Forgiveness | v1.0 | 2/2 | Complete | 2026-03-21 |
| 6. AI Prioritization | v1.0 | 2/2 | Complete | 2026-03-21 |
| 7. iPhone App | v1.0 | 5/5 | Complete | 2026-03-27 |
| 8. UI Polish | v1.1 | 0/2 | Planned | - |
| 9. Mobile CI/CD | v1.1 | 0/TBD | Not started | - |
| 10. Backend Hardening | v1.1 | 0/TBD | Not started | - |
| 11. Compliance | v1.1 | 0/TBD | Not started | - |
