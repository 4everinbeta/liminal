# Implementation Plan: Refine Task Adding (Natural Language Parsing)

## Phase 1: Backend Parsing Service [checkpoint: 3b6b31d]
- [x] Task: Implement LLM task parsing logic in `backend`. (fadab8f)
    - [x] Create a robust Pydantic model for parsed task attributes (e.g., `ParsedTaskData`).
    - [x] Define a Semantic Kernel function or a direct LLM prompt for extracting `title`, `due_date`, `estimated_duration`, `effort`, and `value` from natural language strings.
- [x] Task: Create new API endpoint for natural language parsing. (fadab8f)
    - [x] Add `POST /tasks/parse` to `backend/app/routers/tasks.py`.
    - [x] Write failing test for `POST /tasks/parse` in `backend/tests/test_tasks.py` to verify accurate extraction of natural language (dates, durations, priorities).
    - [x] Implement the endpoint logic, invoking the LLM parser function.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend Parsing Service' (Protocol in workflow.md) (3b6b31d)

## Phase 2: Frontend Integration [checkpoint: 36bab65]
- [x] Task: Integrate natural language parsing in Global Quick Capture FAB. (28340aa)
    - [x] Update `QuickCaptureModal.tsx` to add a parsing loading state.
    - [x] Invoke the `POST /tasks/parse` endpoint when the user submits.
    - [x] Pre-populate the progressive disclosure fields with parsed data or immediately create the task if fully parsed and confirmed.
    - [x] Write/update failing test in `frontend/__tests__/components/` for the new parsing flow.
- [x] Task: Integrate natural language parsing in Capture Tab. (28340aa)
    - [x] Update `QuickCapture.tsx` to utilize the new parsing logic and visually reflect the extracted fields to the user.
- [x] Task: Integrate natural language parsing in Inline Board Add. (28340aa)
    - [x] Update the inline task addition component in `frontend/app/board/page.tsx` to route input through the parsing endpoint before task creation.
- [x] Task: Implement robust error handling and fallback logic. (28340aa)
    - [x] Ensure all three input methods gracefully fall back to the standard `createTask` behavior (creating a task with just a title) if the parsing endpoint fails, times out, or returns a 500.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Frontend Integration' (Protocol in workflow.md) (36bab65)

## Phase: Review Fixes
- [x] Task: Apply review suggestions (b46dc96)