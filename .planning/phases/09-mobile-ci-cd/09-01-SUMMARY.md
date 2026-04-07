---
phase: 09-mobile-ci-cd
plan: "01"
subsystem: ios-ci-cd
tags: [fastlane, match, github-actions, testflight, ios, ci-cd]
dependency_graph:
  requires: []
  provides: [ios-fastlane-config, ios-github-actions-workflow]
  affects: [.gitignore, ios/, .github/workflows/]
tech_stack:
  added:
    - fastlane ~> 2.232 (Gemfile)
    - cocoapods ~> 1.16 (Gemfile)
  patterns:
    - Fastlane Match git-mode with HTTPS basic auth via ENV vars
    - setup_ci guard for CI keychain (prevents build freeze)
    - Tag-only GitHub Actions trigger (v* pattern)
    - base64-encoded ASC API key via is_key_content_base64: true
key_files:
  created:
    - ios/Gemfile
    - ios/fastlane/Appfile
    - ios/fastlane/Matchfile
    - ios/fastlane/Fastfile
    - .github/workflows/ios.yml
  modified:
    - .gitignore
decisions:
  - "Use MATCH_GIT_BASIC_AUTHORIZATION (not embedded URL token) to keep PAT out of git clone logs (T-09-04)"
  - "ios/App/Pods/ excluded from git; rest of ios/ committed per D-10"
  - "cap sync runs from repo root (no working-directory override) so capacitor.config.ts is found"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-07"
  tasks_completed: 3
  tasks_total: 3
  files_created: 5
  files_modified: 1
---

# Phase 9 Plan 01: iOS CI/CD Infrastructure Summary

**One-liner:** Tag-triggered Fastlane + GitHub Actions pipeline wired with Match git auth, ASC API key, setup_ci guard, and correct Capacitor build order — all secrets via ENV, none hardcoded.

## What Was Built

Complete CI/CD infrastructure for iOS builds and TestFlight delivery:

1. **.gitignore updated** — replaced bare `ios/` exclusion with `ios/App/Pods/` so the Xcode project can be committed while keeping the large (~200MB) Pods directory out of git.

2. **ios/Gemfile** — pins `fastlane ~> 2.232` and `cocoapods ~> 1.16` for reproducible builds via Bundler. Gemfile.lock intentionally absent (requires macOS/Xcode to generate — Plan 02 task).

3. **ios/fastlane/Appfile** — sets `app_identifier('com.liminal.adhd')` as the bundle ID.

4. **ios/fastlane/Matchfile** — configures Match for git storage mode against `MATCH_GIT_URL`, uses `git_basic_authorization` with base64-encoded `MATCH_GIT_USERNAME:MATCH_GIT_TOKEN` to authenticate to the private cert repo without embedding the token in the URL.

5. **ios/fastlane/Fastfile** — defines the `build` lane with:
   - `setup_ci if is_ci` — creates temporary keychain to prevent xcodebuild from hanging
   - `app_store_connect_api_key` with `is_key_content_base64: true` for the base64-encoded .p8 key
   - `match(type: 'appstore', readonly: is_ci)` — prevents CI from modifying certs
   - `build_app(workspace: 'App/App.xcworkspace', scheme: 'App')` — CocoaPods workspace path
   - `upload_to_testflight` with `skip_waiting_for_build_processing: true`

6. **.github/workflows/ios.yml** — tag-only workflow (`on: push: tags: ['v*']`) running on `macos-15` with:
   - `maxim-lobanov/setup-xcode@v1` pinned to `latest-stable`
   - Correct build order: npm ci → npm build (NEXT_STATIC_EXPORT) → cap sync ios → CocoaPods install → fastlane build
   - All 7 secrets wired: MATCH_PASSWORD, MATCH_GIT_URL, MATCH_GIT_USERNAME, MATCH_GIT_TOKEN, APP_STORE_CONNECT_API_KEY_ID, APP_STORE_CONNECT_API_ISSUER_ID, APP_STORE_CONNECT_API_KEY_BASE64
   - CocoaPods cache keyed on `ios/App/Podfile.lock`
   - `ruby/setup-ruby@v1` with `bundler-cache: true` reading from `ios/`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | d234327 | chore(09-01): update .gitignore and add ios/Gemfile |
| 2 | 8d78ca2 | feat(09-01): create Fastlane configuration files |
| 3 | f547153 | feat(09-01): create GitHub Actions iOS workflow |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all files are wired to ENV vars and GitHub Secrets. The Gemfile.lock is intentionally absent pending Plan 02 (macOS `bundle install`).

## Threat Flags

All threats from the plan's threat model are mitigated:

| Threat | Mitigation Applied |
|--------|-------------------|
| T-09-01: MATCH_GIT_URL/token in Matchfile | All values via `ENV[...]` — no literals |
| T-09-02: ASC API key in Fastfile | `ENV['APP_STORE_CONNECT_API_KEY_BASE64']` + `is_key_content_base64: true` |
| T-09-03: Secrets in ios.yml | All 7 use `${{ secrets.* }}` syntax |
| T-09-04: PAT in git clone log | `git_basic_authorization` used instead of embedded URL token |
| T-09-05: Fork PR builds | Tag-only trigger prevents fork PRs from triggering |
| T-09-06: Match cert modification in CI | `readonly: is_ci` prevents CI from regenerating certs |

## Prerequisites for Plan 02

The following manual steps are required on macOS before Plan 02 can complete:
1. Create `liminal-certificates` private GitHub repo (empty, no README)
2. Generate App Store Connect API key (.p8) and base64-encode it
3. Run `npx cap add ios --packagemanager CocoaPods` from repo root
4. Run `cd ios && bundle install` to generate Gemfile.lock
5. Run `bundle exec fastlane match init` and `match appstore` to populate cert repo
6. Add all 7 GitHub Secrets to the repository

## Self-Check: PASSED

Files exist:
- .gitignore: FOUND (modified)
- ios/Gemfile: FOUND
- ios/fastlane/Appfile: FOUND
- ios/fastlane/Matchfile: FOUND
- ios/fastlane/Fastfile: FOUND
- .github/workflows/ios.yml: FOUND

Commits exist:
- d234327: FOUND
- 8d78ca2: FOUND
- f547153: FOUND
