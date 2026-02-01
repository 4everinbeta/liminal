# Requirements: Liminal ADHD Optimization

**Defined:** 2026-01-31
**Core Value:** ADHD brains respond to NOW/NOT NOW (urgency), not IMPORTANT/NOT IMPORTANT (priority)

## v1 Requirements

Requirements for ADHD-optimized release. Each maps to roadmap phases.

### Frictionless Capture

- [ ] **CAPTURE-01**: User can create task with title only (all other fields optional/auto-filled)
- [ ] **CAPTURE-02**: User can add task via voice input (Web Speech API)
- [ ] **CAPTURE-03**: User sees task creation confirmation within 100ms (optimistic update)
- [ ] **CAPTURE-04**: Quick-add input persists across page navigation (always accessible)
- [ ] **CAPTURE-05**: Form data auto-saves every 2 seconds (prevents loss on distraction)
- [ ] **CAPTURE-06**: User can capture task in <5 seconds from thought to saved

### Immediate Feedback

- [ ] **FEEDBACK-01**: Task completion triggers visual celebration (confetti animation)
- [ ] **FEEDBACK-02**: All user actions show immediate visual response (no >200ms lag perception)
- [ ] **FEEDBACK-03**: Task check-off has satisfying animation (smooth, rewarding transition)
- [ ] **FEEDBACK-04**: Errors display inline with clear recovery actions (no blocking modals)

### Forgiveness & Recovery

- [ ] **RECOVERY-01**: User can undo task completion (30 second undo window)
- [ ] **RECOVERY-02**: Session state persists across page reload (Zustand persist middleware)
- [ ] **RECOVERY-03**: Draft task inputs auto-recover after browser crash
- [ ] **RECOVERY-04**: User can restore recently deleted tasks (soft delete with 24hr retention)

### Single Primary Interface

- [ ] **INTERFACE-01**: Dashboard presents one primary workflow (not chat + form + board competing)
- [ ] **INTERFACE-02**: Secondary interfaces accessible via clear navigation (not all visible at once)
- [ ] **INTERFACE-03**: Focus mode is default view (execution over planning)
- [ ] **INTERFACE-04**: User can toggle between views without losing context

### Urgency System

- [ ] **URGENCY-01**: Tasks change color as deadline approaches (visual time pressure)
- [ ] **URGENCY-02**: Tasks show "X hours left" countdown (scarcity framing)
- [ ] **URGENCY-03**: Overdue tasks have distinct visual treatment (not shame-inducing)
- [ ] **URGENCY-04**: "Due today" section shows time-boxed capacity ("2 hours left, 3 tasks remaining")
- [ ] **URGENCY-05**: Tasks visually "age" after 3 days in backlog (fade/change style)
- [ ] **URGENCY-06**: User receives browser notification 1 hour before deadline (opt-in)

### Gamification & Momentum

- [ ] **GAMIFY-01**: User sees daily completion count ("3 done today")
- [ ] **GAMIFY-02**: User sees weekly streak ("5 days in a row")
- [ ] **GAMIFY-03**: User sees concrete impact ("You freed up 2 hours today")
- [ ] **GAMIFY-04**: Streak system is flexible (no penalties for breaks, optional participation)
- [ ] **GAMIFY-05**: Daily summary shows wins highlighted (no focus on incomplete tasks)
- [ ] **GAMIFY-06**: Progress visualizations use animations (smooth, satisfying transitions)

### Voice Capture

- [ ] **VOICE-01**: User can press microphone button to start voice input
- [ ] **VOICE-02**: Voice input transcribes to task title in real-time
- [ ] **VOICE-03**: Voice input works offline (Web Speech API local fallback)
- [ ] **VOICE-04**: Voice input has keyboard alternative (accessibility)
- [ ] **VOICE-05**: Voice recording has clear visual feedback (pulsing indicator)

### AI Prioritization

- [ ] **AI-01**: User sees "Do This Now" AI suggestion at top of task list
- [ ] **AI-02**: AI suggestion considers time of day, deadline proximity, estimated duration
- [ ] **AI-03**: User can easily dismiss/override AI suggestion (one click)
- [ ] **AI-04**: AI adapts to user patterns (learns what gets done vs ignored)
- [ ] **AI-05**: AI suggestion updates every 15 minutes (fresh recommendations)
- [ ] **AI-06**: Task list auto-sorts by urgency + AI score (manual override available)

### Simplified Scoring

- [ ] **SIMPLIFY-01**: Priority/value/effort scores auto-calculated from due date + estimated duration
- [ ] **SIMPLIFY-02**: User can optionally tweak scores with natural language ("high priority", "quick win")
- [ ] **SIMPLIFY-03**: Numeric 1-100 inputs replaced with visual sliders or presets
- [ ] **SIMPLIFY-04**: Task form shows only title + due date by default (progressive disclosure)

### Working Memory Support

- [ ] **MEMORY-01**: User sees "Currently working on" task prominently displayed
- [ ] **MEMORY-02**: User can mark task "paused" and it auto-resumes on next session
- [ ] **MEMORY-03**: Dashboard shows "Where you left off" on page load
- [ ] **MEMORY-04**: Interruptions tracked and surfaced ("You were working on X before distraction")

### Anti-Features (Explicitly Removed)

- [ ] **REMOVE-01**: Remove multi-field mandatory form (TaskForm requires only title in v1)
- [ ] **REMOVE-02**: Remove board drag-drop gating modals (allow incomplete tasks to move)
- [ ] **REMOVE-03**: Make Themes/Initiatives optional (not required for basic workflow)
- [ ] **REMOVE-04**: Remove "Pause" button stub (replace with functional pause or remove entirely)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Energy Matching

- **ENERGY-01**: User can indicate current energy level (low/medium/high)
- **ENERGY-02**: AI suggests tasks matching energy level ("You're low energy - here's a 5min task")
- **ENERGY-03**: System learns time-of-day energy patterns

### Advanced Notifications

- **NOTIF-01**: User can set custom notification timing per task
- **NOTIF-02**: Notifications bundle to prevent interruption spam ("3 tasks due soon")
- **NOTIF-03**: Smart notification scheduling (not during focus sessions)

### Social Accountability

- **SOCIAL-01**: User can share daily wins (opt-in, external)
- **SOCIAL-02**: Accountability partner can send encouragement (no shame)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Complex strategic planning (required Themes upfront) | ADHD users need execution support, not planning tools. Themes optional only. |
| Multi-step workflows with blocking modals | Breaks flow. All validation should be non-blocking. |
| Abstract numeric scoring without context (1-100 sliders) | Cognitively demanding. Replace with natural language or auto-calc. |
| Traditional priority (high/medium/low) as primary sort | Doesn't work for ADHD. Use urgency (NOW/NOT NOW) instead. |
| Perfectionism features (task templates, detailed planning) | Planning becomes procrastination. Capture beats perfection. |
| Mandatory fields beyond title | Creates capture failure when thought is fleeting. |
| Shame-inducing failure states (broken streaks highlighted) | Emotional dysregulation trigger. Focus on wins, not failures. |
| Desktop/native mobile apps | Web-first. Defer to v2+. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (To be filled by roadmapper) | | |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: (pending)
- Unmapped: (pending)

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 after initial definition*
