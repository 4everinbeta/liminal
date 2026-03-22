---
phase: 07-make-iphone-compatible-app-version
plan: "01"
subsystem: build-infrastructure
tags: [capacitor, ios, static-export, next.js, dexie]
dependency_graph:
  requires: []
  provides: [static-export, capacitor-config, ios-project-scaffold, capacitor-packages]
  affects: [frontend/next.config.js, frontend/lib/auth.ts, capacitor.config.ts, ios/]
tech_stack:
  added: ["@capacitor/core@8.2.0", "@capacitor/ios@8.2.0", "@capacitor/cli@8.2.0", "@capacitor/network@8.0.1", "@capacitor/haptics@8.0.1", "@capacitor/status-bar@8.0.1", "dexie@4.3.0"]
  patterns: ["Static export via output: 'export'", "NEXT_PUBLIC_* env vars for client-side config", "Capacitor webDir pointing to Next.js distDir"]
key_files:
  created: ["capacitor.config.ts", "package.json (root)"]
  modified: ["frontend/next.config.js", "frontend/lib/auth.ts", "frontend/package.json", ".gitignore"]
  deleted: ["frontend/app/api/config/route.ts"]
decisions:
  - "webDir set to frontend/.next-clean (not frontend/out) because custom distDir overrides the static export output path"
  - "Root-level package.json created with @capacitor/cli and typescript to enable npx cap commands from repo root"
  - "ios/ added to .gitignore — Xcode project regenerated with npx cap add ios (not committed)"
metrics:
  duration_seconds: 277
  completed_date: "2026-03-22"
  tasks_completed: 2
  files_modified: 7
---

# Phase 7 Plan 1: Capacitor Build Infrastructure Summary

**One-liner:** Static export with `output: 'export'` enabled in Next.js, `/api/config` route replaced by NEXT_PUBLIC_* env var reads, and Capacitor iOS project scaffolded at `ios/` with all 7 mobile packages installed.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install packages, configure static export, fix /api/config blocker | 39a2d92 | frontend/next.config.js, frontend/lib/auth.ts, frontend/app/api/config/route.ts (deleted), frontend/package.json |
| 2 | Scaffold Capacitor iOS project and build scripts | d69bf2c | capacitor.config.ts, frontend/package.json, .gitignore, package.json (root) |

## What Was Built

### Task 1: Static Export + Auth Fix
- Updated `frontend/next.config.js` to add `output: 'export'` and `images: { unoptimized: true }` (required for static export)
- Replaced `getAuthConfig()` in `frontend/lib/auth.ts` — eliminated `fetch('/api/config')` call, now reads `NEXT_PUBLIC_OIDC_*` env vars directly via `Promise.resolve()`. Env vars are baked into the bundle at build time by Next.js.
- Deleted `frontend/app/api/config/route.ts` entirely (the `force-dynamic` export is incompatible with `output: 'export'`)
- Installed: `@capacitor/core`, `@capacitor/ios`, `@capacitor/network`, `@capacitor/haptics`, `@capacitor/status-bar`, `dexie` as dependencies; `@capacitor/cli` as devDependency
- `npm run build` exits with code 0, all 9 pages render as static HTML

### Task 2: Capacitor Config + iOS Scaffold
- Created `capacitor.config.ts` at repo root with `appId: 'com.liminal.adhd'`, `appName: 'Liminal'`, `webDir: 'frontend/.next-clean'`
- `npx cap add ios` succeeded — `ios/` Xcode project created with App/ and Package.swift
- Added `build:mobile`, `cap:sync`, `cap:open` scripts to `frontend/package.json`
- Added `ios/` to `.gitignore`
- Created root `package.json` with `@capacitor/cli` and `typescript` to support `npx cap` commands from repo root

## Key Discovery

The static export does NOT go to `frontend/out/` when a custom `distDir` is set. With `distDir: '.next-clean'`, the static export output lands in `frontend/.next-clean/` — so `webDir` in `capacitor.config.ts` is set to `frontend/.next-clean` (not `frontend/out`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Root-level package.json created to enable npx cap commands**
- **Found during:** Task 2
- **Issue:** `npx cap add ios` from repo root failed with "could not determine executable to run" — the repo root had no package.json or node_modules, so `npx` couldn't resolve `@capacitor/cli`
- **Fix:** Created root-level `package.json` and installed `@capacitor/cli` and `typescript` at root level; `npx cap add ios` then succeeded with the capacitor.config.ts at root
- **Files modified:** `package.json` (root, new), `package-lock.json` (root, new)
- **Commit:** d69bf2c

## Self-Check

### Checking created files exist:
- capacitor.config.ts — EXISTS
- frontend/next.config.js contains `output: 'export'` — EXISTS
- frontend/lib/auth.ts contains `NEXT_PUBLIC_OIDC_AUTHORITY` — EXISTS
- frontend/app/api/config/route.ts — DELETED (correct)
- ios/ directory — EXISTS (gitignored)
- frontend/package.json contains `build:mobile` — EXISTS

### Checking commits exist:
- 39a2d92 — feat(07-01): install Capacitor/Dexie packages and configure static export
- d69bf2c — feat(07-01): scaffold Capacitor iOS config, build scripts, and gitignore

## Self-Check: PASSED

All files verified. Both commits verified in git log. Static export build runs clean (exit code 0).

## Known Stubs

None. Auth config reads real env vars. All package installs are real. Capacitor config points to real output directory.
