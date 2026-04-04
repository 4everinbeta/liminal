# Phase 9: Mobile CI/CD - Research

**Researched:** 2026-04-04
**Domain:** iOS CI/CD — Fastlane Match, GitHub Actions macOS runner, Capacitor iOS, TestFlight
**Confidence:** HIGH (core stack verified via official docs and current runner manifests)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use Fastlane Match (not manual P12 secrets) for certificate and provisioning profile management.
- **D-02:** Match storage backend: encrypted private git repo (not S3 or GCS).
- **D-03:** A new private GitHub repo (e.g., `liminal-certificates`) must be created as part of this phase — it does not exist yet. Planner must include repo creation steps.
- **D-04:** Secrets required in GitHub Actions: `MATCH_PASSWORD`, `MATCH_GIT_URL`, `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_BASE64`.
- **D-05:** Use GitHub-hosted macOS runner (`macos-15` or `macos-latest`), not a self-hosted Mac.
- **D-06:** Use `maxim-lobanov/setup-xcode` action to pin Xcode to latest-stable.
- **D-07:** iOS build job runs in `.github/workflows/ios.yml` (separate file from existing `ci.yml`).
- **D-08:** TestFlight upload triggers on `v*` tags only — pattern: `on: push: tags: ['v*']`. No `workflow_dispatch`, no branch triggers.
- **D-09:** The `/ios` Xcode project does not yet exist in the repo. The planner must include `npx cap add ios && npx cap sync ios` steps to generate it before Fastlane can build.
- **D-10:** The generated `/ios` directory should be committed to the repo (not regenerated in CI).

### Claude's Discretion

- Gemfile/Fastlane Ruby version choice
- Exact `build_app` Fastlane action options (scheme name, export method, etc.)
- Whether to cache the Ruby/Bundler and npm layers in CI for speed
- App Store Connect API key format (.p8 vs JSON)
- Xcode scheme naming (likely auto-detected from the Capacitor project)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOBILE-01 | Developer can run `fastlane ios build` to produce a signed IPA locally or in CI | Fastlane lane design, `build_app` + `match` actions, Matchfile configuration |
| MOBILE-02 | Pushing a git tag triggers a GitHub Actions workflow that builds the iOS IPA and uploads it to TestFlight automatically | `ios.yml` workflow on `v*` tag trigger, `upload_to_testflight` action, `macos-15` runner |
| MOBILE-03 | Apple provisioning certificates and API keys are stored as GitHub Secrets — not committed to the repository | Match encrypted git repo, base64-encoded .p8 key, all secrets passed via `env:` block in workflow |

</phase_requirements>

---

## Summary

This phase wires together four systems: a Capacitor-generated Xcode project, Fastlane Match for certificate management, a GitHub Actions macOS runner, and Apple's TestFlight upload API. The critical dependency chain is: static Next.js build → Capacitor sync → CocoaPods install → Fastlane build_app → TestFlight upload.

The most important non-obvious finding is that Capacitor 8 defaults `npx cap add ios` to Swift Package Manager (SPM) rather than CocoaPods. The vast majority of existing CI/CD guides, including the authoritative capgo.app Capacitor-specific guide, use CocoaPods — and fastlane's `cocoapods` action, Pods caching, and `App.xcworkspace` paths all assume CocoaPods. The planner must explicitly choose `--packagemanager CocoaPods` when running `npx cap add ios`, or accept SPM and verify fastlane `build_app` path configuration works with `.xcodeproj` rather than `.xcworkspace`. Given the CI guide ecosystem maturity, CocoaPods is strongly recommended.

The second critical finding is that `.gitignore` currently lists `ios/` as ignored (line 49 with comment "regenerated with `npx cap add ios`"). Per D-10, the `/ios` directory must be committed — so that gitignore entry must be removed as part of this phase's setup.

**Primary recommendation:** Use `npx cap add ios --packagemanager CocoaPods` to generate the Xcode project, remove `ios/` from `.gitignore`, commit the Xcode project, then wire Fastlane lanes and the GitHub Actions workflow around the `ios/App/App.xcworkspace` path with scheme `App`.

---

## Standard Stack

### Core

| Library / Tool | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| fastlane | 2.232.2 (latest) | Build orchestration, Match, TestFlight upload | De-facto iOS CI tool; integrates Match + gym + pilot in single Gemfile |
| fastlane match | (bundled with fastlane) | Certificate + provisioning profile sync via encrypted git repo | Eliminates cert rotation complexity; CI readonly mode |
| fastlane gym / build_app | (bundled) | Xcode archive + IPA export | Handles all xcodebuild flags, export options plist |
| fastlane pilot / upload_to_testflight | (bundled) | TestFlight IPA upload | Wraps Apple Transporter; App Store Connect API key auth |
| ruby/setup-ruby | v1 | Pin Ruby version + bundle install in CI | `bundler-cache: true` eliminates gem re-download per run |
| maxim-lobanov/setup-xcode | v1 | Pin Xcode version in CI | Prevents silent breakage when default Xcode changes on runner |
| actions/checkout | v4 | Repo checkout | Current major version per existing ci.yml pattern |
| actions/setup-node | v4 | Node.js 22 for npm ci + Next.js build | Matches Capacitor 8 Node ≥22 requirement |
| actions/cache | v4 | Cache CocoaPods Pods/ directory | Cuts ~2 min from CI build time |

[VERIFIED: npm registry] `@capacitor/ios` and `@capacitor/cli` are at 8.3.0
[VERIFIED: WebSearch + actions/runner-images README] macOS-15 runner ships fastlane 2.232.2, Ruby 3.3.x, CocoaPods 1.16.2 pre-installed
[VERIFIED: rubygems.org] fastlane latest is 2.232.2 (released 2026-02-27)

### Supporting

| Library / Tool | Version | Purpose | When to Use |
|---------------|---------|---------|-------------|
| CocoaPods | 1.16.2 (on runner) | iOS dependency manager for Capacitor plugins | Required when using `--packagemanager CocoaPods` (recommended) |
| Bundler | ships with Ruby | Pin fastlane gem version via Gemfile.lock | Always — Gemfile + bundler-cache = reproducible builds |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CocoaPods | SPM (Swift Package Manager) | SPM is Capacitor 8 default but most CI guides assume CocoaPods/xcworkspace; fastlane ecosystem more mature for CocoaPods; SPM avoids `pod install` step but requires `.xcodeproj` not `.xcworkspace` in gym call |
| MATCH_GIT_BASIC_AUTHORIZATION | SSH deploy key (`MATCH_GIT_PRIVATE_KEY`) | SSH is cleaner (no base64 PAT exposure risk) but requires deploy key on cert repo; HTTPS + PAT is simpler to set up |
| App Store Connect API key (.p8 base64) | Apple ID + password + 2FA | API key is the only CI-viable approach; Apple ID auth requires 2FA bypass (app-specific passwords) and is being deprecated |

**Installation (run locally on macOS, not in WSL):**
```bash
# 1. Generate iOS project with CocoaPods (run from repo root on macOS)
npx cap add ios --packagemanager CocoaPods

# 2. Install fastlane via Bundler (run from ios/ directory)
cd ios
bundle init
bundle add fastlane
bundle exec fastlane init

# 3. Verify Pods installed
cd App && pod install
```

---

## Architecture Patterns

### Recommended Project Structure

```
ios/                         # Generated by npx cap add ios — committed to repo
  App/
    App.xcodeproj/           # Xcode project
    App.xcworkspace/         # CocoaPods workspace — used by gym
    App/                     # Swift source
    Podfile                  # CocoaPods dependency spec
    Podfile.lock             # Committed — pins pod versions for reproducible builds
    Pods/                    # NOT committed — installed by CI via `pod install`
fastlane/                    # At repo root (or inside ios/ — consistent with cap init)
  Fastfile                   # Lane definitions
  Matchfile                  # Match configuration
  Appfile                    # App ID, Apple account
Gemfile                      # Pin fastlane version
Gemfile.lock                 # Committed — reproducible gem installs
.github/workflows/
  ci.yml                     # Existing backend/frontend CI
  ios.yml                    # New: iOS build + TestFlight upload
```

### Pattern 1: Fastlane Lane for Local + CI Builds (MOBILE-01)

**What:** Single lane handles both local dev and CI via `is_ci` flag.
**When to use:** All builds — local signing uses Match in normal mode; CI uses readonly mode.

```ruby
# Source: docs.fastlane.tools/actions/match/ + Bright Inventions tutorial
platform :ios do
  desc 'Build signed IPA and upload to TestFlight'
  lane :build do
    setup_ci if is_ci   # Creates temp keychain — REQUIRED in CI or build freezes

    api_key = app_store_connect_api_key(
      key_id:              ENV['APP_STORE_CONNECT_API_KEY_ID'],
      issuer_id:           ENV['APP_STORE_CONNECT_API_ISSUER_ID'],
      key_content:         ENV['APP_STORE_CONNECT_API_KEY_BASE64'],
      is_key_content_base64: true,
      in_house:            false
    )

    match(
      type:     'appstore',
      readonly: is_ci,    # Never generate new certs in CI
      api_key:  api_key
    )

    build_app(
      workspace:     'App/App.xcworkspace',
      scheme:        'App',
      configuration: 'Release',
      export_method: 'app-store',
      output_name:   'Liminal.ipa'
    )

    upload_to_testflight(
      api_key:                         api_key,
      skip_waiting_for_build_processing: true,
      distribute_external:             false,
      notify_external_testers:         false
    )
  end
end
```

### Pattern 2: Matchfile (Certificate Repo Configuration)

```ruby
# Source: docs.fastlane.tools/actions/match/
git_url(ENV['MATCH_GIT_URL'])
git_basic_authorization(
  Base64.strict_encode64("#{ENV['MATCH_GIT_USERNAME']}:#{ENV['MATCH_GIT_TOKEN']}")
)
storage_mode('git')
type('appstore')
app_identifier('com.liminal.adhd')
```

**Note:** `MATCH_GIT_URL` should be set in Matchfile via ENV so the URL itself is not hardcoded in committed files. The PAT only needs `repo` scope for the private cert repo.

### Pattern 3: GitHub Actions Workflow (MOBILE-02)

```yaml
# Source: Bright Inventions tutorial + fastlane CI docs
name: iOS Build & TestFlight

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: macos-15
    defaults:
      run:
        working-directory: ./ios   # fastlane commands run from ios/ dir

    steps:
      - uses: actions/checkout@v4

      - uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: latest-stable

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install frontend dependencies
        run: npm ci
        working-directory: ./frontend

      - name: Build Next.js static export
        run: NEXT_STATIC_EXPORT=true NEXT_DIST_DIR=.next-clean npm run build
        working-directory: ./frontend

      - name: Sync Capacitor
        run: npx cap sync ios
        working-directory: .   # repo root, where capacitor.config.ts lives

      - name: Cache CocoaPods
        uses: actions/cache@v4
        with:
          path: ios/App/Pods
          key: ${{ runner.os }}-pods-${{ hashFiles('ios/App/Podfile.lock') }}
          restore-keys: |
            ${{ runner.os }}-pods-

      - name: Install CocoaPods
        run: pod install
        working-directory: ./ios/App

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true    # Reads Gemfile.lock; caches gem installs

      - name: Build and upload to TestFlight
        run: bundle exec fastlane ios build
        env:
          MATCH_PASSWORD:                    ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_URL:                     ${{ secrets.MATCH_GIT_URL }}
          MATCH_GIT_USERNAME:                ${{ secrets.MATCH_GIT_USERNAME }}
          MATCH_GIT_TOKEN:                   ${{ secrets.MATCH_GIT_TOKEN }}
          APP_STORE_CONNECT_API_KEY_ID:      ${{ secrets.APP_STORE_CONNECT_API_KEY_ID }}
          APP_STORE_CONNECT_API_ISSUER_ID:   ${{ secrets.APP_STORE_CONNECT_API_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_BASE64:  ${{ secrets.APP_STORE_CONNECT_API_KEY_BASE64 }}
```

### Pattern 4: Gemfile

```ruby
# Source: fastlane.tools/getting-started/ios/setup/
source 'https://rubygems.org'

ruby '~> 3.3'

gem 'fastlane', '~> 2.232'
```

Place `Gemfile` and `Gemfile.lock` at repo root (or `ios/` — wherever `fastlane/` directory lives). Commit both.

### Anti-Patterns to Avoid

- **Skipping `setup_ci`:** Without it, Match attempts to use the macOS login keychain, which doesn't exist on runners. Build hangs indefinitely. Use `setup_ci if is_ci` in `before_all` or at the top of the lane.
- **Not pinning `readonly: is_ci` in Match:** If `readonly` is false in CI, Match may attempt to regenerate certificates and fail because the runner has no Apple Developer Portal 2FA capability.
- **Committing Pods/ directory:** Large binary directory (~200MB), CI should always run `pod install` from Podfile.lock for reproducibility.
- **Running `npx cap sync` without the static export built first:** Capacitor copies `webDir` into the native project during sync. If `.next-clean/` is absent, sync produces an empty web layer.
- **Hardcoding `MATCH_GIT_URL` in Matchfile:** The URL contains the GitHub repo path. Safe to hardcode (it's not a secret), but using ENV keeps the file portable across forks.
- **Using SPM without understanding the path change:** SPM projects don't have `App.xcworkspace`; `gym` must use `project:` instead of `workspace:`. This changes caching, CocoaPods steps, and scheme resolution.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Code signing in CI | Custom keychain scripts, P12 import bash | `fastlane match` + `setup_ci` | Match handles provisioning profile download, cert import, and keychain lifecycle; hand-rolled signing breaks on Xcode version changes |
| TestFlight upload | curl to App Store Connect API | `upload_to_testflight` (pilot) | Apple Transporter handles chunked upload, retry logic, and iTMSTransporter compatibility layer |
| Xcode version pinning | Manual `xcode-select` bash | `maxim-lobanov/setup-xcode@v1` | Action reads available versions on runner; handles symlink and xcode-select atomically |
| Ruby + bundler caching | Custom `actions/cache` setup | `ruby/setup-ruby@v1` with `bundler-cache: true` | Built-in cache keyed on Gemfile.lock; handles Ruby version + gem cache in one step |
| Build number bumping | Read/write Info.plist | `increment_build_number` fastlane action | Handles both Info.plist and .xcconfig; idempotent |

**Key insight:** fastlane's value is not just running `xcodebuild` — it's the error handling, retry logic, and 10 years of edge-case handling baked into gym, match, and pilot.

---

## Runtime State Inventory

Step 2.5 skipped — this is a greenfield phase (no existing iOS project, no rename/refactor). The only pre-existing state relevant to setup:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None | — |
| Live service config | Apple Developer Portal: `com.liminal.adhd` App ID must exist (or be created) before `match init` | Manual step before running match |
| OS-registered state | None | — |
| Secrets/env vars | `.gitignore` line 49 lists `ios/` as ignored | Remove from `.gitignore`; commit `ios/` per D-10 |
| Build artifacts | None (iOS project not yet generated) | Run `npx cap add ios --packagemanager CocoaPods` on macOS |

---

## Common Pitfalls

### Pitfall 1: Capacitor 8 SPM Default Breaks Existing CI Patterns

**What goes wrong:** Running `npx cap add ios` (no flag) in Capacitor 8 creates an SPM project without `App.xcworkspace`. Fastlane `gym` configured with `workspace: 'App/App.xcworkspace'` fails with "file not found."
**Why it happens:** Capacitor 8 changed the default package manager from CocoaPods to SPM.
**How to avoid:** Always use `npx cap add ios --packagemanager CocoaPods` for this phase. The CI guides, caching strategies, and `App.xcworkspace` path all assume CocoaPods.
**Warning signs:** CI error about missing `.xcworkspace` file; no `Podfile` in generated `ios/App/`.

[VERIFIED: capacitorjs.com/docs/updating/8-0 + ionic.io/blog/announcing-capacitor-8]

### Pitfall 2: `ios/` Is Currently in .gitignore

**What goes wrong:** After generating the iOS project and running `git add ios/`, nothing gets staged — git silently ignores the directory.
**Why it happens:** Line 49 of `.gitignore` reads `ios/` with a comment about regenerating it.
**How to avoid:** Remove the `ios/` line from `.gitignore` before or immediately after generating the project. This is a required step, not optional.
**Warning signs:** `git status` shows no new files after `npx cap add ios`.

[VERIFIED: Read /home/rbrown/workspace/liminal/.gitignore lines 48-49]

### Pitfall 3: Match Needs the Cert Repo to Exist Before `match init`

**What goes wrong:** Running `fastlane match init` or `fastlane match appstore` against a repo URL that doesn't exist yet fails with a git clone error.
**Why it happens:** Match clones the cert repo on first run to populate it.
**How to avoid:** Create the private GitHub repo (`liminal-certificates`) manually before running `match init`. The repo must be empty (no README).
**Warning signs:** `fatal: repository '...' not found` during `fastlane match init`.

[CITED: docs.fastlane.tools/actions/match/]

### Pitfall 4: `setup_ci` Missing Causes CI Build Freeze

**What goes wrong:** The build starts, Match imports the certificate, then `xcodebuild` hangs indefinitely waiting for keychain unlock confirmation that never comes.
**Why it happens:** Without `setup_ci`, fastlane uses the default macOS login keychain, which requires user interaction to unlock.
**How to avoid:** Always call `setup_ci if is_ci` before `match` in the Fastfile. This creates a temporary keychain that is pre-unlocked.
**Warning signs:** CI job exceeds 6-hour timeout with no output after the Match step.

[CITED: docs.fastlane.tools/best-practices/continuous-integration/github/]

### Pitfall 5: App Store Connect API Key Must Be Base64-Encoded for GitHub Secrets

**What goes wrong:** Pasting raw `.p8` content (which has newlines) into a GitHub Secret truncates the key at the first blank line. Authentication fails with "invalid key format."
**Why it happens:** GitHub Secrets are single-line strings; `.p8` files contain `\n` characters.
**How to avoid:** Encode with `cat AuthKey_XXXXXXXX.p8 | base64 | tr -d '\n'` before pasting. In Fastfile, use `is_key_content_base64: true` in `app_store_connect_api_key`.
**Warning signs:** `invalid key content` error from `app_store_connect_api_key` action.

[VERIFIED: polpiella.dev/fastlane-appstore-connect-api-and-github-actions + fastlane docs]

### Pitfall 6: MATCH_GIT_URL Must Be Accessible from the macOS Runner

**What goes wrong:** Match fails to clone the cert repo because `GITHUB_TOKEN` only has access to the current repo, not `liminal-certificates`.
**Why it happens:** The default `GITHUB_TOKEN` in Actions is scoped to the workflow's repository.
**How to avoid:** Create a separate PAT with `repo` scope on `liminal-certificates`, store as `MATCH_GIT_TOKEN` secret. Embed in `MATCH_GIT_URL` as `https://TOKEN@github.com/...` OR use `MATCH_GIT_BASIC_AUTHORIZATION` with base64(`username:token`).
**Warning signs:** `could not read Username for 'https://github.com': terminal prompts disabled` in Match output.

[VERIFIED: fastlane/fastlane GitHub issues #15560, #17347]

### Pitfall 7: Build Order — Static Export Must Precede `cap sync`

**What goes wrong:** Capacitor copies `webDir` contents into the native project during `cap sync`. If `frontend/.next-clean/` is empty or absent (because the Next.js build wasn't run first), the iOS app ships with no web content.
**Why it happens:** `cap sync` reads `capacitor.config.ts` → `webDir: 'frontend/.next-clean'` and copies that directory.
**How to avoid:** In the CI workflow, always run the Next.js static export step before `npx cap sync`. The correct env vars are `NEXT_STATIC_EXPORT=true NEXT_DIST_DIR=.next-clean`.
**Warning signs:** App opens to blank white screen when installed from TestFlight.

[VERIFIED: Read /home/rbrown/workspace/liminal/frontend/next.config.js, capacitor.config.ts]

---

## Code Examples

### Appfile

```ruby
# Source: docs.fastlane.tools/getting-started/ios/setup/
app_identifier('com.liminal.adhd')
apple_id(ENV['FASTLANE_APPLE_ID'])   # Optional — not needed when using API key only
```

### Match init (run once, locally on macOS)

```bash
# From ios/ directory
bundle exec fastlane match init
# Select: git
# Enter URL: https://github.com/YOUR_ORG/liminal-certificates.git

# Generate appstore certificates
bundle exec fastlane match appstore
```

### Encoding the App Store Connect API Key for GitHub Secrets

```bash
# Run on macOS where you downloaded AuthKey_KEYID.p8
cat ~/Downloads/AuthKey_XXXXXXXX.p8 | base64 | tr -d '\n'
# Paste output as value of APP_STORE_CONNECT_API_KEY_BASE64 in GitHub Secrets
```

### Encoding MATCH_GIT_BASIC_AUTHORIZATION

```bash
# Only needed if NOT embedding token in MATCH_GIT_URL
echo -n "your_github_username:your_personal_access_token" | base64
```

### Verifying the Next.js static export produces the right output path

```bash
# From repo root
cd frontend && NEXT_STATIC_EXPORT=true NEXT_DIST_DIR=.next-clean npm run build
ls frontend/.next-clean/   # Should contain index.html, _next/, etc.
```

### Local build verification (MOBILE-01)

```bash
# From ios/ directory, after cap sync
bundle exec fastlane ios build
# This should produce Liminal.ipa without uploading to TestFlight
# Add `skip_upload: true` to upload_to_testflight for local testing
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Apple ID + password + 2FA for CI | App Store Connect API key (.p8) | ~2020 (ASC API GA) | No 2FA gymnastics; API key auth is stable and recommended |
| Manual P12 + provisioning profile secrets | fastlane match (encrypted git repo) | ~2016 (match GA) | Centralized cert management; one source of truth |
| CocoaPods (Capacitor default) | SPM (Capacitor 8 default) | Capacitor 8 (2024) | New projects default to SPM; must pass `--packagemanager CocoaPods` for CocoaPods |
| `macos-latest` = macOS 14 | `macos-latest` → macOS 15 (from Aug 2025) | Aug 4, 2025 | Xcode 16.4 default; pin with setup-xcode if needed |
| `actions/checkout@v2` | `actions/checkout@v4` | 2023 | Node 16 deprecation; v4 uses Node 20 |

**Deprecated/outdated:**
- `macos-12` runner: No longer receives updates; Xcode versions too old for 2026 compliance
- Apple ID + app-specific password for CI: Functionally deprecated; ASC API key is the path forward
- Directly importing P12 cert as base64 secret: Still works but bypasses certificate lifecycle management that Match provides

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Capacitor scheme name after `npx cap add ios --packagemanager CocoaPods` is `App` and workspace is `ios/App/App.xcworkspace` | Architecture Patterns, Code Examples | If scheme is different, `build_app(scheme: 'App')` fails; verify in Xcode after generation |
| A2 | `com.liminal.adhd` App ID does not yet exist in Apple Developer Portal | Common Pitfalls (P3) | If it already exists, `match init` works normally; if it doesn't, must be created first |
| A3 | The GitHub username/org for `liminal-certificates` is the same as the `4everinbeta` account in git config | Architecture Patterns | Wrong org means wrong URL in `MATCH_GIT_URL` |

---

## Open Questions

1. **SPM vs CocoaPods — confirm before generating ios/**
   - What we know: Capacitor 8 defaults to SPM; CocoaPods still works with `--packagemanager CocoaPods`
   - What's unclear: User preference and whether any existing Capacitor plugins in the project require CocoaPods
   - Recommendation: Use `--packagemanager CocoaPods` for maximum CI guide compatibility unless user has a reason to prefer SPM

2. **`MATCH_GIT_URL` format — embedded token vs `MATCH_GIT_BASIC_AUTHORIZATION`**
   - What we know: Both work; embedded token in URL is simpler but slightly less secure (token visible in match logs)
   - What's unclear: Project security posture preference
   - Recommendation: Use `MATCH_GIT_BASIC_AUTHORIZATION` pattern — keeps token out of log output

3. **App Store Connect App ID (`DEVELOPER_APP_ID`) — numeric app ID needed for build number bumping**
   - What we know: Some lanes use the numeric App Store app ID (not bundle ID) for `app_store_build_number` lookup
   - What's unclear: Whether the planner wants auto-incrementing build numbers
   - Recommendation: Skip auto-increment for v1; use a fixed build number or manual bump. Can add `increment_build_number` later.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm ci, Next.js build, cap sync | ✓ | v24.11.1 (local WSL) | — |
| Xcode | iOS build (gym/xcodebuild) | ✗ (WSL/Linux) | — | Must run on macOS; CI uses macos-15 runner |
| Ruby / fastlane | Fastlane lanes | ✗ (WSL/Linux) | — | macOS runner has Ruby 3.3.x + fastlane 2.232.2 pre-installed |
| CocoaPods | iOS dependency install | ✗ (WSL/Linux) | — | macOS runner has CocoaPods 1.16.2 pre-installed |
| GitHub Actions macOS runner | CI build | ✓ (remote) | macos-15 / Xcode 16.4 | — |
| App Store Connect API key | TestFlight upload | ✗ (not yet created) | — | Must be generated in App Store Connect; no fallback |
| `liminal-certificates` GitHub repo | fastlane match | ✗ (not yet created) | — | Must be created; no fallback |

**Missing dependencies with no fallback:**
- App Store Connect API key (`.p8`) — must be generated by a Developer account admin in App Store Connect > Users & Access > Integrations
- `liminal-certificates` private GitHub repo — must be created as part of this phase setup (D-03)

**Missing dependencies with fallback:**
- Xcode / Ruby / CocoaPods on local machine — all available on the GitHub-hosted macOS runner; local macOS not required for CI delivery (only needed if developer wants to run `fastlane ios build` locally per MOBILE-01)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (frontend unit tests) |
| Config file | `frontend/vitest.config.ts` (inferred from scripts) |
| Quick run command | `cd frontend && npm run test -- --run` |
| Full suite command | `cd frontend && npm run test -- --run && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOBILE-01 | `fastlane ios build` produces signed IPA without manual Xcode config | Manual smoke test (requires macOS + Apple account) | Run locally: `cd ios && bundle exec fastlane ios build` | ❌ Wave 0: verify IPA exists at output path |
| MOBILE-02 | Pushing `v*` tag triggers workflow that uploads to TestFlight | Integration (GitHub Actions) | `git tag v1.1.0 && git push --tags` → check Actions tab | ❌ Wave 0: requires real tag push to test |
| MOBILE-03 | No certs/keys in committed files | Static analysis (grep) | `git grep -r "CERTIFICATE\|PRIVATE KEY\|-----BEGIN" -- '*.rb' '*.yml' '*.ts'` | ✅ Can run immediately |

**Note:** MOBILE-01 and MOBILE-02 are not unit-testable by nature — they require Apple credentials and a macOS build environment. The verification strategy is:
- MOBILE-01: Local macOS run on developer machine with `bundle exec fastlane ios build`
- MOBILE-02: Tag-triggered run in GitHub Actions; check workflow completion and TestFlight build availability
- MOBILE-03: Automated grep + manual review of committed files

### Sampling Rate

- **Per task commit:** `git grep -r "CERTIFICATE\|PRIVATE KEY\|-----BEGIN" -- '*.rb' '*.yml' '*.ts' '*.json'` (MOBILE-03 check)
- **Per wave merge:** Full vitest suite (`cd frontend && npm run test -- --run`) — confirms no regressions in web layer
- **Phase gate:** Successful GitHub Actions run on `v*` tag + IPA visible in TestFlight before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `ios/` directory — must be generated before any CI testing
- [ ] `ios/fastlane/Fastfile` — lane definitions
- [ ] `ios/fastlane/Matchfile` — cert repo config
- [ ] `ios/Gemfile` + `ios/Gemfile.lock` — reproducible Ruby env
- [ ] `.github/workflows/ios.yml` — tag-triggered workflow
- [ ] `liminal-certificates` GitHub repo (external, not a file) — must exist before `match init`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | App Store Connect API key (not Apple ID/password); no 2FA exposure |
| V3 Session Management | no | CI pipeline; no user sessions |
| V4 Access Control | yes | GitHub Secrets scoped to repo; `liminal-certificates` PAT scoped to single repo |
| V5 Input Validation | no | Build pipeline; no user input |
| V6 Cryptography | yes | Match uses OpenSSL symmetric encryption (AES-256-GCM) for cert repo; passphrase in GitHub Secret |

### Known Threat Patterns for iOS CI/CD

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cert repo credential exposure in CI logs | Information Disclosure | Use `MATCH_GIT_BASIC_AUTHORIZATION` (not embedded URL token); fastlane redacts known secrets from logs |
| Apple API key committed to repo | Information Disclosure | Store only as GitHub Secret; pass via `env:` block; verify with `git grep` |
| Match password brute-force | Tampering | Match uses AES-256; strong random passphrase; rotate annually |
| Rogue workflow on fork PR building with secrets | Elevation of Privilege | GitHub Actions: secrets not passed to fork PRs by default; tag-only trigger further limits exposure |
| Stale provisioning profile causing silent distribution failure | Denial of Service | `match` with `readonly: true` + API key validates profile against Dev Portal on each run |

---

## Sources

### Primary (HIGH confidence)

- [docs.fastlane.tools/actions/match/](https://docs.fastlane.tools/actions/match/) — Match init, CI readonly mode, MATCH_PASSWORD, MATCH_GIT_BASIC_AUTHORIZATION
- [docs.fastlane.tools/best-practices/continuous-integration/github/](https://docs.fastlane.tools/best-practices/continuous-integration/github/) — `setup_ci` requirement, keychain behavior, GitHub Actions workflow structure
- [actions/runner-images macos-15-Readme.md](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-Readme.md) — Xcode 16.4 default, Ruby 3.3.x, fastlane 2.232.2, CocoaPods 1.16.2 on runner
- [capacitorjs.com/docs/updating/8-0](https://capacitorjs.com/docs/updating/8-0) — SPM as new default in Capacitor 8, `--packagemanager CocoaPods` flag
- [npm registry](https://registry.npmjs.org/) — `@capacitor/ios` and `@capacitor/cli` at 8.3.0

### Secondary (MEDIUM confidence)

- [brightinventions.pl/blog/ios-testflight-github-actions-fastlane-match/](https://brightinventions.pl/blog/ios-testflight-github-actions-fastlane-match/) — Complete workflow YAML + Fastfile for match + TestFlight (2025 tutorial)
- [capgo.app/blog/automatic-capacitor-ios-build-github-action-with-match/](https://capgo.app/blog/automatic-capacitor-ios-build-github-action-with-match/) — Capacitor-specific workflow; scheme=App, workspace=ios/App/App.xcworkspace, Matchfile with HTTPS auth
- [polpiella.dev/fastlane-appstore-connect-api-and-github-actions](https://www.polpiella.dev/fastlane-appstore-connect-api-and-github-actions) — Base64 .p8 key encoding for GitHub Secrets
- [rubygems.org/gems/fastlane](https://rubygems.org/gems/fastlane/versions/2.232.2) — fastlane 2.232.2 confirmed latest

### Tertiary (LOW confidence — assumptions flagged)

- Multiple WebSearch results on Capacitor SPM directory structure — conflicting details; scheme name `App` assumed from CocoaPods template convention

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against runner image manifest and npm registry
- Architecture patterns: HIGH — verified against official fastlane docs + capgo.app Capacitor-specific guide
- Pitfalls: HIGH — P2 (gitignore) and P7 (build order) verified directly from codebase; P1, P4, P5, P6 from official issue trackers/docs
- SPM vs CocoaPods decision: HIGH — confirmed from official Capacitor 8 update docs

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable domain; Apple toolchain changes at WWDC could affect Xcode version assumptions)
