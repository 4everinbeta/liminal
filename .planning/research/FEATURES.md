# ADHD-Friendly Productivity Tool Features Research

**Research Type**: Project Research — Features dimension for ADHD-friendly productivity tools
**Date**: 2026-01-31
**Status**: Complete
**For Milestone**: Subsequent (understanding expected behavior for ADHD features)

## Executive Summary

ADHD-optimized productivity tools succeed by **creating urgency and momentum rather than relying on importance-based prioritization**. The core insight: ADHD brains respond to NOW/NOT NOW, not HIGH/LOW priority. Features must reduce friction (especially at capture), provide immediate feedback, and create external structure to compensate for executive dysfunction.

**Key Finding**: The difference between abandoned and beloved ADHD tools is not feature count—it's whether capture happens in <5 seconds and whether the tool creates urgency without shame.

---

## Table Stakes Features

*Must-haves. If missing, ADHD users will abandon the tool within days.*

### 1. Frictionless Capture (CRITICAL)

**Why Table Stakes**: ADHD thoughts are fleeting. A thought captured in 3 seconds becomes a task; one requiring 30 seconds is lost forever. Friction at capture = tool death.

**Expected Behavior**:
- **One-field input** — Title only, everything else optional or inferred
- **Always visible** — Global quick-add widget (floating button, persistent header input)
- **Smart defaults** — Auto-assign deadline (today), auto-detect priority/energy from title text
- **Zero validation** — Accept incomplete/malformed input without blocking
- **Instant feedback** — Visual confirmation within 100ms (don't wait for API)

**Complexity**: LOW (frontend optimization + smart defaults)

**Dependencies**:
- Smart defaults require LLM inference (AI-02)
- Voice capture (CAPTURE-02) enhances but not required

**Examples from Wild**:
- Todoist: Global `q` keyboard shortcut, accepts bare titles
- Things 3: Quick Entry modal (⌘N globally), natural language parsing
- Centered: Single input field with inline AI suggestions

**ADHD Considerations**:
- Working memory deficits mean losing context within seconds
- Hyperfocus interruption is painful—capture must not break flow
- Decision paralysis triggered by multi-step forms

**Implementation Notes**:
- Existing Liminal chat interface is close but requires too much typing
- Need keyboard shortcut to trigger from anywhere
- Form autosave (CAPTURE-05) prevents loss on distraction

---

### 2. Immediate Visual Feedback

**Why Table Stakes**: ADHD brains need external validation that action occurred. Delayed or absent feedback creates anxiety ("did it save?") and disengagement.

**Expected Behavior**:
- **Task creation** — Instant add to list (optimistic UI), confirmation animation
- **Task completion** — Satisfying checkmark animation, item fade-out, celebration micro-interaction
- **Progress tracking** — Real-time counters ("3/12 done today"), visual bars/charts
- **State changes** — Immediate visual update on drag/status change

**Complexity**: LOW-MEDIUM (animations, optimistic updates)

**Dependencies**:
- Completion rewards (REWARD-01, REWARD-04)
- Progress momentum tracking (REWARD-03)

**Examples from Wild**:
- Habitica: Instant XP gain animation on task check
- Forest: Tree growth animation, satisfying completion sound
- Notion: Smooth page transitions, hover states, loading skeletons

**ADHD Considerations**:
- Dopamine deficiency means external rewards compensate for low internal motivation
- Uncertainty creates anxiety paralysis
- Visual confirmation reduces "checking behavior" (reopening app to verify)

**Implementation Notes**:
- Framer Motion already in stack—use for animations
- Optimistic UI updates (update Zustand immediately, sync to backend async)
- Accessibility: Provide reduced-motion alternative

---

### 3. Forgiveness & Recovery

**Why Table Stakes**: ADHD users will be interrupted mid-task. Tools that punish context loss (data loss, required restart) get abandoned.

**Expected Behavior**:
- **Form autosave** — Save draft every 2-3 seconds, restore on return
- **Session persistence** — Restore "where was I" state across page reloads
- **Undo/redo** — Easy recovery from accidental actions (delete, complete)
- **No destructive actions** — Archive instead of delete, easy un-complete
- **Recently viewed** — Quick access to last 3-5 tasks worked on

**Complexity**: MEDIUM (state management, local storage)

**Dependencies**:
- Session persistence (MEMORY-03)
- Recovery from interruptions (MEMORY-02)
- Recently viewed tasks (MEMORY-04)

**Examples from Wild**:
- Google Docs: Autosave, version history, restore from anywhere
- Notion: Trash bin, undo stack, draft recovery
- Apple Reminders: No data loss, easy undo

**ADHD Considerations**:
- Working memory deficits mean forgetting in-progress thoughts
- Interruptions are constant (external and internal)
- Shame/frustration from data loss kills tool adoption

**Implementation Notes**:
- LocalStorage for draft persistence
- Backend soft-delete for tasks (deleted_at timestamp)
- Zustand middleware for undo/redo stack
- "Recently viewed" query in backend (order by updated_at)

---

### 4. Single Primary Interface

**Why Table Stakes**: Choice paralysis is real. Multiple competing interfaces (board view, list view, chat, quick add) create decision fatigue before work starts.

**Expected Behavior**:
- **One default view** — Users land on same screen every time
- **Progressive disclosure** — Advanced features hidden until needed
- **Clear entry points** — Obvious "start here" for new users
- **No competing captures** — One canonical way to add tasks (not chat AND form AND board)

**Complexity**: MEDIUM (UX refactor, not new code)

**Dependencies**:
- Simplify primary interface (SIMPLIFY-03)
- Progressive disclosure (SIMPLIFY-04)

**Examples from Wild**:
- Things 3: Inbox as default, other views discoverable
- Centered: Single "Flow" view, no navigation complexity
- Due: Simple list, advanced features in settings

**ADHD Considerations**:
- Decision fatigue consumes limited executive function
- Too many options trigger avoidance
- Consistency reduces cognitive load

**Implementation Notes**:
- Current Liminal has dashboard, board, chat, focus mode—too many
- Default to Focus Mode or simplified dashboard
- Chat as enhancement (keyboard shortcut overlay), not separate view
- Board view as optional advanced feature

---

### 5. Zero-Effort Prioritization

**Why Table Stakes**: ADHD users cannot reliably assess "importance." Abstract priority (high/medium/low) or numeric scores (1-100) are meaningless without context.

**Expected Behavior**:
- **No manual priority** — System suggests order, user can override
- **Contextual sorting** — Time-based (due soonest), energy-based (quick wins when low energy)
- **Natural language** — "Do this first" not "Priority: 7/10"
- **Auto-calculation** — Urgency score derived from deadline, duration, context

**Complexity**: MEDIUM-HIGH (LLM inference or rule-based scoring)

**Dependencies**:
- AI-powered prioritization (AI-01)
- Auto-sort by deadline/duration (AI-05)
- Simplify scoring (AI-06, SIMPLIFY-05)

**Examples from Wild**:
- Superhuman: "Focus" mode shows 3 emails to handle now
- Sunsama: Daily planning with time-boxing (external structure)
- Motion: AI schedules tasks into calendar automatically

**ADHD Considerations**:
- Importance blindness—ADHD brains don't differentiate urgent/important
- Time blindness—deadlines feel distant until panic sets in
- Analysis paralysis from open-ended decisions

**Implementation Notes**:
- Replace value_score/effort_score/priority_score with auto-calculated urgency
- LLM prompt: "Based on title, deadline, duration, suggest order"
- Fallback rule: sort by (deadline proximity) * (1/duration) if LLM unavailable
- User can drag to reorder (override AI)

---

## Differentiating Features

*Competitive advantages. These make ADHD users say "finally, someone gets it."*

### 6. Urgency System (NOT Deadlines)

**Why Differentiating**: Most tools show deadlines as static dates. ADHD brains need *time pressure* to activate. Urgency systems create artificial NOW-ness.

**Expected Behavior**:
- **Visual aging** — Tasks change color/opacity as they sit (red = urgent, fading = old)
- **Scarcity framing** — "You have 2 hours left today" not "Task due: 5pm"
- **Countdown timers** — Real-time ticking for due-soon tasks
- **Capacity visualization** — "You can fit 3 more tasks today" (external structure)
- **Time pressure notifications** — "Due in 30 min" not "Due today"

**Complexity**: MEDIUM (visual theming, timer logic)

**Dependencies**:
- Visual time pressure (URGENCY-04)
- Scarcity framing (URGENCY-02)
- Daily capacity (URGENCY-06)

**Examples from Wild**:
- Due: Persistent reminders until task done (creates urgency)
- Centered: "Flow Mode" timer creates contained focus blocks
- Beeminder: Visual goal tracking with "red zone" urgency

**ADHD Considerations**:
- Time blindness—abstract deadlines don't create motivation
- Urgency triggers hyperfocus (dopamine release)
- Must avoid shame—frame as supportive pressure not failure

**Implementation Notes**:
- CSS color gradients based on (now - created_at) or (deadline - now)
- Real-time countdown component (useEffect with setInterval)
- Calculate daily capacity: (work hours available) - (sum of task durations)
- Notification service for time-based alerts

**What Makes This Hard**:
- Balancing urgency without anxiety/shame
- Avoiding notification fatigue (too many alerts desensitize)
- Accessibility for colorblind users (not just color, also opacity/icons)

---

### 7. Gamification & Momentum

**Why Differentiating**: External structure compensates for lack of internal discipline. Streaks, achievements, and visible progress create sustained engagement.

**Expected Behavior**:
- **Completion streaks** — "5 days in a row" prominently displayed
- **Concrete metrics** — "You freed up 2 hours today" not just "3 tasks done"
- **Achievement unlocks** — First task, 10 tasks, 100 tasks, 7-day streak
- **Visual progress bars** — Daily/weekly goals with fill animation
- **End-of-day summary** — "You crushed 3 tasks, 2 still open" with celebrate/retry framing

**Complexity**: MEDIUM (tracking state, achievement logic)

**Dependencies**:
- Gamification streaks (URGENCY-03)
- Impact feedback (REWARD-02)
- Progress tracking (REWARD-03)
- End-of-day summary (REWARD-05)

**Examples from Wild**:
- Habitica: Full RPG gamification (levels, gold, quests)
- GitHub: Contribution graph (streak visualization)
- Duolingo: Daily streaks, XP, leagues, achievements

**ADHD Considerations**:
- Novelty-seeking brains need variable rewards
- Streak loss can be devastating—offer "freeze" or grace period
- Visible progress counteracts "nothing is working" feeling

**Implementation Notes**:
- Streaks: Query tasks completed in last N days, find longest unbroken sequence
- Impact metrics: Sum durations, show time savings
- Achievements stored in user profile (unlocked_achievements JSON array)
- End-of-day: Scheduled query at 11pm or triggered on app close

**What Makes This Hard**:
- Avoiding "gamification fatigue" (too many badges become meaningless)
- Balancing extrinsic motivation (streaks) without killing intrinsic motivation
- Handling streak resets gracefully (shame avoidance)

---

### 8. Voice Capture (Hands-Free Input)

**Why Differentiating**: Voice is the ultimate low-friction input. Allows capture while driving, cooking, mid-task, or when typing feels overwhelming.

**Expected Behavior**:
- **Keyboard shortcut** — Press key, speak, auto-submit
- **Ambient listening** — Optional "always listening" mode (privacy toggle)
- **Transcription + parsing** — Convert speech to text, extract title/deadline/tags
- **Error forgiveness** — Accept garbled input, let user correct later
- **Mobile-first** — Voice especially critical on phone (typing is high-friction)

**Complexity**: HIGH (speech recognition API, parsing logic)

**Dependencies**:
- Voice input for task creation (CAPTURE-02)
- LLM parsing to extract structured data from transcript (AI-02)

**Examples from Wild**:
- Apple Reminders: Siri integration ("Remind me to...")
- Google Assistant: Voice task creation in Keep/Tasks
- Otter.ai: Real-time transcription with speaker detection

**ADHD Considerations**:
- Motor restlessness makes sitting/typing painful during hyperfocus on another task
- Thought capture must happen NOW (before distraction)
- Reduces friction from "I don't feel like typing"

**Implementation Notes**:
- Web Speech API (Chrome/Safari support)
- Fallback: Whisper API (OpenAI) or Deepgram for transcription
- LLM prompt: "Extract task title, deadline, tags from: [transcript]"
- Privacy: Local-only speech recognition, explicit opt-in for cloud

**What Makes This Hard**:
- Cross-browser support (Firefox lacks Web Speech API)
- Accuracy in noisy environments
- Privacy concerns (always-listening modes are creepy)
- Mobile Safari restrictions on background audio access

---

### 9. AI-Powered "Do This Now" Suggestions

**Why Differentiating**: Removes decision paralysis. Instead of staring at overwhelming list, AI suggests "do this one task right now."

**Expected Behavior**:
- **Single task highlight** — One task surfaced as "recommended now"
- **Contextual reasoning** — Considers time of day, energy, past patterns, deadlines
- **Easy override** — Swipe/click to dismiss, pick different task
- **Reasoning transparency** — "Suggested because: due in 1 hour" not black box
- **Fallback to simple rules** — If LLM unavailable, use deadline/duration heuristic

**Complexity**: HIGH (LLM integration, context tracking)

**Dependencies**:
- AI "do this now" (AI-01)
- Energy-level detection (AI-03)
- Contextual recommendations (AI-04)
- Easy manual override (AI-02)

**Examples from Wild**:
- Superhuman: Focus mode shows top 3 emails
- Motion: AI schedules tasks into calendar blocks
- Reclaim: AI defends focus time based on patterns

**ADHD Considerations**:
- Decision paralysis from open-ended choice
- Executive dysfunction—can't initiate without external prompt
- Must preserve agency (override) to avoid learned helplessness

**Implementation Notes**:
- LLM prompt: "Given tasks [list], time [9am], energy [medium], past completion patterns [data], recommend ONE task to do now. Explain briefly."
- Fallback: `tasks.sort_by(deadline_proximity * urgency_multiplier).first()`
- Track user overrides to improve suggestions
- Store reasoning in task metadata for transparency

**What Makes This Hard**:
- Balancing AI confidence with user agency
- Avoiding "AI knows best" resentment when suggestions are wrong
- Requires user data (patterns) to be effective
- LLM latency (must respond <1 second for good UX)

---

### 10. Energy-Aware Recommendations

**Why Differentiating**: ADHD energy fluctuates wildly. Tools that ignore energy create friction ("I can't do hard tasks at 3pm").

**Expected Behavior**:
- **Energy tagging** — Tasks marked as "high energy" (deep work) vs "low energy" (admin)
- **Time-of-day patterns** — Learn user's high-energy hours (morning/night)
- **Auto-suggest by energy** — At 8am: hard tasks. At 3pm: quick wins.
- **Manual energy toggle** — "I'm low energy right now" → show only easy tasks

**Complexity**: MEDIUM-HIGH (pattern detection, energy inference)

**Dependencies**:
- Energy-level detection (AI-03)
- Contextual recommendations (AI-04)

**Examples from Wild**:
- Rise: Circadian rhythm tracking, suggests tasks by energy window
- Centered: "Flow Mode" for deep work vs "Maintenance Mode" for admin
- Endel: Adaptive soundscapes based on time/activity

**ADHD Considerations**:
- Energy unpredictability—can't assume morning = high energy
- Low energy + hard task = avoidance spiral
- Quick wins during low energy maintain momentum

**Implementation Notes**:
- Add `energy_required` field to tasks (high/medium/low)
- LLM infers energy from title: "Write proposal" = high, "Reply to email" = low
- Track completion times to learn user patterns (heatmap of hour vs energy)
- Manual toggle: filter tasks by `energy_required <= user_current_energy`

**What Makes This Hard**:
- Energy is subjective and variable (stress, sleep, meds)
- Requires significant usage data to learn patterns
- Risk of "low energy trap" (never doing hard tasks)

---

## Anti-Features

*Things that create friction and should NOT be built. Common in traditional productivity tools, harmful for ADHD.*

### 11. Multi-Step Capture Forms ❌

**Why Harmful**: Every field is a decision point. ADHD users freeze or abandon when faced with:
- Title (required)
- Description (optional but empty box creates guilt)
- Due date (requires time estimation—ADHD users are terrible at this)
- Priority (abstract, meaningless)
- Tags (decision paralysis)
- Assigned theme/initiative (strategic thinking at capture time)

**Expected Avoidance**:
- Single-field capture (title only)
- Optional fields hidden behind "Add details" expansion
- Smart defaults for everything
- Never block submission on missing optional fields

**What to Do Instead**: CAPTURE-06 (one-field capture), CAPTURE-03 (smart defaults)

**ADHD Considerations**:
- Working memory can't hold 5 decisions simultaneously
- Perfectionistic tendency creates "analysis paralysis"
- Shame from incomplete fields prevents submission

---

### 12. Traditional Priority/Importance Scoring ❌

**Why Harmful**: ADHD brains cannot reliably assess "importance" without urgency. Asking users to rate tasks 1-10 or high/medium/low priority results in:
- Everything marked "high priority" (importance inflation)
- Paralysis from abstract decision ("is this a 7 or 8?")
- Ignored scores (users stop trusting their own judgments)

**Expected Avoidance**:
- No "priority" field in capture
- No numeric sliders (1-100 value/effort scores)
- No abstract importance ranking

**What to Do Instead**: AI-06, SIMPLIFY-05 (auto-calculate urgency from deadline/duration/context)

**ADHD Considerations**:
- Importance blindness—everything feels equally urgent or equally unimportant
- Time blindness—can't assess "this matters more" without deadline pressure
- Shame from "why can't I just decide if this is important?"

---

### 13. Required Strategic Planning Upfront ❌

**Why Harmful**: Forcing users to assign themes/initiatives/projects before capturing creates capture failure. ADHD users think:
- "I'll organize this later" → never gets captured
- "Which bucket does this go in?" → decision paralysis
- "I need to create a new theme first" → abandons task

**Expected Avoidance**:
- Themes/initiatives completely optional
- Capture to "Inbox" or "Unorganized" by default
- Strategic organization happens AFTER capture, not before

**What to Do Instead**: SIMPLIFY-01 (make themes optional), CAPTURE-04 (dump now, refine later)

**ADHD Considerations**:
- Executive dysfunction—can't do meta-planning while trying to capture
- Strategic thinking requires high cognitive load (unavailable during capture)
- Bottom-up organization (emergent patterns) works better than top-down (predefined categories)

---

### 14. Blocking Modals & Multi-Step Workflows ❌

**Why Harmful**: ADHD users are mid-flow when taking action. Interrupting with:
- "Are you sure you want to move this task?" confirmation dialogs
- "Please fill out these required fields before continuing" validation blocks
- "Choose a theme for this task" forced selections

...kills momentum and creates frustration.

**Expected Avoidance**:
- No confirmation dialogs (use undo instead)
- No validation blocking (accept incomplete data)
- No mid-action interruptions

**What to Do Instead**: SIMPLIFY-02 (remove multi-step gating), forgiving undo system

**ADHD Considerations**:
- Hyperfocus interruption is painful
- Momentum is precious—once broken, hard to restart
- "Good enough" beats "perfect"

---

### 15. Abstract Numeric Inputs Without Context ❌

**Why Harmful**: Asking "How long will this take?" with a blank duration field results in:
- Random guesses (30 min, 1 hour, 2 hours—all feel the same)
- Time blindness paralysis (no idea how to estimate)
- Inaccurate data that ruins prioritization

**Expected Avoidance**:
- No blank numeric inputs
- Provide presets/quick picks (15 min, 30 min, 1 hr, 2 hr)
- Allow natural language ("about an hour")
- Make optional with smart defaults

**What to Do Instead**: LLM inference from title ("Write blog post" → suggest 2 hours), preset buttons

**ADHD Considerations**:
- Time blindness—cannot accurately estimate duration
- Blank fields create decision paralysis
- Inaccurate estimates are still useful (better than none)

---

### 16. Perfectionism-Enabling Features ❌

**Why Harmful**: ADHD often pairs with perfectionism. Features that encourage endless refinement prevent completion:
- Rich text editors for task descriptions (hours spent formatting)
- Extensive tagging/metadata fields (must categorize perfectly)
- Template systems (must find "the right template")
- Custom fields (must capture every detail)

**Expected Avoidance**:
- Plain text only (no rich formatting)
- Minimal optional fields
- No customization at capture time

**What to Do Instead**: Progressive disclosure—basic capture is simple, details can be added later if needed

**ADHD Considerations**:
- Perfectionism creates "all or nothing" thinking
- Analysis paralysis from too many options
- Completion > perfection (done is better than perfect)

---

### 17. Passive Deadline Displays ❌

**Why Harmful**: Showing "Due: Jan 31, 2026" as static text does not create urgency. ADHD brains ignore:
- Dates without time pressure
- Deadlines more than 24 hours away
- Static displays (no movement = no salience)

**Expected Avoidance**:
- No "Due date: [date]" labels
- No calendar widgets without urgency context

**What to Do Instead**: URGENCY-02, URGENCY-04 (scarcity framing, visual aging, countdown timers)

**ADHD Considerations**:
- Time blindness—dates feel abstract
- Present bias—future deadlines don't activate motivation
- Need concrete NOW pressure to initiate

---

### 18. Shame-Inducing Failure States ❌

**Why Harmful**: Traditional productivity tools punish failure:
- Red "overdue" labels (shame)
- Broken streaks with no recovery (guilt)
- Empty completion graphs (demoralization)
- "You missed your goals" notifications (self-loathing)

**Expected Avoidance**:
- No red "OVERDUE" badges
- Streak freeze/repair options
- Celebrate progress, not just completion
- Reframe "missed" as "rescheduled" or "deprioritized"

**What to Do Instead**: Supportive framing—"Not finished? Want to reschedule or break it down?"

**ADHD Considerations**:
- Rejection sensitivity dysphoria (RSD)—shame is paralyzing
- Failure spirals—one miss triggers avoidance
- Need encouragement, not punishment

---

## Feature Complexity Matrix

| Feature | Complexity | Effort (days) | Dependencies | Risk |
|---------|-----------|---------------|--------------|------|
| One-field capture | LOW | 2-3 | Smart defaults (LLM) | Low |
| Immediate visual feedback | LOW-MED | 3-5 | Framer Motion animations | Low |
| Form autosave | MEDIUM | 3-4 | LocalStorage, Zustand | Medium |
| Session persistence | MEDIUM | 4-5 | LocalStorage, backend | Medium |
| Single primary interface | MEDIUM | 5-7 | UX refactor (no new code) | Medium |
| Auto-prioritization | MED-HIGH | 7-10 | LLM integration | Medium |
| Visual urgency system | MEDIUM | 5-7 | Real-time timers | Low |
| Gamification/streaks | MEDIUM | 5-8 | State tracking, achievements | Medium |
| Voice capture | HIGH | 10-14 | Speech API, LLM parsing | High |
| AI "do this now" | HIGH | 10-12 | LLM, pattern tracking | High |
| Energy-aware recs | MED-HIGH | 8-10 | Pattern detection | Medium |

**Total estimated effort (table stakes)**: 20-28 days
**Total estimated effort (differentiators)**: 45-61 days
**Critical path**: Voice capture, AI recommendations (highest risk)

---

## Feature Dependencies Graph

```
Frictionless Capture (1)
├─> Smart Defaults (AI-02)
├─> Form Autosave (CAPTURE-05)
└─> Voice Capture (6) [DIFFERENTIATOR]
    └─> LLM Parsing (AI-02)

Visual Feedback (2)
├─> Completion Rewards (REWARD-01, REWARD-04)
└─> Progress Tracking (REWARD-03)

Forgiveness (3)
├─> Session Persistence (MEMORY-03)
├─> Recovery (MEMORY-02)
└─> Recently Viewed (MEMORY-04)

Single Interface (4)
├─> Progressive Disclosure (SIMPLIFY-04)
└─> Primary Interface (SIMPLIFY-03)

Auto-Prioritization (5)
├─> AI "Do This Now" (9) [DIFFERENTIATOR]
│   ├─> Energy Detection (AI-03)
│   └─> Context Recs (AI-04)
├─> Auto-Sort (AI-05)
└─> Simplify Scoring (AI-06, SIMPLIFY-05)

Urgency System (6) [DIFFERENTIATOR]
├─> Visual Aging (URGENCY-04)
├─> Scarcity Framing (URGENCY-02)
└─> Daily Capacity (URGENCY-06)

Gamification (7) [DIFFERENTIATOR]
├─> Streaks (URGENCY-03)
├─> Impact Feedback (REWARD-02)
└─> End-of-Day Summary (REWARD-05)

Energy-Aware Recs (10) [DIFFERENTIATOR]
└─> Requires Auto-Prioritization (5)
```

**Critical Insight**: Features 1-5 (table stakes) must be built first. Differentiators 6-10 build on top but can be delivered incrementally.

---

## Implementation Roadmap

### Phase 1: Table Stakes (MVP for ADHD Users)
**Goal**: Functional tool that doesn't actively harm ADHD users
**Duration**: 20-28 days

1. One-field capture (CAPTURE-06)
2. Smart defaults for optional fields (CAPTURE-03)
3. Form autosave (CAPTURE-05)
4. Immediate visual feedback (animations, optimistic UI)
5. Session persistence & recovery
6. Simplify primary interface (remove competing captures)
7. Auto-prioritization (basic: deadline + duration sort)

**Success Criteria**: User can capture task in <5 seconds, doesn't lose data, knows what to do next.

---

### Phase 2: Urgency & Momentum (Engagement)
**Goal**: Create sustained usage through urgency and rewards
**Duration**: 15-25 days

8. Visual urgency system (color aging, countdown timers)
9. Scarcity framing ("2 hours left today")
10. Daily capacity visualization
11. Completion rewards (animations, confetti)
12. Gamification (streaks, achievements)
13. End-of-day summary

**Success Criteria**: Users return daily, feel urgency without shame, celebrate progress.

---

### Phase 3: AI-Powered Intelligence (Differentiation)
**Goal**: Reduce decision paralysis through smart suggestions
**Duration**: 20-30 days

14. AI "do this now" recommendations
15. Energy-level detection & filtering
16. Contextual recommendations (time/day patterns)
17. Voice capture (speech-to-task)
18. LLM parsing for smart defaults

**Success Criteria**: Users trust AI suggestions, voice capture works >80% of time, prioritization feels magical.

---

## ADHD-Specific Design Principles

### 1. Optimize for NOW, not LATER
- Capture must happen in the moment (thought lifespan: <30 seconds)
- Urgency must be immediate (not "due in 3 days")
- Feedback must be instant (<100ms)

### 2. Reduce Cognitive Load
- One decision per interaction (not 5 form fields)
- Smart defaults for everything
- Progressive disclosure (hide complexity until needed)

### 3. Create External Structure
- AI suggestions replace decision-making
- Urgency system replaces internal time sense
- Gamification replaces discipline

### 4. Forgive and Recover
- No data loss ever
- Easy undo for all actions
- Reschedule, don't shame

### 5. Celebrate Progress
- Visible wins (animations, metrics)
- Concrete impact ("You freed up 2 hours")
- Momentum tracking (streaks, graphs)

### 6. Avoid Shame Triggers
- No red "overdue" labels
- No perfectionism enablers (rich text, custom fields)
- No blocking validation
- Supportive language ("Not done? Want to reschedule?")

---

## Competitive Analysis (Implied)

### Tools ADHD Users Love
- **Todoist**: Global quick-add, keyboard shortcuts, natural language
- **Things 3**: Beautiful animations, one-field capture, satisfying completion
- **Centered**: Flow Mode timer, focus music, single-task view
- **Habitica**: Gamification, streaks, visible progress
- **Due**: Persistent reminders, urgency creation

### Tools ADHD Users Abandon
- **Asana/Monday**: Complex project management, required fields, strategic planning upfront
- **Notion**: Perfectionism trap (templates, formatting), decision paralysis
- **Trello**: Passive boards (no urgency), requires manual prioritization
- **Microsoft To Do**: Abstract importance ranking, no urgency system

### What Liminal Can Do Better
- **AI-powered urgency** (not just static deadlines)
- **Voice capture** (lower friction than Todoist's typing)
- **Energy-aware recommendations** (smarter than Things 3's static lists)
- **Concrete impact metrics** (better feedback than Habitica's abstract XP)

---

## Open Questions for Requirements Definition

1. **Voice capture scope**: Web-only (Speech API) or also mobile app (future)?
2. **Gamification depth**: Simple streaks or full achievement system (Habitica-style)?
3. **AI suggestion frequency**: One task highlighted or top 3 suggestions?
4. **Energy tracking**: Manual toggle or auto-detect from patterns?
5. **Notification aggressiveness**: How many urgency alerts before fatigue?
6. **Privacy**: Store voice recordings or transcripts only?
7. **Accessibility**: WCAG AA or AAA compliance for urgency visuals?

---

## Sources & References

**Research Methodology**: This document synthesizes:
- Industry analysis of ADHD productivity tools (Todoist, Things 3, Centered, Habitica, Due)
- Cognitive science on ADHD executive function (urgency response, time blindness, working memory deficits)
- UX patterns for neurodivergent users (friction reduction, immediate feedback, forgiveness)
- Existing Liminal codebase analysis (PROJECT.md, README.md)

**Note**: Web search was unavailable during research. This document is based on established patterns in ADHD productivity tools and cognitive psychology principles (knowledge cutoff: January 2025).

---

**Status**: Complete and ready for requirements definition.
**Next Step**: Use this document to define specific requirements (user stories, acceptance criteria, technical specs) for each feature category.
