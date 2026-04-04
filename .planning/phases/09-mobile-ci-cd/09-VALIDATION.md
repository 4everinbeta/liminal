---
phase: 9
slug: mobile-ci-cd
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual + shell scripts (CI/CD infrastructure phase — no unit test framework applicable) |
| **Config file** | `.github/workflows/ios.yml`, `ios/fastlane/Fastfile`, `ios/fastlane/Appfile` |
| **Quick run command** | `fastlane ios build 2>&1 | tail -20` |
| **Full suite command** | `git tag v0.0.0-test && git push --tags` (triggers full GHA workflow) |
| **Estimated runtime** | ~15-25 minutes (full CI build) |

---

## Sampling Rate

- **After every task commit:** Check file exists + `grep` for required config keys
- **After every plan wave:** `fastlane ios build` dry-run if certs available; else verify file structure
- **Before `/gsd-verify-work`:** Full CI pipeline must have run successfully on a test tag
- **Max feedback latency:** ~30 seconds for file/grep checks; ~20 minutes for full CI

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | MOBILE-01 | — | No secrets in ios/ committed files | grep | `grep -r "CERTIFICATE\|PRIVATE KEY" ios/ \|\| echo "CLEAN"` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | MOBILE-01 | — | N/A | file | `test -f ios/App/App.xcworkspace/contents.xcworkspacedata && echo "EXISTS"` | ❌ W0 | ⬜ pending |
| 9-02-01 | 02 | 1 | MOBILE-02 | — | No secrets in Fastfile | grep | `grep -E "MATCH_PASSWORD\|API_KEY" ios/fastlane/Fastfile \|\| echo "CLEAN"` | ❌ W0 | ⬜ pending |
| 9-02-02 | 02 | 2 | MOBILE-02 | — | N/A | grep | `grep "setup_ci" ios/fastlane/Fastfile` | ❌ W0 | ⬜ pending |
| 9-03-01 | 03 | 1 | MOBILE-03 | — | N/A | grep | `grep "v\*" .github/workflows/ios.yml` | ❌ W0 | ⬜ pending |
| 9-03-02 | 03 | 2 | MOBILE-03 | — | Secrets from env, not literals | grep | `grep -E "APP_STORE_CONNECT_API_KEY_ID.*secrets" .github/workflows/ios.yml` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `ios/` directory created via `npx cap add ios --packagemanager CocoaPods && npx cap sync ios`
- [ ] `ios/fastlane/` directory initialized via `bundle exec fastlane init`
- [ ] `.gitignore` updated to remove `ios/` exclusion
- [ ] CocoaPods installed: `cd ios && pod install`

*Wave 0 creates the project structure that all file-existence checks depend on.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| TestFlight upload succeeds | MOBILE-02 | Requires live Apple credentials, App Store Connect account, and real device build | Push v* tag, watch GitHub Actions log for "Upload complete" from pilot action |
| Certificate provisioning via Match | MOBILE-01 | Requires real Apple Developer account + cert repo with stored certs | Run `fastlane match appstore --readonly` and verify no error |
| Signed IPA produced locally | MOBILE-01 | Requires macOS + Xcode (not available in Linux dev environments) | Run `fastlane ios build` on macOS; verify `output/Liminal.ipa` exists |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for file/grep checks
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
