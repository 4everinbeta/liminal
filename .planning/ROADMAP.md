# Roadmap: Liminal ADHD Optimization

## Overview

Transform Liminal from a traditional task manager into an ADHD-optimized productivity system by systematically removing friction, creating urgency, and providing dopamine rewards. The journey starts by simplifying the existing interface (Phase 1), then layers on frictionless capture and immediate feedback (Phase 2), urgency visualization (Phase 3), gamification (Phase 4), working memory support (Phase 5), and AI-powered prioritization (Phase 6). Every phase delivers observable user value grounded in the principle that ADHD brains respond to NOW/NOT NOW urgency, not importance hierarchies.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Remove existing friction and simplify interface
- [x] **Phase 2: Capture & Feedback** - Frictionless input and immediate visual rewards
- [x] **Phase 3: Urgency System** - Visual time pressure and scarcity framing
- [ ] **Phase 4: Gamification** - Streaks, progress tracking, and momentum
- [ ] **Phase 5: Forgiveness** - Working memory support and interruption recovery
- [ ] **Phase 6: AI Prioritization** - Intelligent "do this now" suggestions

## Phase Details

### Phase 1: Foundation
**Goal**: Users encounter a simplified, friction-free interface that eliminates capture barriers
**Depends on**: Nothing (first phase)
**Requirements**: REMOVE-01, REMOVE-02, REMOVE-03, REMOVE-04, INTERFACE-01, INTERFACE-02, INTERFACE-03, INTERFACE-04, SIMPLIFY-01, SIMPLIFY-02, SIMPLIFY-03, SIMPLIFY-04
**Success Criteria** (what must be TRUE):
  1. User can create task with title only (all other fields auto-filled or optional)
  2. User sees one primary workflow on dashboard (not competing interfaces)
  3. User can drag tasks between states without blocking modals
  4. Task scoring happens automatically (no manual 1-100 sliders required)
  5. Themes and initiatives are optional (not required for basic task creation)
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Smart defaults and form simplification (title-only with auto-calculated scores)
- [x] 01-02-PLAN.md — Remove board friction (frictionless drag-drop, optional themes)
- [x] 01-03-PLAN.md — Dashboard consolidation (focus-first, unified interface, remove pause)

### Phase 2: Capture & Feedback
**Goal**: Users can capture thoughts instantly (<5 seconds) and receive immediate dopamine hits on completion
**Depends on**: Phase 1
**Requirements**: CAPTURE-01, CAPTURE-02, CAPTURE-03, CAPTURE-04, CAPTURE-05, CAPTURE-06, FEEDBACK-01, FEEDBACK-02, FEEDBACK-03, FEEDBACK-04, VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05
**Success Criteria** (what must be TRUE):
  1. User can create task in under 5 seconds from thought to saved
  2. User can add task via voice input (microphone button)
  3. Task creation shows optimistic UI update within 100ms
  4. Quick-add input persists across page navigation (always accessible)
  5. Task completion triggers confetti animation
  6. Form data auto-saves every 2 seconds (no data loss on distraction)
  7. All user actions show immediate visual response (<200ms perceived lag)
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Foundation hooks (draft preservation, voice input, auto-save utilities)
- [x] 02-02-PLAN.md — Confetti and keyboard shortcuts (celebration animations, Cmd/Ctrl+N)
- [x] 02-03-PLAN.md — Global quick capture (FAB, modal, voice integration, optimistic creation)
- [x] 02-04-PLAN.md — Task completion celebration (confetti on complete, satisfying animations)

### Phase 3: Urgency System
**Goal**: Users experience visual time pressure that creates NOW-ness and activates ADHD focus
**Depends on**: Phase 2
**Requirements**: URGENCY-01, URGENCY-02, URGENCY-03, URGENCY-04, URGENCY-05, URGENCY-06
**Success Criteria** (what must be TRUE):
  1. Tasks visually change color as deadline approaches (time pressure visible)
  2. Tasks display countdown timers ("X hours left")
  3. Overdue tasks have distinct visual treatment (not shame-inducing)
  4. "Due today" section shows time-boxed capacity ("2 hours left, 3 tasks remaining")
  5. Tasks fade or change style after 3 days in backlog (visual aging)
  6. User receives browser notification 1 hour before deadline (opt-in)
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Urgency utilities and hooks (chroma-js color gradient, countdown hook, urgency color hook)
- [x] 03-02-PLAN.md — Capacity summary and notifications (due-today display, browser notification system)
- [ ] 03-03-PLAN.md — Wire urgency into UI (TaskCard integration, UrgencyIndicator, dashboard capacity, notification opt-in)

### Phase 4: Gamification
**Goal**: Users experience sustained engagement through progress tracking, streaks, and concrete impact feedback
**Depends on**: Phase 3
**Requirements**: GAMIFY-01, GAMIFY-02, GAMIFY-03, GAMIFY-04, GAMIFY-05, GAMIFY-06
**Success Criteria** (what must be TRUE):
  1. User sees daily completion count ("3 done today") prominently displayed
  2. User sees weekly streak counter ("5 days in a row")
  3. User sees concrete impact message ("You freed up 2 hours today")
  4. Streak system is flexible (no harsh penalties for breaks)
  5. End-of-day summary highlights wins (no focus on incomplete tasks)
  6. Progress visualizations use smooth, satisfying animations
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Gamification foundation (utility functions, useGamificationStats hook, store extension)
- [x] 04-02-PLAN.md — Gamification UI components (StatsBar, EodSummaryToast)
- [x] 04-03-PLAN.md — Dashboard integration (StatsBar integration, EOD toggle, EOD toast scheduler)

### Phase 5: Forgiveness
**Goal**: Users can recover from interruptions, undo mistakes, and restore context after distractions
**Depends on**: Phase 4
**Requirements**: RECOVERY-01, RECOVERY-02, RECOVERY-03, RECOVERY-04, MEMORY-01, MEMORY-02, MEMORY-03, MEMORY-04
**Success Criteria** (what must be TRUE):
  1. User can undo task completion within 30 seconds
  2. Session state persists across page reload (no lost context)
  3. Draft task inputs auto-recover after browser crash
  4. User can restore recently deleted tasks (24-hour soft delete)
  5. User sees "Currently working on" task prominently displayed
  6. User can pause task and it auto-resumes on next session
  7. Dashboard shows "Where you left off" on page load
  8. Interruptions are tracked and surfaced for recovery
**Plans**: TBD

Plans:
- [ ] 05-01: TBD during planning

### Phase 6: AI Prioritization
**Goal**: Users receive intelligent "do this now" suggestions that eliminate decision paralysis
**Depends on**: Phase 5
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06
**Success Criteria** (what must be TRUE):
  1. User sees "Do This Now" AI suggestion at top of task list
  2. AI suggestion considers time of day, deadline proximity, and estimated duration
  3. User can dismiss/override AI suggestion with one click
  4. AI learns from user patterns (what gets done vs ignored)
  5. AI suggestion updates every 15 minutes (fresh recommendations)
  6. Task list auto-sorts by urgency + AI score (manual override available)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-02-19 |
| 2. Capture & Feedback | 4/4 | Complete | 2026-02-07 |
| 3. Urgency System | 3/3 | Complete | 2026-02-19 |
| 4. Gamification | 3/3 | Complete | 2026-02-19 |
| 5. Forgiveness | 0/0 | Not started | - |
| 6. AI Prioritization | 0/0 | Not started | - |
