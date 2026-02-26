# Implementation Plan: Focus Mode Enhancements (Pomodoro & Ambient Sounds)

## Phase 1: Foundation & Ambient Noise
- [x] Task: Create ambient noise component (78d6476)
    - [x] Create `frontend/components/NoisePlayer.tsx`
    - [x] Implement audio playback for Pink, Brown, and White noise
    - [x] Write unit tests for playback and volume control
- [x] Task: Integrate NoisePlayer into Focus Mode (99555ff)
    - [x] Add `NoisePlayer` to `frontend/app/focus/page.tsx`
    - [x] Implement direct toggle UI and volume control
    - [x] Write tests for UI interactions
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Ambient Noise' (Protocol in workflow.md)

## Phase 2: Adaptive Pomodoro Timer
- [ ] Task: Implement adaptive timer logic
    - [ ] Create `frontend/lib/hooks/usePomodoro.ts`
    - [ ] Implement `min(task_duration, 60)` or `20` default logic
    - [ ] Implement break state transitions
    - [ ] Write unit tests for timer calculations and transitions
- [ ] Task: Integrate Pomodoro UI into Focus Mode
    - [ ] Create `frontend/components/Pomodoro.tsx`
    - [ ] Display countdown and progress circle in `focus/page.tsx`
    - [ ] Integrate `canvas-confetti` for completion
    - [ ] Write tests for timer display and celebration trigger
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Adaptive Pomodoro Timer' (Protocol in workflow.md)

## Phase 3: Music Integration & Smart Interactions
- [ ] Task: Implement Spotify Embedded Player
    - [ ] Create `frontend/components/SpotifyPlayer.tsx`
    - [ ] Add to Focus Mode UI
    - [ ] Write tests for player rendering
- [ ] Task: Implement Smart Audio Interaction
    - [ ] Add logic to pause `NoisePlayer` when `SpotifyPlayer` starts
    - [ ] Write integration tests for auto-pause behavior
- [ ] Task: Add Last.fm support
    - [ ] Implement Last.fm login and scrobbling logic (if API allows easily)
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Music Integration & Smart Interactions' (Protocol in workflow.md)
