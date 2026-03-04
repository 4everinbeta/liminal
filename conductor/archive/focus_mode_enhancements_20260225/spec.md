# Specification: Focus Mode Enhancements (Pomodoro & Ambient Sounds)

## Overview
This track enhances the "Focus Mode" by adding an adaptive Pomodoro-style timer and an integrated ambient noise system. These features aim to reduce cognitive load and provide the necessary auditory stimulation (e.g., Pink Noise) for users with ADHD to maintain focus.

## Functional Requirements

### Adaptive Pomodoro Timer
- **Logic:**
  - If a task has an `estimated_duration` or `actual_duration`, the timer interval should be set to that value, capped at **60 minutes**.
  - If no duration is specified, the default focus interval is **20 minutes**.
  - A visual countdown should be prominently displayed in Focus Mode.
- **Completion:**
  - When the timer reaches zero, provide a celebratory visual cue (e.g., **confetti**).
  - Transition to a "Break" state (default 5 minutes, or based on a ratio of focus time).

### Ambient Noise System
- **Options:**
  - **Pink Noise:** (Primary ADHD focus aid)
  - **Brown Noise:** (Deep, low frequency)
  - **White Noise:** (Steady masking sound)
- **Controls:**
  - Provide a **Direct Toggle** (button or switch) in the Focus Mode UI to quickly enable/disable ambient sounds.
  - A volume slider or basic level control should be accessible.

### Music Integration ("Bring Your Own Login")
- **Spotify Integration:**
  - An **Embedded Player** widget should be available in Focus Mode.
  - Users can log in to their own Spotify accounts to stream music.
- **Last.fm Integration:**
  - Support for Last.fm login to track ("scrobble") listening history.
- **Smart Interaction:**
  - **Auto-Pause:** If a Spotify track starts playing, the ambient noise (Pink/Brown/White) should automatically pause.

## Technical Requirements
- **Frontend (Next.js):**
  - Implement the timer logic using a custom hook or store state.
  - Use the HTML5 Audio API for ambient noise playback (local assets or synthesized).
  - Integrate the Spotify Embed SDK / Web Playback SDK if possible, or use standard iframe embeds.
- **State Management (Zustand):**
  - Persist timer status and noise preferences.
- **Visuals:**
  - Use `canvas-confetti` for the timer completion celebration.

## Success Criteria
1. The timer correctly calculates the interval based on task duration.
2. Ambient noise can be toggled on/off instantly.
3. Spotify player is functional within the Focus Mode view.
4. Ambient noise pauses correctly when Spotify music starts.
5. Confetti triggers upon timer completion.
