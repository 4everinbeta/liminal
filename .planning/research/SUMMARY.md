# Project Research Summary

**Project:** Liminal - ADHD-Optimized Productivity Features
**Domain:** ADHD-friendly task management enhancement
**Researched:** 2026-01-31
**Confidence:** HIGH

## Executive Summary

ADHD-optimized productivity tools succeed by addressing the core cognitive challenge: ADHD brains respond to NOW/NOT NOW urgency, not importance hierarchies. The recommended approach for Liminal is to layer ADHD-specific features (voice input, urgency visualization, gamification, smart notifications) onto the existing Next.js/FastAPI architecture as progressive enhancements rather than a separate subsystem. This minimizes architectural disruption while maximizing user impact.

The stack recommendation is decisively client-heavy: leverage native browser APIs (Web Speech API for voice, Notification API for alerts) with lightweight backend support for persistence and LLM-powered prioritization. This approach delivers sub-100ms response times critical for ADHD users while adding only ~30KB to the bundle. The existing technology choices (Next.js 13, FastAPI, Framer Motion, Zustand) are ideal for this enhancement—no major technology additions required.

Critical risks center on notification fatigue and gamification-induced shame. Prevention requires starting minimal (zero automatic notifications in MVP, no streak counters), prioritizing user agency (AI suggests, never decides), and celebrating progress without punishing variability. The path to success is relentless simplicity: frictionless capture (<5 seconds), immediate feedback (<100ms), and forgiveness over perfection.

## Key Findings

### Recommended Stack

Research strongly favors native browser APIs over external services, prioritizing zero-latency user experience critical for ADHD capture moments. The existing Liminal stack requires minimal additions.

**Core technologies:**
- **Web Speech API (Native)**: Voice input with sub-100ms latency, zero cost, privacy-friendly—perfect for "capture thought before it's gone" ADHD requirement
- **Notification API + Web Push**: Browser-native alerts for deadline urgency, no third-party service needed, enables background reminders via Service Workers
- **canvas-confetti (1.9.3)**: Only new dependency, 17KB for instant dopamine hit on task completion—critical for ADHD motivation
- **date-fns (3.3.1)**: Scarcity framing calculations ("2 hours left" not "due at 5pm"), tree-shakeable at 13KB
- **APScheduler (3.10.4)**: Backend notification scheduling with PostgreSQL persistence, Pythonic and mature
- **Existing stack reuse**: Framer Motion for urgency animations, Zustand for state management, current LLM integration for AI prioritization—zero new infrastructure

**Anti-recommendations:**
- No Electron/Tauri (stay web-first, PWA sufficient)
- No Redux/MobX (Zustand already works)
- No external gamification platforms (generic systems miss ADHD-specific NOW/NOT NOW principle)
- No local LLM inference in browser (too slow, use existing backend)

**Bundle impact:** +30KB gzipped total (canvas-confetti 17KB, date-fns 13KB, other features use native APIs)

### Expected Features

Research reveals a clear two-tier feature structure: table stakes prevent tool abandonment, differentiators create competitive advantage.

**Must have (table stakes):**
- **Frictionless capture**: One-field input, always visible, zero validation, <5 second capture time—ADHD thoughts are fleeting, friction = tool death
- **Immediate visual feedback**: Optimistic UI updates, completion animations, real-time progress—dopamine deficit requires external validation
- **Forgiveness & recovery**: Autosave every 2-3 seconds, undo/redo, no destructive actions, restore "where was I" state—interruptions are constant for ADHD users
- **Single primary interface**: One default view to eliminate choice paralysis, progressive disclosure for advanced features
- **Zero-effort prioritization**: System suggests order based on urgency (not manual importance ranking), natural language over numeric scores

**Should have (competitive differentiators):**
- **Urgency system**: Visual aging (color changes), scarcity framing ("2 hours left today"), countdown timers, capacity visualization—creates NOW-ness that activates ADHD brains
- **Gamification & momentum**: Completion streaks, achievement unlocks, end-of-day summaries, concrete impact metrics ("freed up 2 hours")—external structure compensates for lack of internal discipline
- **Voice capture**: Hands-free task creation via keyboard shortcut + speech, allows capture while driving/cooking/mid-task
- **AI "do this now" suggestions**: Single task recommendation based on deadline + energy + patterns, removes decision paralysis
- **Energy-aware recommendations**: Tasks tagged by required energy level, time-of-day pattern learning, manual energy toggle for bad brain days

**Defer (anti-features to avoid):**
- Multi-step capture forms (every field is a decision point that freezes ADHD users)
- Traditional priority/importance scoring (ADHD brains can't reliably assess importance without urgency)
- Required strategic planning upfront (themes/projects should be optional, capture happens first)
- Blocking modals & confirmations (kills momentum, use undo instead)
- Shame-inducing failure states (red "OVERDUE" labels, broken streak guilt, "you missed your goals" notifications)

### Architecture Approach

ADHD features should be implemented as cross-cutting presentation enhancements and domain service extensions, not a separate subsystem. Most features live client-side (browser APIs, visual feedback, urgency calculations) with lightweight backend support.

**Major components:**

1. **Notification Service** (Client + Backend trigger)
   - Frontend wraps Browser Notification API, schedules based on task deadlines
   - Backend provides `/notifications/due-soon` endpoint (tasks due in 1hr/3hr/1day)
   - Integration: Poll every 5 minutes (WebSockets deferred to future), Zustand tracks dismissed notifications
   - Build: ~4 hours, can be built after Task API exists (already does)

2. **Voice Input Component** (Client-only)
   - `VoiceCapture.tsx` wraps Web Speech API, embeds in QuickCapture as mic button
   - Browser-native transcription, no backend changes required
   - Fallback message if browser doesn't support API
   - Build: ~3 hours, fully independent of backend

3. **Gamification System** (Client + Backend persistence)
   - Frontend `ProgressTracker.tsx` displays "3 tasks done today, 5-day streak"
   - Backend `/stats/progress` endpoint calculates streaks via SQL aggregation
   - `Confetti.tsx` component triggers on task completion via Framer Motion
   - Build: ~7 hours (4hr backend, 3hr frontend)

4. **Visual Urgency Indicators** (Client-only)
   - `urgencyUtils.ts` calculates urgency level from existing task timestamps
   - TaskCard applies conditional CSS (red overdue, orange due-soon, fading aging)
   - No backend changes, uses existing `created_at`, `due_date`, `status` fields
   - Build: ~2 hours, immediate value

5. **AI Prioritization Agent** (Backend extension + Frontend display)
   - Extend existing `AgentService` with `_handle_prioritization()` method
   - LLM prompt: "Given tasks + time + deadlines, suggest ONE to do RIGHT NOW"
   - Frontend `AISuggestion.tsx` displays recommendation with rationale
   - Build: ~9 hours (5hr backend, 4hr frontend)

**Data flow insight:** Client-heavy architecture minimizes API roundtrips (urgency calculated client-side, voice processed in browser, confetti is pure visual). Only gamification stats and AI suggestions require backend calls.

**Build order:** Phase 1 (Visual Urgency, Voice, Confetti—all client, 7hr total) → Phase 2 (Gamification backend/frontend, Notifications—11hr) → Phase 3 (AI Prioritization—9hr). Total: ~27 hours.

### Critical Pitfalls

Top pitfalls from research, with prevention strategies mapped to build phases.

1. **Notification fatigue & learned helplessness**
   - **Risk:** Excessive notifications train users to ignore ALL alerts, tool becomes background noise
   - **Prevention:** Start with ZERO automatic notifications (opt-in only), max 3 types in MVP, respect dismissal patterns (stop notifying if user dismissed last 3 for same task)
   - **Phase:** Address in Phase 2 (notification system implementation)

2. **Gamification-induced anxiety & shame**
   - **Risk:** Broken streaks trigger RSD (Rejection Sensitive Dysphoria), users abandon tool after first failure
   - **Prevention:** NO visible streak counters in Phase 1, celebrate completions not consistency, "flex streaks" (5 out of 7 days), automatic pause mode when inactive (not "broken")
   - **Phase:** Address in Phase 2 (gamification design)

3. **Over-automation removing user agency**
   - **Risk:** AI that auto-prioritizes without explanation creates distrust, users feel loss of control
   - **Prevention:** AI suggests, user decides (always), show reasoning ("High urgency + small effort"), one-click override, teach-the-AI mode
   - **Phase:** Critical for Phase 3 (AI prioritization)

4. **Complexity creep (feature bloat)**
   - **Risk:** Every new feature adds cognitive load, working memory limitations mean 3-step process = lost context
   - **Prevention:** One primary action per screen, zero configuration for core features, progressive disclosure for advanced options, test "can user capture task in <5 seconds?"
   - **Phase:** Quality gate for ALL phases

5. **Perfectionism enablement**
   - **Risk:** Features that enable endless planning/organizing instead of DOING (planning feels productive but is procrastination)
   - **Prevention:** Minimal metadata (title, urgency, effort—that's it), no aesthetic customization per-task, doing is default mode (planning requires explicit switch)
   - **Phase:** Design principle for Phase 1-3

## Implications for Roadmap

Based on research, suggested phase structure prioritizes immediate user value (client-side features) before backend complexity, with clear dependency management.

### Phase 1: Immediate Feedback & Frictionless Capture
**Rationale:** Client-only features ship fast, require zero backend work, provide instant user value. These address the most critical ADHD needs: reduce friction, provide dopamine hits, create urgency perception.

**Delivers:**
- Visual urgency indicators (color-coded task aging, deadline proximity)
- Voice input for hands-free task capture
- Confetti animations on task completion
- All features use existing APIs (Task model already has needed fields)

**Addresses features:**
- Table stakes: Immediate visual feedback, frictionless capture (voice enhancement)
- Differentiator: Urgency system (visual aging, scarcity framing)

**Avoids pitfalls:**
- P4 (Complexity creep): Simplest possible implementation, single-field capture maintained
- P7 (Lack of celebration): Confetti provides immediate positive feedback

**Build effort:** ~7 hours
**Research flag:** No additional research needed (standard patterns, browser APIs well-documented)

---

### Phase 2: Momentum & Engagement Systems
**Rationale:** Requires backend coordination but builds on Phase 1 success. Gamification and notifications create sustained engagement, but must be implemented carefully to avoid fatigue/shame pitfalls.

**Delivers:**
- Gamification backend (streak calculation, progress stats endpoint)
- Progress tracker frontend (visual "3 tasks done today, 5-day streak")
- Notification service (browser notifications for due tasks)
- All features integrate with existing Task model

**Addresses features:**
- Differentiator: Gamification & momentum (streaks, achievement unlocks, progress bars)
- Differentiator: Urgency system enhancement (time-based nudges)
- Table stakes: External structure creation

**Avoids pitfalls:**
- P1 (Notification fatigue): Opt-in only, max 3 types, respect dismissal patterns
- P2 (Gamification shame): Flexible streaks (5/7 days), pause mode, celebrate variety not just consistency

**Build effort:** ~11 hours
**Research flag:** Standard gamification patterns (no research needed), notification scheduling well-documented

---

### Phase 3: AI-Powered Intelligence
**Rationale:** Builds on existing LLM integration, highest user value for decision paralysis reduction, but requires mature AgentService. Defer until Phases 1-2 prove engagement.

**Delivers:**
- AI prioritization backend (extends AgentService with "PRIORITIZE" intent)
- AI suggestion frontend (displays "do this now" recommendation with rationale)
- Energy-level detection and contextual recommendations
- Transparent AI reasoning shown to user

**Addresses features:**
- Differentiator: AI "do this now" suggestions (single task highlight, reasoning transparency)
- Differentiator: Energy-aware recommendations (time-of-day patterns, manual toggle)
- Table stakes: Zero-effort prioritization (auto-calculated urgency)

**Avoids pitfalls:**
- P3 (Over-automation): AI suggests, user decides (always), show reasoning, one-click override
- P4 (Complexity): On-demand only (user asks "what should I do?"), not automatic
- P5 (Invisible state): Full transparency on why task was recommended

**Build effort:** ~9 hours
**Research flag:** May need `/gsd:research-phase` if LLM prompt engineering requires domain-specific tuning, but existing AgentService patterns should suffice

---

### Phase Ordering Rationale

- **Dependencies:** Phase 1 has zero dependencies (uses existing Task model). Phase 2 requires Task model (already exists). Phase 3 requires AgentService maturity (already exists).
- **Risk management:** Front-load low-risk, high-value features (Phase 1), defer complex AI integration until proven engagement (Phase 3)
- **User validation:** Phase 1-2 can validate ADHD feature hypothesis before investing in AI complexity
- **Parallelization:** Phase 1 features can be built/shipped independently (urgency utils, voice component, confetti). Phase 2 requires coordination but gamification and notifications are separate endpoints.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (AI Prioritization):** LLM prompt engineering for ADHD-specific prioritization may need iteration. Consider `/gsd:research-phase` if initial prompts don't yield good suggestions. However, existing AgentService patterns + FEATURES.md guidance should provide sufficient starting point.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Immediate Feedback):** Browser Speech API, Notification API, Framer Motion animations—all well-documented with standard implementations
- **Phase 2 (Gamification):** SQL aggregation for streaks, REST API patterns, React component composition—established patterns, no novel technical challenges

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Browser APIs are stable (Chrome 120+, Safari 17+, Firefox 122+), existing Liminal stack ideal for ADHD features, minimal new dependencies (only canvas-confetti, date-fns, APScheduler) |
| Features | **HIGH** | ADHD productivity tool patterns well-established (Todoist, Things 3, Habitica), neuropsychology of ADHD executive function is evidence-based, feature recommendations align with clinical understanding |
| Architecture | **HIGH** | Client-heavy approach matches ADHD latency requirements (<100ms), existing component boundaries accommodate new features cleanly, no schema changes required (all fields exist) |
| Pitfalls | **MEDIUM-HIGH** | Pitfalls identified from established ADHD tool failure modes and user feedback patterns, but Liminal's specific user base may have unique sensitivities requiring iteration |

**Overall confidence:** **HIGH**

The technology choices are mature and well-documented. The feature requirements are grounded in both ADHD cognitive science and competitive analysis of successful ADHD tools. The architecture approach leverages existing Liminal infrastructure with minimal disruption. The primary uncertainty is user-specific (Liminal's ADHD user base preferences), which requires iterative validation rather than upfront research.

### Gaps to Address

- **Browser compatibility edge cases:** Web Speech API limited to Chromium browsers (70% coverage). Plan for graceful degradation (show/hide mic button based on `SpeechRecognition` availability). Test Safari 17+ support specifically.

- **Notification permission rates:** Unknown how many Liminal users will grant notification permissions. Plan for in-app fallback (toast notifications) if browser notifications blocked. Track permission grant rate as KPI.

- **Gamification tuning:** Optimal streak flexibility (5/7 days vs 4/7 vs continuous) requires user testing. Start conservative (no streaks in MVP), add in Phase 2 with A/B testing if needed.

- **AI prompt engineering:** LLM prompts for prioritization may need iteration based on task corpus characteristics (technical vs personal tasks, long vs short durations). Use existing AgentService prompt patterns as starting point, plan for 2-3 prompt revisions based on user feedback.

- **Energy-level detection accuracy:** Time-of-day pattern learning requires significant usage data (30+ days). Defer auto-detection to future, start with manual energy toggle only in Phase 3.

## Sources

### Primary (HIGH confidence)
- **ADHD cognitive science:** Time blindness, importance blindness, executive dysfunction, working memory deficits, dopamine deficit, RSD (Rejection Sensitive Dysphoria)—established clinical understanding of ADHD cognitive profile
- **Browser API documentation:** Web Speech API (SpeechRecognition), Notification API, Web Push API—MDN documentation, caniuse.com compatibility data
- **Existing Liminal codebase:** PROJECT.md, package.json analysis confirms Next.js 13, FastAPI, Framer Motion, Zustand already in stack—no new infrastructure needed
- **Technology versions:** canvas-confetti 1.9.3 (npm), date-fns 3.3.1 (npm), APScheduler 3.10.4 (PyPI)—current stable versions as of January 2025

### Secondary (MEDIUM confidence)
- **Competitive analysis:** Todoist (global quick-add, keyboard shortcuts), Things 3 (one-field capture, completion animations), Habitica (gamification, streaks), Centered (Flow Mode timer), Due (persistent reminders)—established ADHD tool patterns
- **Feature complexity estimates:** 2-4 hours for client-only features, 4-7 hours for backend+frontend features, 9+ hours for AI integration—based on component analysis and existing Liminal architecture
- **Pitfall patterns:** Notification fatigue, gamification anxiety, over-automation distrust—synthesized from ADHD community feedback, tool abandonment patterns, and UX research on neurodivergent users

### Tertiary (LOW confidence)
- **Web Speech API accuracy:** "Works >80% of time in ideal conditions"—needs validation in noisy environments, varies by accent/language
- **Notification engagement rates:** "15% notification-to-action conversion = healthy"—industry benchmark, may not apply to ADHD users specifically
- **Optimal streak flexibility:** "5 out of 7 days" recommendation—based on habit formation research, not ADHD-specific studies

---

*Research completed: 2026-01-31*
*Ready for roadmap: yes*
