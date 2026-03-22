---
status: partial
phase: 06-ai-prioritization
source: [06-VERIFICATION.md]
started: 2026-03-22T09:12:00Z
updated: 2026-03-22T09:12:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Visual placement
expected: Inline card appears between Toggles Row and Quick Capture in Planning mode — not floating, no z-index overlay
result: [pending]

### 2. Accept → Focus mode switch
expected: Clicking "Start This Task" sets the task as active AND transitions to Focus mode with no visual glitch
result: [pending]

### 3. Dismiss stays in Planning mode
expected: Clicking "Not Now" animates the card out and stays in Planning mode — no mode switch
result: [pending]

### 4. No card in Focus mode
expected: Switching to Focus mode shows no AISuggestion card — the !isFocusMode gate prevents all leakage
result: [pending]

### 5. AI Sorting live data
expected: Toggling AI Sorting on reorders tasks by ai_relevance_score from the API; no score badges visible on task cards
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
