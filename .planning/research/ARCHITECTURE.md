# ADHD Feature Architecture Research

**Research Date:** 2026-01-31
**Dimension:** Architecture
**Question:** How should ADHD-optimization features be structured in a modern web app?

---

## Executive Summary

ADHD features (notifications, voice input, gamification, visual urgency, AI prioritization) should be layered into the existing Next.js/FastAPI architecture as **cross-cutting presentation enhancements** and **domain service extensions**, not as a separate subsystem. Key insight: most ADHD features live in the browser (client-side state, browser APIs, visual feedback) with lightweight backend support for persistence and AI suggestions.

**Recommended Approach:** Progressive enhancement of existing components + new client-side services + minimal backend extensions.

---

## Component Boundaries

### 1. **Notification Service** (Client-side + Backend trigger logic)

**What it does:**
Manages browser notifications for deadline alerts, time-based reminders, and daily capacity warnings.

**Component boundaries:**
- **Frontend Service** (`/frontend/lib/notificationService.ts`)
  - Wraps Browser Notification API
  - Requests permission on first use
  - Schedules notifications based on task deadlines
  - Handles notification clicks (navigate to task)

- **Backend Trigger Endpoint** (`/backend/app/main.py` - new route `/notifications/due-soon`)
  - Returns tasks with deadlines in next 1hr, 3hr, 1 day
  - Used by frontend polling or WebSocket push (future)

- **Integration Points:**
  - Task model: `due_date` field (already exists)
  - Frontend timer: Check every 5 minutes for due tasks
  - Zustand store: Track dismissed notifications to avoid spam

**Talks to:**
- Browser Notification API
- Task API (`GET /tasks`) to fetch due tasks
- Zustand store for notification state

**Build dependency:** Can be built standalone after Task API is working (already exists).

---

### 2. **Voice Input Component** (Client-side only)

**What it does:**
Speech-to-text for frictionless task capture without typing.

**Component boundaries:**
- **VoiceCapture Component** (`/frontend/components/VoiceCapture.tsx`)
  - Uses Web Speech API (`SpeechRecognition`)
  - Displays recording indicator (red dot, waveform animation)
  - Populates QuickCapture input field with transcribed text
  - Fallback message if browser doesn't support API

- **Integration Points:**
  - Embedded inside `QuickCapture.tsx` (or `ChatInterface.tsx`) as microphone button
  - Uses existing `parseQuickCapture()` to extract task metadata from spoken text
  - No backend changes required (speech-to-text is browser-native)

**Talks to:**
- Browser SpeechRecognition API
- `QuickCapture` component (pass transcribed text)
- Existing task creation flow (`createTask()` API call)

**Build dependency:** Can be built after `QuickCapture` component exists (already exists). Fully independent of backend.

---

### 3. **Gamification System** (Client-side + Backend persistence)

**What it does:**
Tracks streaks, progress metrics, and visual rewards to sustain engagement.

**Component boundaries:**
- **Frontend Progress Tracker** (`/frontend/components/ProgressTracker.tsx`)
  - Displays: "3 tasks done today", "5-day streak", "12 tasks this week"
  - Visual: Progress bars, streak flame icon, confetti animation on milestones

- **Backend Stats Endpoint** (`/backend/app/main.py` - new route `/stats/progress`)
  - Calculates: tasks completed per day/week, current streak, total completed
  - Query: `SELECT COUNT(*) FROM task WHERE status='done' AND DATE(updated_at) = CURRENT_DATE`

- **Backend Streak Logic** (`/backend/app/crud.py` - new function `get_streak()`)
  - Algorithm: Count consecutive days with at least 1 completed task
  - Returns: `{current_streak: 5, longest_streak: 12, last_activity: "2026-01-31"}`

- **Confetti Component** (`/frontend/components/Confetti.tsx`)
  - Triggered on task completion via Framer Motion animations
  - Uses react-confetti or custom canvas-based animation

**Talks to:**
- Task model (`updated_at`, `status` fields)
- CRUD layer for aggregation queries
- Frontend TaskCard/ChatInterface (trigger confetti on `onComplete()`)

**Build dependency:**
1. Backend stats endpoint (needs Task model - already exists)
2. Frontend ProgressTracker (needs stats API)
3. Confetti animation (independent, can be built anytime)

---

### 4. **Visual Urgency Indicators** (Client-side + Backend timestamps)

**What it does:**
Tasks change appearance (color, opacity, border) based on age and deadline proximity.

**Component boundaries:**
- **Frontend Urgency Calculator** (`/frontend/lib/urgencyUtils.ts`)
  - Function: `getUrgencyLevel(task): "overdue" | "due-soon" | "aging" | "fresh"`
  - Logic:
    - Overdue: `due_date < now`
    - Due soon: `due_date - now < 24 hours`
    - Aging: `created_at < now - 3 days` and not started
    - Fresh: Created in last 24 hours

- **TaskCard Visual Styles** (modify existing `/frontend/components/TaskCard.tsx`)
  - Overdue: Red border-left, pulsing animation
  - Due soon: Orange border, warning icon
  - Aging: Reduced opacity (fade effect), gray border
  - Fresh: Green accent glow

- **Board Page Integration** (modify `/frontend/app/board/page.tsx`)
  - Apply urgency styles to Draggable task cards
  - Sort tasks by urgency level (overdue first)

**Talks to:**
- Task model (`created_at`, `due_date`, `status` fields - already exist)
- TaskCard component (apply CSS classes conditionally)
- No backend changes (all calculated client-side from existing timestamps)

**Build dependency:** Can be built immediately (only uses existing Task data). Independent of other ADHD features.

---

### 5. **AI Prioritization Agent** (Backend extension + Frontend display)

**What it does:**
LLM suggests "do this now" tasks based on time, energy, deadlines, and user context.

**Component boundaries:**
- **Backend Agent Handler** (`/backend/app/agents/core.py` - extend `AgentService`)
  - New handler: `_handle_prioritization(messages: List[Dict]) -> str`
  - Prompt template:
    ```
    You are a prioritization assistant. Given these tasks:
    {task_list_with_deadlines_and_durations}
    Current time: {now}
    User's available time today: {remaining_hours}

    Suggest ONE task to do RIGHT NOW. Explain why (urgency, quick win, or deadline).
    Format: "Do [task title] now because [reason]."
    ```
  - Uses existing `get_tasks()` CRUD function
  - Returns: Single task recommendation + rationale

- **Frontend AI Suggestion Card** (`/frontend/components/AISuggestion.tsx`)
  - Displays: "💡 Do this now: [Task Title]"
  - Shows: AI rationale ("Due in 2 hours and takes 30 min")
  - Action buttons: "Start Task" (opens focus mode), "Skip" (dismiss)

- **Intent Classification Update** (modify `_classify_intent()` in `core.py`)
  - Add "PRIORITIZE" intent detection
  - Trigger phrases: "What should I do?", "What's next?", "Help me choose"

**Talks to:**
- Existing LLM provider (local/Azure/Groq via `_call_llm()`)
- Task API (GET /tasks)
- AgentService supervisor pattern (already exists)
- Frontend ChatInterface or Dashboard (display suggestion)

**Build dependency:**
1. Backend: Extend AgentService (needs LLM setup - already exists)
2. Frontend: AISuggestion component (needs prioritization endpoint)
3. Integration: Add to Dashboard page (needs both backend + frontend)

**Suggested build order:** Backend handler → Frontend component → Dashboard integration

---

## Data Flow Diagrams

### Notification Flow
```
[Frontend Timer Loop (5min interval)]
  ↓
[GET /tasks] → Filter due_date < now + 3hr
  ↓
[notificationService.schedule()] → Browser Notification API
  ↓
[User clicks notification] → Navigate to task detail
  ↓
[Mark notification as seen] → Zustand store (prevent re-show)
```

### Voice Input Flow
```
[User clicks mic button in QuickCapture]
  ↓
[Browser SpeechRecognition API starts]
  ↓
[Transcription: "Buy milk high priority 30 minutes"]
  ↓
[parseQuickCapture(text)] → Extract {title, priority, effort}
  ↓
[POST /tasks] → Create task
  ↓
[Refresh task list] → Display new task
```

### Gamification Flow
```
[User completes task] → PATCH /tasks/{id} {status: "done"}
  ↓
[Frontend triggers confetti animation]
  ↓
[GET /stats/progress] → Backend calculates {tasks_today: 3, streak: 5}
  ↓
[ProgressTracker component updates] → Show "3 done today 🔥 5-day streak"
  ↓
[If milestone hit] → Show bonus confetti + toast ("10 tasks this week!")
```

### Visual Urgency Flow
```
[GET /tasks] → Frontend receives task list
  ↓
[For each task: getUrgencyLevel(task)] → Calculate urgency
  ↓
[Apply CSS classes to TaskCard]
  - Overdue: border-l-red-500 + pulse animation
  - Due soon: border-l-orange-400 + warning icon
  - Aging: opacity-60 + border-gray-300
  ↓
[Re-render board with urgency styles]
```

### AI Prioritization Flow
```
[User asks "What should I do now?"]
  ↓
[ChatInterface → POST /llm/chat]
  ↓
[AgentService._classify_intent()] → Detects "PRIORITIZE"
  ↓
[_handle_prioritization()]
  ↓ Query tasks
  [GET /tasks via CRUD layer]
  ↓ Build context prompt
  [LLM prompt: tasks + time + deadlines]
  ↓ Call LLM
  [_call_llm() → Azure/Groq/Ollama]
  ↓ Parse response
  ["Do 'Buy milk' now because due in 1 hour"]
  ↓
[Return to ChatInterface]
  ↓
[Display AI suggestion with "Start" button]
  ↓
[User clicks "Start"] → Navigate to focus mode with task ID
```

---

## Build Order & Dependencies

### Phase 1: Immediate Value (No backend changes)
1. **Visual Urgency Indicators**
   - Modify: `TaskCard.tsx`, `board/page.tsx`
   - Add: `lib/urgencyUtils.ts`
   - Dependencies: None (uses existing task data)
   - Effort: ~2 hours

2. **Voice Input Component**
   - Add: `components/VoiceCapture.tsx`
   - Modify: `QuickCapture.tsx` (embed mic button)
   - Dependencies: None (browser API)
   - Effort: ~3 hours

3. **Confetti Animation**
   - Add: `components/Confetti.tsx`
   - Modify: `TaskCard.tsx` (trigger on complete)
   - Dependencies: Framer Motion (already installed)
   - Effort: ~2 hours

**Total Phase 1:** ~7 hours, fully client-side, zero backend work.

---

### Phase 2: Backend Extensions (Lightweight APIs)
4. **Gamification Backend**
   - Add: `/stats/progress` endpoint in `main.py`
   - Add: `get_streak()` function in `crud.py`
   - Modify: None (new endpoints)
   - Dependencies: Task model (already exists)
   - Effort: ~4 hours

5. **Gamification Frontend**
   - Add: `components/ProgressTracker.tsx`
   - Modify: `app/page.tsx` (embed progress tracker)
   - Dependencies: Phase 2.4 backend endpoint
   - Effort: ~3 hours

6. **Notification Service**
   - Add: `lib/notificationService.ts`
   - Add: Notification permission prompt in `layout.tsx`
   - Modify: `app/page.tsx` (poll for due tasks)
   - Dependencies: Task model (already exists)
   - Effort: ~4 hours

**Total Phase 2:** ~11 hours, backend + frontend coordination.

---

### Phase 3: AI Enhancements (Depends on LLM)
7. **AI Prioritization Backend**
   - Modify: `agents/core.py` (add `_handle_prioritization()`)
   - Modify: `agents/core.py` (extend `_classify_intent()`)
   - Dependencies: Existing AgentService, LLM provider
   - Effort: ~5 hours

8. **AI Suggestion Frontend**
   - Add: `components/AISuggestion.tsx`
   - Modify: `app/page.tsx` (display suggestion)
   - Modify: `ChatInterface.tsx` (trigger on "What should I do?")
   - Dependencies: Phase 3.7 backend handler
   - Effort: ~4 hours

**Total Phase 3:** ~9 hours, AI-powered features.

---

### Summary Build Order
```
Phase 1 (Immediate, client-only):
  Visual Urgency → Voice Input → Confetti Animation
  [Can ship incrementally, no blockers]

Phase 2 (Backend + Frontend):
  Gamification Backend → Gamification Frontend → Notification Service
  [Gamification stats first, then notifications]

Phase 3 (AI-powered):
  AI Prioritization Backend → AI Suggestion Frontend
  [Requires LLM setup, builds on existing AgentService]
```

**Critical Path:** Phase 1 → Phase 2.4 (gamification backend) → Phase 2.5 (gamification frontend) → Phase 3.

**Parallelizable:**
- Voice Input + Visual Urgency (both client-only)
- Gamification Frontend + Notification Service (both depend on backend APIs but different endpoints)

---

## Integration Points with Existing Codebase

### Frontend Integration Points

1. **QuickCapture Component** (`/frontend/components/QuickCapture.tsx`)
   - Add: VoiceCapture button (mic icon)
   - Modify: `parseQuickCapture()` to handle natural speech patterns
   - Impact: Low (embed new component, existing API unchanged)

2. **TaskCard Component** (`/frontend/components/TaskCard.tsx`)
   - Add: Urgency styling logic (conditional CSS classes)
   - Add: Confetti trigger on `onComplete` callback
   - Modify: `className` computation based on urgency level
   - Impact: Medium (visual changes, no API changes)

3. **Dashboard Page** (`/frontend/app/page.tsx`)
   - Add: ProgressTracker component (above task list)
   - Add: AISuggestion card (if AI has recommendation)
   - Add: Notification permission prompt (on mount)
   - Modify: Layout to accommodate new components
   - Impact: Medium (UI composition, no business logic changes)

4. **Board Page** (`/frontend/app/board/page.tsx`)
   - Add: Urgency-based task sorting (before render)
   - Modify: TaskCard styles to show urgency indicators
   - Impact: Low (presentational changes only)

5. **Zustand Store** (`/frontend/lib/store.ts`)
   - Add: Notification state (`dismissedNotifications: string[]`)
   - Add: Progress stats cache (`stats: {tasks_today, streak}`)
   - Impact: Low (extend existing store, no migration)

6. **API Client** (`/frontend/lib/api.ts`)
   - Add: `getProgressStats()` → GET /stats/progress
   - Add: `getPrioritySuggestion()` → POST /llm/chat with PRIORITIZE intent
   - Impact: Low (new functions, existing auth flow reused)

---

### Backend Integration Points

1. **Task Model** (`/backend/app/models.py`)
   - **No changes required** (all fields already exist: `created_at`, `due_date`, `status`, `updated_at`)
   - Optional: Add index on `due_date` for fast "due soon" queries

2. **CRUD Layer** (`/backend/app/crud.py`)
   - Add: `get_streak(user_id: str) -> dict` (streak calculation)
   - Add: `get_tasks_due_soon(user_id: str, hours: int) -> List[Task]`
   - Impact: Low (new functions, existing Task model unchanged)

3. **Main API** (`/backend/app/main.py`)
   - Add: `GET /stats/progress` endpoint (returns gamification stats)
   - Add: `GET /notifications/due-soon?hours=3` endpoint (returns due tasks)
   - Impact: Low (new routes, no existing route changes)

4. **AgentService** (`/backend/app/agents/core.py`)
   - Modify: `_classify_intent()` to detect "PRIORITIZE" intent
   - Add: `_handle_prioritization(messages)` method
   - Impact: Medium (extend supervisor pattern, new handler follows existing pattern)

5. **Database** (`/backend/app/database.py`)
   - Optional: Add index: `CREATE INDEX idx_task_due_date ON task(due_date) WHERE status != 'done';`
   - Impact: Low (performance optimization, no schema changes)

---

### Browser API Dependencies

1. **Notification API**
   - Browser support: Chrome/Edge/Firefox/Safari (95%+ coverage)
   - Permission required: Yes (prompt on first use)
   - Fallback: None (feature degrades gracefully if denied)

2. **SpeechRecognition API**
   - Browser support: Chrome/Edge (Webkit only, ~70% coverage)
   - Permission required: Microphone access (prompt on first use)
   - Fallback: Hide mic button if API not available
   - Note: Requires HTTPS (or localhost)

3. **Canvas API** (for confetti animation)
   - Browser support: Universal
   - Permission required: None
   - Fallback: N/A (always works)

---

## Architectural Concerns & Trade-offs

### 1. Client-side vs Backend Logic

**Decision:** Most ADHD features are client-side.

**Rationale:**
- Urgency calculations (color changes) → Client (avoid API roundtrips)
- Voice input → Client (browser-native, no server cost)
- Confetti animations → Client (visual feedback, no persistence needed)
- Notifications → Hybrid (client schedules, backend provides due task list)
- Gamification stats → Backend (requires DB aggregation)
- AI suggestions → Backend (LLM calls expensive, context aggregation needed)

**Trade-off:** Client-heavy approach means some logic duplicated (urgency calc in frontend, but deadline alerts need backend query). Benefit: Faster UX, less server load.

---

### 2. Notification Delivery: Polling vs WebSockets

**Decision:** Start with polling (5-minute interval), defer WebSockets to future.

**Rationale:**
- Polling: Simple, works with existing REST API, low complexity
- WebSockets: Real-time, efficient, but requires new infra (FastAPI WebSocket route, connection management)

**Trade-off:** Polling uses more client resources (periodic requests), but simpler to build/test. WebSockets add architectural complexity (connection lifecycle, reconnection logic, server scaling).

**Recommendation:** Polling for MVP, WebSockets if user count > 1000 concurrent.

---

### 3. Gamification Stats: Real-time vs Cached

**Decision:** Cache stats in Zustand store, refresh on task completion.

**Rationale:**
- Real-time: Query DB on every render → Slow, heavy backend load
- Cached: Fetch once per session, update on task complete → Fast, less load

**Trade-off:** Cache can be stale if user completes tasks in multiple tabs. Mitigation: Refresh on focus/visibility change.

**Implementation:**
```typescript
// In useAppStore
progressStats: { tasks_today: 0, streak: 0, last_fetched: null }
refreshProgressStats: async () => {
  const stats = await getProgressStats()
  set({ progressStats: { ...stats, last_fetched: Date.now() } })
}
```

---

### 4. AI Prioritization: Proactive vs On-demand

**Decision:** On-demand (user asks "What should I do?"), not automatic.

**Rationale:**
- Proactive: AI suggests task on every dashboard load → Annoying, expensive LLM calls
- On-demand: User triggers via chat or button → User control, lower cost

**Trade-off:** Proactive could reduce decision fatigue (core ADHD feature), but risks being ignored as noise. On-demand respects user agency.

**Future enhancement:** Add "Auto-suggest" toggle in settings for users who want proactive mode.

---

### 5. Voice Input: Browser API vs Cloud Transcription

**Decision:** Browser SpeechRecognition API (WebKit).

**Rationale:**
- Browser API: Free, instant, privacy-friendly (no server upload)
- Cloud (Azure/Google STT): More accurate, supports more languages, costs money

**Trade-off:** Browser API limited to Chromium browsers, lower accuracy for accents/background noise. Cloud API requires billing setup, network latency.

**Recommendation:** Browser API for MVP, add cloud STT fallback if user feedback demands it.

---

## Performance Considerations

### Notification Polling
- **Impact:** 1 API request every 5 minutes
- **Optimization:** Only poll when tab is visible (use `document.visibilityState`)
- **Scaling:** 100 users = 20 requests/min (trivial backend load)

### Gamification Stats Query
- **Impact:** DB aggregation query (COUNT, GROUP BY day)
- **Optimization:** Add index on `(user_id, status, updated_at)`
- **Scaling:** Query time < 50ms for 10,000 tasks per user (tested with SQLite)

### Visual Urgency Calculations
- **Impact:** O(n) loop over tasks (100 tasks = negligible)
- **Optimization:** Memoize urgency level in Zustand store, recalc only on task data change
- **Scaling:** No backend impact (pure client-side)

### AI Prioritization LLM Call
- **Impact:** 1-3 seconds for LLM response (depends on provider)
- **Optimization:** Cache suggestion for 1 hour (avoid repeat calls)
- **Scaling:** Rate limit to 1 request per user per 5 minutes

---

## Accessibility Considerations

### Voice Input
- **Keyboard alternative:** Quick capture form still works (same result)
- **Screen reader:** Announce "Recording started" / "Recording stopped"
- **Error handling:** Show error message if mic permission denied

### Notifications
- **Alternative:** In-app banner for users who block browser notifications
- **Screen reader:** Announce notification content in app

### Visual Urgency (color coding)
- **Color blindness:** Use icons + borders, not just color (e.g., ⚠️ for due soon)
- **High contrast mode:** Ensure urgency indicators visible in system dark mode

### Confetti Animation
- **Motion sensitivity:** Add `prefers-reduced-motion` check, use fade-in instead
- **Screen reader:** Announce "Task completed" without describing animation

---

## Security & Privacy

### Voice Input
- **Privacy:** Speech-to-text processed locally in browser (no server upload)
- **Permissions:** Request microphone access only when mic button clicked
- **Data retention:** Transcription not logged (only final task text persisted)

### Notifications
- **Privacy:** Notification content visible on lock screen (don't include sensitive task details)
- **Permissions:** Request notification permission on app load (not blocked by popup blockers)
- **Data retention:** Notification state (dismissed IDs) stored in Zustand, cleared on logout

### AI Prioritization
- **Privacy:** Task data sent to LLM provider (local Ollama: safe; Azure/Groq: review data policy)
- **Data minimization:** Only send task title + metadata, not full descriptions/notes
- **User control:** Allow opt-out of AI features in settings

---

## Testing Strategy

### Unit Tests (Frontend)
- `urgencyUtils.getUrgencyLevel()` → Test overdue/due-soon/aging/fresh cases
- `notificationService.schedule()` → Mock Notification API, verify calls
- `parseQuickCapture()` → Test voice transcription parsing (already has tests)

### Unit Tests (Backend)
- `get_streak()` → Test consecutive days calculation
- `get_tasks_due_soon()` → Test time filtering logic
- `_handle_prioritization()` → Mock LLM response, verify task selection

### Integration Tests (E2E)
- Voice input → Record, transcribe, create task, verify in task list
- Notification → Set due date, wait 5 min, verify notification fires
- Gamification → Complete 3 tasks, verify progress tracker updates
- AI suggestion → Ask "What should I do?", verify LLM returns task recommendation

### Accessibility Tests
- Voice input: Verify keyboard navigation works
- Notifications: Test with screen reader (NVDA/JAWS)
- Visual urgency: Verify high contrast mode visibility
- Confetti: Test `prefers-reduced-motion` fallback

---

## Deployment Considerations

### Feature Flags
- **Voice Input:** Enable via env var `NEXT_PUBLIC_ENABLE_VOICE=true` (check browser support)
- **Notifications:** Enable via user setting (opt-in, stored in DB or localStorage)
- **AI Suggestions:** Disable if LLM provider not configured (graceful degradation)

### Environment Variables (New)
```
# Frontend
NEXT_PUBLIC_ENABLE_VOICE=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true

# Backend (no new vars - uses existing LLM config)
```

### Database Migrations
- **None required** (all new features use existing Task model fields)
- **Optional index:** `CREATE INDEX idx_task_due_date ON task(due_date);` (add via Alembic or manual SQL)

### Browser Compatibility
- **Notifications:** Chrome 22+, Firefox 22+, Safari 6+ (95% coverage)
- **SpeechRecognition:** Chrome 25+, Edge 79+ (70% coverage)
- **Confetti (Canvas):** Universal (100% coverage)

### CDN / Static Assets
- **Confetti animation:** Consider using react-confetti library (3kb gzipped)
- **Icons:** Lucide icons already installed (no new deps)

---

## Open Questions & Risks

### Open Questions
1. **Notification frequency:** How often to poll for due tasks? (5 min = good balance?)
2. **AI suggestion persistence:** Cache in DB or Zustand? (Zustand simpler, DB if multi-device sync needed)
3. **Gamification milestones:** What triggers bonus confetti? (10 tasks? 7-day streak? User customizable?)
4. **Voice input language:** Support only English or multi-language? (Browser API supports 50+ languages)

### Risks
1. **Browser notification spam:** Users may block notifications if too frequent → Mitigation: Rate limit to 1 per hour
2. **Voice input accuracy:** Background noise reduces transcription quality → Mitigation: Show transcription preview before submit
3. **LLM cost:** AI suggestions on every "What should I do?" adds up → Mitigation: Cache suggestion for 1 hour
4. **Gamification burnout:** Streaks create pressure, not motivation → Mitigation: Allow "pause streak" without breaking it

---

## Recommended Next Steps

### For Roadmap Planning
1. **Prioritize Phase 1 features first** (Visual Urgency, Voice Input, Confetti) → Immediate user value, zero backend work
2. **Build Gamification in Phase 2** (backend stats + frontend tracker) → Requires coordination but high engagement impact
3. **Defer Notifications to Phase 2.5** (after gamification) → More complex, lower urgency
4. **Add AI Prioritization in Phase 3** (depends on LLM stability) → High value but requires mature AgentService

### For Implementation
1. **Start with `urgencyUtils.ts`** → 2-hour task, unblocks visual urgency
2. **Add VoiceCapture component** → 3-hour task, ships independently
3. **Build Confetti animation** → 2-hour task, quick dopamine win
4. **Then move to backend:** Stats endpoint → Progress tracker → Notifications
5. **Finally AI features:** Extend AgentService → Build AISuggestion component

### For Testing
1. **Write unit tests for urgency calculations** (prevent regression on task aging logic)
2. **E2E test voice input** (ensure browser API works in CI - may need headless browser flags)
3. **Manual test notifications** (difficult to automate, verify on Chrome/Firefox/Safari)
4. **Load test gamification stats** (ensure query scales to 10k tasks per user)

---

## Summary Table

| Feature | Location | Dependencies | Build Order | Effort | Impact |
|---------|----------|--------------|-------------|--------|--------|
| Visual Urgency | Client | None | Phase 1.1 | 2h | High (immediate visual feedback) |
| Voice Input | Client | Browser API | Phase 1.2 | 3h | Medium (reduces typing friction) |
| Confetti | Client | Framer Motion | Phase 1.3 | 2h | High (dopamine reward) |
| Gamification Backend | Backend | Task model | Phase 2.1 | 4h | Medium (enables frontend stats) |
| Progress Tracker | Client | Phase 2.1 | Phase 2.2 | 3h | High (streak motivation) |
| Notifications | Hybrid | Browser API | Phase 2.3 | 4h | Medium (deadline awareness) |
| AI Prioritization Backend | Backend | LLM | Phase 3.1 | 5h | High (reduce decision fatigue) |
| AI Suggestion Frontend | Client | Phase 3.1 | Phase 3.2 | 4h | High (AI-driven focus) |

**Total estimated effort:** ~27 hours (3-4 days for 1 developer)

---

*Research completed: 2026-01-31*
*Next milestone: Use this to structure roadmap phases and assign work packages.*
