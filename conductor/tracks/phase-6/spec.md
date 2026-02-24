# Specification: AI Prioritization (Phase 6)

## Overview
Phase 6 extends the foundational AI prioritization logic implemented in previous tracks. The goal is to move from a static "Do This Now" suggestion to a dynamic, learning-based system that auto-sorts the entire task list and adapts to user behavior.

## Requirements

### Intelligent Prioritization
- **AI-04**: AI adapts to user patterns. The system tracks which suggestions are accepted, ignored, or dismissed to refine future recommendations.
- **AI-05**: AI suggestions update automatically every 15 minutes to account for time passage and changing deadlines.
- **AI-06**: The task list is auto-sorted using a hybrid score of time-based urgency and AI-calculated relevance. A manual override remains available.

### Technical Requirements
- Extend the backend `prioritization` service to handle list-wide scoring.
- Implement a tracking mechanism for suggestion interactions (accept/dismiss).
- Update the frontend to handle periodic refreshes and dynamic sorting.

## Success Criteria
1. Task list auto-sorts by AI relevance + Urgency.
2. System logs user interactions with AI suggestions.
3. Suggestions refresh automatically without page reload.
4. AI relevance score is visible or influential in the sort order.
