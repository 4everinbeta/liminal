# Specification: Forgiveness (Phase 5)

## Overview
Phase 5 focuses on "Forgiveness" and "Working Memory Support". The goal is to allow users to recover from interruptions, undo mistakes, and restore context after distractions. This aligns with ADHD-optimized design by reducing the cognitive load of recovery and preventing "lost" work.

## Requirements

### Recovery
- **RECOVERY-01**: User can undo task completion within 30 seconds.
- **RECOVERY-02**: Session state persists across page reload (Zustand persist middleware).
- **RECOVERY-03**: Draft task inputs auto-recover after browser crash.
- **RECOVERY-04**: User can restore recently deleted tasks (soft delete with 24hr retention).

### Working Memory Support
- **MEMORY-01**: User sees "Currently working on" task prominently displayed.
- **MEMORY-02**: User can mark task "paused" and it auto-resumes on next session.
- **MEMORY-03**: Dashboard shows "Where you left off" on page load.
- **MEMORY-04**: Interruptions tracked and surfaced ("You were working on X before distraction").

## Success Criteria
1. User can undo task completion within 30 seconds.
2. Session state persists across page reload (no lost context).
3. Draft task inputs auto-recover after browser crash.
4. User can restore recently deleted tasks (24-hour soft delete).
5. User sees "Currently working on" task prominently displayed.
6. User can pause task and it auto-resumes on next session.
7. Dashboard shows "Where you left off" on page load.
8. Interruptions are tracked and surfaced for recovery.
