LIMINAL_KNOWLEDGE_BASE = """
# Liminal: ADHD-Friendly Productivity

## Core Philosophy
Liminal is designed to reduce cognitive load and provide immediate feedback.
It uses clean, expressive, and forgiving code practices.

## Key Features

### 1. Horizon View (The Board)
- **Concept:** A Kanban-style board to visualize your "Horizon".
- **The Threshold:** The backlog column where all new tasks land. They must be "crossed over" into active themes.
- **Themes:** Strategic buckets for your tasks (e.g., "Deep Work", "Admin").
- **Gating:** You cannot move a task from the Threshold to a Theme without assigning it a **Value Score** and **Effort Score**.

### 2. Focus Mode
- **Concept:** A single-task view to minimize distraction.
- **Components:**
  - **Active Task:** Displays only the top-ranked task.
  - **Pomodoro Timer:** 25-minute timer to structure work.
  - **Auto-Advance:** Completing a task immediately brings up the next one.

### 3. Scoring System
Tasks are prioritized automatically based on:
- **Priority:** High, Medium, Low.
- **Value Score (v):** 1-100 (Impact).
- **Effort Score (e):** 1-100 (Time/Difficulty).
- **Formula:** (Value * PriorityMultiplier) / Effort.
  - High ROI (Return on Investment) tasks float to the top.
  - Quick wins (low effort) get a boost.

### 4. Chat Assistant
- **Task Management:** "Create a task to buy milk", "Delete the bug task".
- **Tracking:** "What's on my plate?", "Do I have any stale tasks?".
- **Guidance:** "How do I use the board?".

### 5. Date Support
You can specify dates naturally when creating tasks:
- **Relative:** "tomorrow", "in 3 days", "next week", "in 2 hours"
- **Weekdays:** "Monday", "Friday" (always means next occurrence)
- **Absolute:** "January 15", "Jan 15", "2026-01-15"
- **With times:** "tomorrow at 3pm", "Friday morning", "Monday at 2pm"

Examples:
- "Create task to review PR by Friday"
- "Add reminder to call mom tomorrow"
- "Meeting prep due January 15 at 2pm"
- "Start project tomorrow, due next week"

## Best Practices
- **Capture Everything:** Use the chat or Quick Add to dump thoughts immediately.
- **Refine Later:** Use the Board View to assign scores and themes when you have energy.
- **Trust the Algorithm:** Let Liminal sort your day in Focus Mode.
- **Keep Threshold Clear:** Try to empty the Threshold daily.
"""
