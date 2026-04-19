# Specification: Improve AI Sorting and Prioritization

## Overview
The goal of this track is to significantly enhance the AI sorting and prioritization engine. Currently, the system uses a basic AI relevance score. This track will upgrade the backend algorithm and LLM prompts to factor in historical context and contextual awareness (like time of day/energy). The sorting will use a "Balanced Hybrid" approach combining AI, urgency, and manual priority. On the frontend, we will introduce "Explainability" to show users *why* the AI prioritized a task, and allow for "Explicit Feedback" to help the engine learn over time.

## Scope
- **Backend (Python/FastAPI & Semantic Kernel):**
  - Update the `AIPrioritizationService` and LLM prompts to include historical completion data and time-of-day/energy context.
  - Refine the core sorting algorithm to implement a robust "Balanced Hybrid" weight system (AI Score + Urgency + Manual Priority).
  - Implement a feedback loop endpoint to register user upvotes/downvotes on sorting accuracy.
- **Frontend (TypeScript/Next.js & Zustand):**
  - Update the Task UI components to display brief explainability snippets (e.g., a small badge or tooltip: "Recommended for high energy mornings").
  - Add UI controls for users to explicitly provide feedback on the AI sorting (thumbs up/down).
- **Out of Scope:**
  - Creating entirely new dashboard views (sticking to enhancing existing lists).

## Functional Requirements
1. **Contextual LLM Parsing:** The backend must fetch and provide recent completion history and current local time context to the LLM when requesting prioritization scores.
2. **Hybrid Sorting Logic:** The API must return tasks sorted by a mathematically balanced formula combining `ai_relevance_score`, `urgency_score` (calculated from due dates), and manual `priority`.
3. **Explainability Snippets:** The LLM prompt must generate a short, one-sentence `reasoning` field alongside the score.
4. **Feedback Mechanism:** A user clicking upvote/downvote must send a request to the backend to log the interaction, which should influence future LLM prompts for that user.

## Acceptance Criteria
- [ ] Tasks are sorted by a verified "Balanced Hybrid" score.
- [ ] The LLM receives historical and time-of-day context when scoring tasks.
- [ ] The UI displays a clear, concise "reasoning" snippet for highly ranked tasks.
- [ ] Users can submit explicit feedback on the sorting, which is successfully logged by the backend.