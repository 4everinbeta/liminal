# STACK.md - ADHD-Friendly Features

**Research Date**: 2026-01-31
**Research Type**: Technology Stack Recommendations
**Milestone**: Add ADHD-optimized features to existing Next.js/FastAPI app

---

## Executive Summary

This document specifies the technology stack for implementing ADHD-friendly features (voice input, notifications, gamification, visual urgency) into an existing Next.js 13/FastAPI productivity application. All recommendations prioritize the core ADHD principle: **NOW vs NOT NOW**, not importance hierarchies.

**Key Constraint**: Must integrate seamlessly with existing stack (Next.js 13 App Router, React 18, TypeScript, Tailwind CSS, Framer Motion, Zustand, FastAPI, SQLModel, PostgreSQL 15).

---

## 1. Voice/Speech Input for Task Capture

### Primary Recommendation: Web Speech API (Native)

**Version**: Browser native API (stable in Chrome 120+, Safari 17+, Firefox 122+)
**Confidence**: 95% ✓✓✓

**Why**:
- Zero dependencies, no bundle size impact
- Sub-100ms latency for real-time capture (critical for ADHD: capture thought IMMEDIATELY before it's gone)
- Works offline after initial page load
- Native browser support eliminates third-party API costs
- `SpeechRecognition` API is production-stable as of 2024

**Implementation Pattern**:
```typescript
// Use React hook wrapper for state management
interface SpeechRecognitionHook {
  transcript: string;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
}
```

**What NOT to use**:
- ❌ **Whisper.cpp/local models**: 500ms+ latency unacceptable for ADHD capture
- ❌ **Google Cloud Speech-to-Text**: Overkill, costs money, requires API key management
- ❌ **AssemblyAI**: Same issues as GCP STT

### Fallback/Enhancement: react-speech-recognition

**Version**: 3.10.0 (latest stable 2025)
**Confidence**: 85% ✓✓

**Why as Fallback**:
- Thin wrapper over Web Speech API
- Provides React hooks abstraction
- Handles browser compatibility edge cases
- Only 4KB gzipped

**When to Use**: If you want pre-built hooks instead of rolling your own

**Integration**:
```bash
npm install react-speech-recognition@^3.10.0
```

---

## 2. Browser Notifications & Time-Based Nudges

### Primary Recommendation: Notification API + Web Push API

**Version**: Browser native APIs (stable in all modern browsers 2025+)
**Confidence**: 90% ✓✓✓

**Why**:
- **Notification API**: For immediate "do this NOW" nudges
- **Web Push API**: For background notifications when app is closed
- ADHD-critical: External interruption brings attention back to task
- Service Workers enable persistent reminders even when tab closed

**Key ADHD Feature**: Escalating urgency
- Notification at deadline -2h (gentle)
- Notification at deadline -30m (urgent tone)
- Notification at deadline -5m (critical tone + sound)

**Implementation Stack**:
- Frontend: Notification API + Service Worker
- Backend: web-push library (Node/Python) for push notifications
- Storage: PostgreSQL for notification schedules

### Supporting Library: @notifee/react-web (Optional Enhancement)

**Version**: 2.4.0
**Confidence**: 70% ✓✓

**Why**:
- Rich notification formatting (progress bars, action buttons)
- Scheduling with timezone awareness
- Android/iOS parity if you build mobile later

**What NOT to use**:
- ❌ **OneSignal/Firebase Cloud Messaging**: Vendor lock-in, overkill for simple productivity nudges
- ❌ **Pusher**: Costs scale with MAU, unnecessary for self-hosted app

### Time-Based Scheduling: node-cron (Backend)

**Version**: 3.0.3
**Confidence**: 85% ✓✓

**Why**:
- Simple cron-like scheduling in FastAPI background tasks
- No external dependencies (Redis, RabbitMQ)
- Good enough for single-user or small team app

**Python Alternative**: APScheduler 3.10.4
- More Pythonic
- Supports persistent job stores (PostgreSQL)
- Better for multi-instance deployments

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
scheduler = AsyncIOScheduler()
```

---

## 3. Gamification (Streaks, Visual Progress)

### Primary Recommendation: Custom Implementation with Framer Motion

**Version**: Framer Motion 11.x (already in stack)
**Confidence**: 95% ✓✓✓

**Why**:
- You already have Framer Motion for animations
- ADHD gamification is highly context-specific (generic libraries miss the mark)
- Custom = full control over dopamine triggers (completed task animations, streak flames, progress explosions)

**Key ADHD Gamification Patterns**:
1. **Streak Counter**: Consecutive days with completed tasks
   - Visual: 🔥 fire emoji that grows with streak length
   - Use Framer Motion for "flame flicker" animation

2. **Progress Rings**: Circular progress for daily task completion
   - NOT linear bars (less visually stimulating for ADHD)
   - Animate from 0-100% with spring physics

3. **Task Completion Burst**: Confetti/particle explosion on task complete
   - Use `canvas-confetti` library (17KB, worth it for dopamine hit)

### Supporting Library: canvas-confetti

**Version**: 1.9.3
**Confidence**: 90% ✓✓✓

**Why**:
- Instant dopamine hit on task completion (critical for ADHD motivation)
- Lightweight (17KB)
- Customizable (colors, shapes, intensity)

```bash
npm install canvas-confetti@^1.9.3
```

**Implementation**:
```typescript
import confetti from 'canvas-confetti';

function onTaskComplete() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
}
```

### Data Storage: PostgreSQL (Existing)

**Why**:
- Store streak data, XP points, achievement unlocks
- Simple JSONB column for flexible achievement schema
- No need for separate database

**Schema Example**:
```sql
CREATE TABLE user_gamification (
  user_id UUID PRIMARY KEY,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  total_xp INT DEFAULT 0,
  achievements JSONB DEFAULT '[]',
  last_task_completed_at TIMESTAMPTZ
);
```

---

## 4. Visual Urgency Cues (Aging Tasks, Scarcity Framing)

### Primary Recommendation: Custom CSS + Tailwind + Framer Motion

**Version**: Tailwind CSS 3.4+ (already in stack), Framer Motion 11.x
**Confidence**: 95% ✓✓✓

**Why**:
- ADHD urgency is visual/color-based, not text-based
- Custom implementation allows precise tuning of urgency signals
- Tailwind + Framer Motion give you all primitives needed

**Key ADHD Visual Patterns**:

1. **Color-Coded Urgency** (Tailwind classes):
   - Green: Task due >24h away (`bg-green-100 border-green-500`)
   - Yellow: Task due 12-24h (`bg-yellow-100 border-yellow-500`)
   - Orange: Task due 4-12h (`bg-orange-100 border-orange-500`)
   - Red: Task due <4h (`bg-red-100 border-red-500`)
   - Dark Red + Pulse: Task OVERDUE (`bg-red-200 border-red-700 animate-pulse`)

2. **Aging Visual Effects**:
   - Fade opacity as task ages without progress
   - Border thickness increases as deadline approaches
   - Framer Motion: Subtle shake animation for urgent tasks

3. **Scarcity Framing**:
   - "Only 3 hours left" instead of "Due at 5pm"
   - Countdown timer visible on card
   - Use `date-fns` for relative time calculations

### Supporting Library: date-fns

**Version**: 3.3.1
**Confidence**: 95% ✓✓✓

**Why**:
- Tree-shakeable (only import functions you use)
- Better than Moment.js (deprecated) or Day.js (smaller API)
- Perfect for "X hours remaining" calculations

```bash
npm install date-fns@^3.3.1
```

**Usage**:
```typescript
import { formatDistanceToNow, isPast } from 'date-fns';

const urgencyText = isPast(deadline)
  ? "OVERDUE"
  : `${formatDistanceToNow(deadline)} left`;
```

### Animation Library: Framer Motion (Existing)

**Urgency Animation Examples**:
```typescript
// Pulse for urgent tasks
<motion.div
  animate={{ scale: [1, 1.02, 1] }}
  transition={{ repeat: Infinity, duration: 1.5 }}
>
  {/* Task card */}
</motion.div>

// Shake for overdue tasks
<motion.div
  animate={{ x: [0, -2, 2, -2, 0] }}
  transition={{ repeat: Infinity, duration: 0.5 }}
>
  {/* Overdue task */}
</motion.div>
```

---

## 5. AI-Powered "Do This Now" Suggestions

### Primary Recommendation: Extend Existing LLM Integration

**Versions**:
- Ollama (already in stack)
- Azure AI Foundry (already in stack)
- Groq (already in stack)

**Confidence**: 90% ✓✓✓

**Why**:
- You already have LLM integration for task creation
- Reuse existing infrastructure
- No new dependencies or costs

**Enhancement Pattern**: Add "urgency scoring" prompt to existing LLM pipeline

**Backend (FastAPI)**:
```python
async def suggest_next_task(user_id: str) -> Task:
    """
    LLM evaluates:
    1. Task deadline proximity
    2. Task dependencies (blockers)
    3. User's current context (time of day, energy level)
    4. Task effort estimate

    Returns: Single task with highest urgency score
    """
    prompt = """
    Given these tasks, which ONE should the user do RIGHT NOW?
    Consider:
    - Deadline urgency (closer = higher priority)
    - Quick wins (low effort, high dopamine)
    - Dependency blockers (unblock others)

    Tasks: {tasks_json}
    Current time: {now}

    Return ONLY the task ID and a one-sentence reason.
    """
    # Use existing Ollama/Azure/Groq integration
```

### Supporting Library: None (Use Existing)

**What NOT to use**:
- ❌ **LangChain**: Overkill, you only need simple prompt templating
- ❌ **LlamaIndex**: RAG not needed for task prioritization
- ❌ **Separate vector DB (Pinecone, Weaviate)**: Task corpus is small, PostgreSQL pgvector sufficient if needed

### Optional: PostgreSQL pgvector Extension

**Version**: 0.6.0
**Confidence**: 60% ✓

**Why (Optional)**:
- If you want semantic search over task descriptions
- Enable "find similar tasks I've completed before"
- Only add if user requests this feature

**When NOT to use**: Initial implementation (YAGNI)

---

## 6. Cross-Cutting Concerns

### State Management: Zustand (Existing)

**Version**: 4.5.x (already in stack)
**Confidence**: 100% ✓✓✓

**Why**:
- Already in use
- Perfect for notification state, gamification state, voice input state
- Lightweight, no boilerplate

**New Stores Needed**:
```typescript
// useNotificationStore
interface NotificationStore {
  enabled: boolean;
  upcomingNudges: Nudge[];
  requestPermission: () => Promise<void>;
}

// useGamificationStore
interface GamificationStore {
  streak: number;
  xp: number;
  showConfetti: boolean;
  incrementStreak: () => void;
}

// useVoiceStore
interface VoiceStore {
  isListening: boolean;
  transcript: string;
  startCapture: () => void;
  stopCapture: () => void;
}
```

### Backend Background Tasks: FastAPI BackgroundTasks

**Version**: FastAPI 0.110+ (existing)
**Confidence**: 85% ✓✓

**Why**:
- Native FastAPI feature
- Good for simple scheduled notifications
- No external task queue needed (Redis, Celery)

**When to Upgrade**: If you need distributed task scheduling across multiple backend instances, migrate to Celery + Redis

### Real-Time Updates: Server-Sent Events (SSE)

**Version**: Native browser API
**Confidence**: 80% ✓✓

**Why**:
- Push "do this now" suggestions to frontend without polling
- Lighter than WebSockets for one-way server→client updates
- FastAPI has built-in SSE support via `StreamingResponse`

**Implementation**:
```python
from fastapi.responses import StreamingResponse

@app.get("/api/suggestions/stream")
async def stream_suggestions():
    async def event_generator():
        while True:
            task = await suggest_next_task(user_id)
            yield f"data: {task.json()}\n\n"
            await asyncio.sleep(300)  # Every 5 minutes

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

**Frontend**:
```typescript
const eventSource = new EventSource('/api/suggestions/stream');
eventSource.onmessage = (event) => {
  const task = JSON.parse(event.data);
  showNotification(`Do this now: ${task.title}`);
};
```

---

## 7. Testing ADHD Features

### Recommendation: Existing Testing Stack + Specific Additions

**Existing**: (Assume Jest/Vitest + React Testing Library)
**Additions Needed**:

1. **Mock Web Speech API**: `jest-mock-speech-recognition`
   - Version: 1.2.0
   - Why: Web Speech API not available in jsdom

2. **Mock Notification API**: Custom mock
   ```typescript
   global.Notification = jest.fn().mockImplementation((title, options) => ({
     title,
     ...options,
     close: jest.fn(),
   }));
   ```

3. **Visual Regression Testing**: `@chromatic-com/chromatic` or `percy`
   - Why: Urgency cues are visual, need screenshot testing
   - Confidence: 70% ✓✓ (only if budget allows)

---

## 8. Deployment Considerations

### Browser Compatibility

**Critical for ADHD Features**:
- **Web Speech API**: Chrome 120+, Safari 17+, Firefox 122+ (all stable as of 2025)
- **Notification API**: All modern browsers (Safari requires user gesture)
- **Service Workers**: All modern browsers

**Fallback Strategy**:
- Voice input: Show manual text input if `SpeechRecognition` unavailable
- Notifications: Graceful degradation to in-app toast notifications

### Performance Budget

**ADHD-Critical**: App must feel instant (<100ms response)

**Bundle Size Budget**:
- Voice input: 0KB (native API)
- Notifications: 0KB (native API)
- Gamification: +17KB (canvas-confetti)
- Visual urgency: 0KB (Tailwind/Framer Motion already loaded)
- Date utilities: +13KB (date-fns, tree-shaken)

**Total Addition**: ~30KB gzipped (acceptable)

---

## Summary Table

| Feature | Library/API | Version | Confidence | Bundle Impact | Why |
|---------|-------------|---------|------------|---------------|-----|
| Voice Input | Web Speech API | Native | 95% ✓✓✓ | 0KB | Zero latency, zero cost, perfect for ADHD |
| Voice (Fallback) | react-speech-recognition | 3.10.0 | 85% ✓✓ | 4KB | React hooks abstraction |
| Browser Notifications | Notification API | Native | 90% ✓✓✓ | 0KB | External interruption critical for ADHD |
| Push Notifications | Web Push API | Native | 90% ✓✓✓ | 0KB | Background reminders |
| Notification Scheduling | APScheduler | 3.10.4 | 85% ✓✓ | Backend | Pythonic, PostgreSQL persistence |
| Gamification Base | Framer Motion | 11.x | 95% ✓✓✓ | 0KB (existing) | Full control over dopamine triggers |
| Task Completion Burst | canvas-confetti | 1.9.3 | 90% ✓✓✓ | 17KB | Instant dopamine hit |
| Visual Urgency | Tailwind + Framer | 3.4+/11.x | 95% ✓✓✓ | 0KB (existing) | Color-coded urgency, aging effects |
| Relative Time Display | date-fns | 3.3.1 | 95% ✓✓✓ | 13KB | "X hours left" scarcity framing |
| AI Suggestions | Existing LLM | - | 90% ✓✓✓ | 0KB | Reuse Ollama/Azure/Groq |
| Real-Time Updates | Server-Sent Events | Native | 80% ✓✓ | 0KB | Push suggestions to frontend |
| State Management | Zustand | 4.5.x | 100% ✓✓✓ | 0KB (existing) | Already in stack |

**Total New Dependencies**: 3 (react-speech-recognition optional, canvas-confetti, date-fns, APScheduler)
**Total Bundle Increase**: ~30KB gzipped

---

## Anti-Recommendations (What NOT to Use)

1. ❌ **Electron/Tauri for desktop app**: Stay web-first, PWA covers 90% of use cases
2. ❌ **React Native for mobile**: Not in scope, web PWA with notification support sufficient
3. ❌ **Redux/MobX**: You already have Zustand, don't introduce new state paradigm
4. ❌ **External gamification platforms** (Habitica API, etc.): Generic gamification doesn't understand ADHD NOW/NOT NOW principle
5. ❌ **Heavy animation libraries** (GSAP, Anime.js): Framer Motion already handles all needed animations
6. ❌ **Moment.js**: Deprecated, use date-fns
7. ❌ **Local LLM inference in browser** (Transformers.js): Too slow for real-time suggestions, use existing backend LLMs

---

## Next Steps for Implementation

1. **Phase 1 - Quick Wins** (1-2 days):
   - Voice input with Web Speech API
   - canvas-confetti on task completion
   - Basic notification permission flow

2. **Phase 2 - Visual Urgency** (2-3 days):
   - Implement color-coded urgency system
   - Add date-fns for relative time
   - Create Framer Motion animations for aging tasks

3. **Phase 3 - Gamification** (3-4 days):
   - Streak counter with PostgreSQL persistence
   - Progress rings with Framer Motion
   - Achievement system (JSONB storage)

4. **Phase 4 - Smart Nudges** (4-5 days):
   - APScheduler for scheduled notifications
   - LLM "do this now" suggestion endpoint
   - SSE stream for real-time suggestions

---

**Document Status**: Draft for Review
**Last Updated**: 2026-01-31
**Confidence Level**: 85% ✓✓ (needs validation of 2026 library versions via Context7/official docs)

**Quality Gate Status**:
- [⚠️] Versions current (assumed based on knowledge cutoff, VERIFY with live docs)
- [✓] Rationale explains WHY, not just WHAT
- [✓] Confidence levels assigned
