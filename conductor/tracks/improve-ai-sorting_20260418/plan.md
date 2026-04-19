# Implementation Plan: Improve AI Sorting and Prioritization

## Phase 1: Contextual Backend Prompts
- [x] Task: Extend task scoring schema in `backend/app/models.py`. (5df0154)
    - [x] Write failing test for new schema (including `reasoning` string).
    - [x] Implement schema changes.
- [x] Task: Refine `AIPrioritizationService` prompt logic and config. (f36e95d)
    - [x] Update `backend/app/config.py` to ensure `groq_api_key` is correctly loaded and prioritized when `llm_provider` is "groq".
    - [x] Update prompt to inject current time-of-day and recent completion history context.
    - [x] Ensure LLM returns a one-sentence `reasoning` alongside the `ai_relevance_score`.
    - [x] Write failing test in `backend/tests/test_ai_prioritization.py` to check prompt formatting and Groq config.
    - [x] Implement the prompt change and pass tests.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Contextual Backend Prompts' (Protocol in workflow.md)

## Phase 2: Balanced Hybrid Algorithm
- [ ] Task: Implement the "Balanced Hybrid" scoring function.
    - [ ] Write failing test for sorting tasks by AI Score, Urgency, and Priority.
    - [ ] Update the core task retrieval API or `AIPrioritizationService` to apply the hybrid mathematical formula.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Balanced Hybrid Algorithm' (Protocol in workflow.md)

## Phase 3: Frontend Explainability and Feedback
- [ ] Task: Display AI reasoning on high-priority tasks.
    - [ ] Update frontend UI components (`TaskCard.tsx` or similar) to render the new `reasoning` field as a tooltip or small badge.
    - [ ] Write failing unit test in `frontend/__tests__/components/TaskCard.test.tsx` for the new display.
    - [ ] Implement and pass tests.
- [ ] Task: Implement explicit upvote/downvote feedback controls.
    - [ ] Add feedback buttons to the UI near the AI reasoning badge.
    - [ ] Connect buttons to the existing `POST /tasks/{id}/ai-feedback` endpoint.
    - [ ] Write failing test for feedback click interactions.
    - [ ] Implement and pass tests.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend Explainability and Feedback' (Protocol in workflow.md)