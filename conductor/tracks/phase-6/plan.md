# Implementation Plan: AI Prioritization (Phase 6)

## Phase 1: Backend Learning & Scoring
- [x] Task: Extend task model for AI interaction logging (e809029)
    - [x] Add `ai_relevance_score` field to Task model
    - [x] Add `ai_suggestion_status` (accepted, dismissed, ignored)
- [x] Task: Update AIPrioritizationService for list-wide scoring (e809029)
    - [x] Implement multi-task scoring logic in service
    - [x] Integrate user feedback (accepted/dismissed) into scoring
- [x] Task: Implement suggestion feedback endpoint (709fda8)
    - [x] POST `/tasks/{id}/ai-feedback`
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend' (Protocol in workflow.md)

## Phase 2: Dynamic UI & Auto-Sorting
- [x] Task: Implement frontend suggestion polling
    - [x] Set up 15-minute refresh interval
- [x] Task: Implement dynamic list auto-sorting
    - [x] Update dashboard to sort by hybrid Score (Urgency + AI)
- [x] Task: Add sorting toggle (Manual vs AI)
- [x] Task: Conductor - User Manual Verification 'Phase 2: Frontend' (Protocol in workflow.md)
