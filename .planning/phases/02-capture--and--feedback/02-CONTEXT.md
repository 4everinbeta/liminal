# Phase 2: Capture & Feedback - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Instant task capture (<5 seconds from thought to saved) with immediate dopamine-triggering feedback on completion. This phase eliminates friction at the moment of thought capture and rewards task completion with immediate visual gratification.

Core ADHD principle: Capture the thought NOW before it disappears, and get instant gratification when you complete something.

</domain>

<decisions>
## Implementation Decisions

### Quick-add Accessibility
- **Dual access:** Keyboard shortcut (Cmd/Ctrl + N) + floating action button
- **Keyboard shortcut:** Cmd/Ctrl + N (standard "New" mental model, platform-familiar)
- **Floating button position:** Claude's discretion (consider mobile thumb reach, desktop UX, content blocking)
- **Modal/panel approach:** Claude's discretion (optimize for ADHD focus - minimize distraction, maximize capture speed)

### Quick-add Behavior
- **Post-submission flow:** Claude's discretion (balance rapid multi-task capture vs return-to-focus patterns)
- **Multi-task support:** Claude's discretion (evaluate line-by-line bulk capture vs single-task simplicity)
- **Draft preservation:** Auto-save draft if user navigates away or dismisses
- **Draft lifetime:** Until browser session ends (cleared when all tabs close - fresh start each session)

### Claude's Discretion
- Floating action button placement (bottom-right, top-right, or bottom-center)
- Quick-add UI pattern (modal, inline expansion, or slide-up panel)
- Post-Enter behavior (close, stay open, or hybrid approach)
- Multi-task bulk capture mode (yes, no, or optional toggle)
- Optimistic UI update strategy (how fast, rollback handling)
- Confetti animation style, duration, and triggers
- Auto-save debouncing (every 2 seconds vs on-pause detection)
- Voice input technical approach (Web Speech API vs cloud service)
- Cross-page persistence strategy (widget state management)

</decisions>

<specifics>
## Specific Ideas

**ADHD-first design principles:**
- <5 second capture requirement is non-negotiable (success criteria #1)
- 100ms optimistic UI update, 200ms perceived lag max (success criteria #3, #7)
- Protect against distraction-driven data loss (draft auto-save is critical)
- Immediate visual feedback on all actions (dopamine response for ADHD brains)

**User flow priorities:**
- Minimize clicks/steps to create task (keyboard shortcut = zero clicks)
- Never lose a partially-formed thought (session-based draft recovery)
- Return user to their context after capture (don't disrupt flow)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

Voice input, confetti animations, and auto-save timing details were acknowledged as part of Phase 2 scope but left to Claude's discretion for implementation details.

</deferred>

---

*Phase: 02-capture-and-feedback*
*Context gathered: 2026-02-01*
