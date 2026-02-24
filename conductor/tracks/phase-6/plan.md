# Implementation Plan: AI Prioritization (Phase 6)

## Phase 1: Backend Learning & Scoring
- [ ] Task: Extend task model for AI interaction logging
    - [ ] Add `ai_relevance_score` field to Task model
    - [ ] Add `ai_suggestion_status` (accepted, dismissed, ignored)
- [ ] Task: Update AIPrioritizationService for list-wide scoring
    - [ ] Implement multi-task scoring logic in service
    - [ ] Integrate user feedback (accepted/dismissed) into scoring
- [ ] Task: Implement suggestion feedback endpoint
    - [ ] POST `/tasks/{id}/ai-feedback`
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend' (Protocol in workflow.md)

## Phase 2: Dynamic UI & Auto-Sorting
- [x] Task: Implement frontend suggestion polling
    - [x] Set up 15-minute refresh interval
- [x] Task: Implement dynamic list auto-sorting
    - [x] Update dashboard to sort by hybrid Score (Urgency + AI)
- [x] Task: Add sorting toggle (Manual vs AI)
- [x] Task: Conductor - User Manual Verification 'Phase 2: Frontend' (Protocol in workflow.md)
