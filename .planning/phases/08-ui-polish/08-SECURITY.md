---
phase: 08
slug: ui-polish
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-10
---

# Phase 08 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser ↔ API | Frontend reads task data from API, renders in React components | Task fields: title, estimated_duration, priority_score, due_date (non-sensitive) |
| Browser ↔ IndexedDB | Offline mutation queue stores pending mutations (Dexie.js) | taskId, mutation type, payload (non-sensitive) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-08-01 | Tampering (XSS) | EditTaskModal, PlanningTaskRow, CapacitySummaryStrip | mitigate | React JSX escaping applied automatically — no `dangerouslySetInnerHTML` used anywhere in this phase | closed |
| T-08-02 | Elevation of Privilege (Path traversal) | `api.ts restoreTask` / `replayMutation` | accept | `taskId` in URL (`/tasks/${taskId}/restore`) is server-issued from app state, not user text input. Backend validates task ownership per request. | closed |
| T-08-03 | Spoofing (Stale token replay) | `api.ts replayMutation` | accept | `fetchWithAuth` reads token from localStorage at replay time. Expired/revoked tokens fail with 401 — no silent success. Identical to existing createTask/updateTask/deleteTask offline guard pattern. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-08-01 | T-08-02 | taskId values are server-assigned UUIDs stored in client state — not derived from user freetext. Backend enforces ownership checks on all restore requests. Risk is negligible. | 4everinbeta | 2026-04-10 |
| R-08-02 | T-08-03 | Token expiry handling at replay time is identical to existing offline patterns already accepted in prior phases. No new surface introduced. | 4everinbeta | 2026-04-10 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-10 | 3 | 3 | 0 | gsd-security-auditor (automated) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-10
