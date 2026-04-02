# Requirements — v1.1 Polish & Ship

Generated: 2026-04-02
Milestone: v1.1

---

## v1 Requirements

### UI Polish

- [ ] **POLISH-01**: User can select Low/Medium/High presets for value and effort in EditTaskModal instead of typing a number (1-100)
- [ ] **POLISH-02**: User can see CapacitySummary (hours remaining, task count) while in Focus mode, not just Planning mode
- [ ] **POLISH-03**: User sees meaningful fallback text in the impact pill (e.g., "short task") when a task has no estimated_duration set
- [ ] **POLISH-04**: User's restored (soft-deleted) tasks are enqueued in the offline mutation queue when offline and synced on reconnect

### Mobile CI/CD

- [ ] **MOBILE-01**: Developer can run `fastlane ios build` to produce a signed IPA locally or in CI
- [ ] **MOBILE-02**: Pushing a git tag triggers a GitHub Actions workflow that builds the iOS IPA and uploads it to TestFlight automatically
- [ ] **MOBILE-03**: Apple provisioning certificates and API keys are stored as GitHub Secrets — not committed to the repository

### Backend Hardening

- [ ] **BACKEND-01**: All production secrets (DATABASE_URL, SECRET_KEY, AI provider keys) are configured via Railway environment variables with no secrets in committed code or .env files
- [ ] **BACKEND-02**: CORS is restricted to the production domain; demo-user auto-auth is disabled via an environment flag in production
- [ ] **BACKEND-03**: Backend unhandled exceptions are captured and reported to Sentry with environment tagging (production vs development)

### Compliance

- [ ] **DOCS-01**: Phases 1–4 each have a VALIDATION.md documenting Nyquist coverage evidence (what was tested, how, and what was verified)

---

## Future Requirements

*Deferred from v1.1 scoping:*

- EodSummaryToast discoverability — auto-enable or onboarding hint so users find the end-of-day wins toast
- API rate limiting — slowapi/limits on auth endpoints, input validation hardening on task APIs

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Android support | Capacitor shell exists for iOS only; Android requires separate build target |
| App Store submission | TestFlight internal is the target; full App Store review process is v1.2 |
| Rate limiting | Deferred — production traffic is low-risk at launch; add when needed |
| EodSummaryToast | Deferred — discoverability is a UX improvement, not a ship blocker |

---

## Traceability

*Filled by roadmapper.*

| REQ-ID | Phase | Plan |
|--------|-------|------|
| POLISH-01 | — | — |
| POLISH-02 | — | — |
| POLISH-03 | — | — |
| POLISH-04 | — | — |
| MOBILE-01 | — | — |
| MOBILE-02 | — | — |
| MOBILE-03 | — | — |
| BACKEND-01 | — | — |
| BACKEND-02 | — | — |
| BACKEND-03 | — | — |
| DOCS-01 | — | — |
