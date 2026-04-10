# Phase 9: Mobile CI/CD - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up Fastlane + GitHub Actions so that pushing a `v*` git tag automatically builds a signed iOS IPA and uploads it to TestFlight — no manual Xcode steps, no secrets in the repository.

Scope: Fastlane config, GitHub Actions workflow, cert repo creation, secret wiring.  
Out of scope: Android support, App Store submission (TestFlight internal is the target), any UI changes.

</domain>

<decisions>
## Implementation Decisions

### Certificate Management
- **D-01:** Use **Fastlane Match** (not manual P12 secrets) for certificate and provisioning profile management.
- **D-02:** Match storage backend: **encrypted private git repo** (not S3 or GCS).
- **D-03:** A new private GitHub repo (e.g., `liminal-certificates`) must be created as part of this phase — it does not exist yet. Planner must include repo creation steps.
- **D-04:** Secrets required in GitHub Actions: `MATCH_PASSWORD`, `MATCH_GIT_URL`, `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_BASE64`.

### GitHub Actions Runner
- **D-05:** Use **GitHub-hosted macOS runner** (`macos-15` or `macos-latest`), not a self-hosted Mac.
- **D-06:** Use `maxim-lobanov/setup-xcode` action to pin Xcode to latest-stable.
- **D-07:** iOS build job runs in `.github/workflows/ios.yml` (separate file from existing `ci.yml`).

### Build Trigger
- **D-08:** TestFlight upload triggers on **`v*` tags only** (e.g., `v1.1.0`, `v1.2.3`).
  - Pattern: `on: push: tags: ['v*']`
  - No `workflow_dispatch`, no branch triggers — tag-only.
  - Developer flow: `git tag v1.1.0 && git push --tags`

### Capacitor iOS Project
- **D-09:** The `/ios` Xcode project does not yet exist in the repo. The planner must include `npx cap add ios && npx cap sync ios` steps to generate it before Fastlane can build.
- **D-10:** The generated `/ios` directory should be committed to the repo (not regenerated in CI). Standard Capacitor practice — keeps the CI workflow simple.

### Claude's Discretion
- Gemfile/Fastlane Ruby version choice
- Exact `build_app` Fastlane action options (scheme name, export method, etc.)
- Whether to cache the Ruby/Bundler and npm layers in CI for speed
- App Store Connect API key format (.p8 vs JSON)
- Xcode scheme naming (likely auto-detected from the Capacitor project)

</decisions>

<specifics>
## Specific Ideas

- App ID is already locked: `com.liminal.adhd` (from `capacitor.config.ts`)
- App name is already locked: `Liminal` (from `capacitor.config.ts`)
- The cert repo name suggestion: `liminal-certificates` (user to create as a new private GitHub repo)

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project configuration
- `capacitor.config.ts` — App ID (`com.liminal.adhd`), app name, webDir (`frontend/.next-clean`) — all must match Fastlane/Xcode config
- `.github/workflows/ci.yml` — Existing CI workflow structure; iOS workflow should follow same conventions (checkout, setup, run)

### Requirements
- `.planning/REQUIREMENTS.md` §Mobile CI/CD — MOBILE-01, MOBILE-02, MOBILE-03 acceptance criteria (the three success conditions this phase must satisfy)

### No external specs
No ADRs or design docs — requirements are fully captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `capacitor.config.ts` — Already configured with correct appId and webDir; Fastlane/Xcode must use the same values
- `.github/workflows/ci.yml` — Existing workflow for reference on checkout, node setup, and job structure patterns

### Established Patterns
- Secrets kept out of committed files — `secure/` folder is gitignored for local dev; GitHub Secrets for CI (same pattern extends to Apple certs)
- Next.js static export builds to `frontend/.next-clean` (the Capacitor webDir) — build step must run before `cap sync`

### Integration Points
- The iOS workflow must run `npm run build` in `frontend/` first, then `npx cap sync ios`, then Fastlane
- Match will need read access to the private cert repo — the macOS runner authenticates via `MATCH_GIT_URL` (HTTPS with token) or SSH deploy key

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-mobile-ci-cd*
*Context gathered: 2026-04-04*
