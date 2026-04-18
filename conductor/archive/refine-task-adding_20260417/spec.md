# Specification: Refine Task Adding (Natural Language Parsing)

## Overview
The goal of this track is to refine the task addition process across the application by integrating natural language parsing powered by the backend LLM. This will reduce friction during capture by allowing users to type a single, free-form sentence (e.g., "Schedule dentist appointment next Tuesday for 30m !high") instead of manually interacting with progressive disclosure UI fields for due dates, duration, and priority.

## Scope
- **Target UI Components:**
  - Global Quick Capture FAB (`QuickCaptureModal.tsx` or similar).
  - Capture Tab (`QuickCapture.tsx`).
  - Inline Board Add (input fields at the bottom/top of columns in the Board view).
- **Backend Integration:**
  - Route user input through the existing LLM infrastructure (e.g., via a specialized Semantic Kernel agent or a new endpoint) to extract `TaskCreate` attributes (title, due_date, estimated_duration, effort, value).
- **Fallback/Overrides:**
  - Users must still be able to manually edit the extracted fields via the UI before or after submission if the LLM makes an error.
- **Out of Scope:**
  - Voice input enhancements (unless directly related to text transcription being fed into the new parser).
  - Changes to the core Task database schema.

## Functional Requirements
1. **Input Interception:** When a user types into a targeted capture field and submits, the text is sent to the backend for analysis.
2. **LLM Extraction:** The backend LLM parses the string to identify the core task title and any temporal (dates/times), effort-based (durations), or priority-based (!high, etc.) modifiers.
3. **Optimistic/Parsed UI Update:** The UI updates to reflect the parsed values. If creating immediately, the task is saved with the extracted metadata. If using a confirmation step, the progressive disclosure fields populate automatically based on the LLM's interpretation.
4. **Latency Handling:** Provide immediate visual feedback (loading state) while the LLM parses the input, ensuring the user knows their thought was captured.

## Acceptance Criteria
- [ ] A user can type "Call Mom tomorrow 15m" into the Quick Capture FAB, and a task named "Call Mom" is created with a due date of tomorrow and an estimated duration of 15 minutes.
- [ ] The Natural Language Parsing is active in the FAB, Capture Tab, and Inline Board inputs.
- [ ] The LLM extraction correctly maps identified parameters to the existing `TaskCreate` schema.
- [ ] If the LLM fails to extract metadata or the backend is unreachable, the system falls back to creating a task with just the title (existing behavior).