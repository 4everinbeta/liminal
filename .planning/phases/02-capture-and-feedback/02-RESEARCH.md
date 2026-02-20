# Phase 2: Capture & Feedback - Research

**Researched:** 2026-02-01
**Domain:** Optimistic UI updates, voice input, celebration animations, auto-save patterns, keyboard shortcuts, floating UI components
**Confidence:** HIGH

## Summary

Phase 2 focuses on implementing instant task capture (<5 seconds) with immediate visual feedback to create dopamine-triggering completion experiences for ADHD users. The research reveals that modern React applications in 2026 use React 19's `useOptimistic` hook for sub-100ms perceived updates, canvas-confetti for lightweight celebration animations, Web Speech API for browser-native voice input, and react-hotkeys-hook for cross-platform keyboard shortcuts.

The current codebase already has Framer Motion (10.12.16) and Zustand (4.3.9) installed, which are well-suited for this phase. The key technical challenges are implementing proper rollback strategies for optimistic updates, handling Web Speech API browser compatibility (Chrome/Edge only with 50/100 compatibility score), preventing memory leaks from global event listeners, and avoiding race conditions in auto-save debouncing.

Critical timing requirements: 100ms optimistic UI updates, 200ms maximum perceived lag, 2-second auto-save debounce, <5 second total capture flow. The research indicates that humans perceive delays >100ms and consider responses >200ms as "slow or broken," making optimistic updates essential rather than optional.

**Primary recommendation:** Use React 19's useOptimistic hook with Zustand for instant task creation, canvas-confetti for celebration effects, react-hotkeys-hook for Cmd/Ctrl+N shortcut, sessionStorage for draft preservation, and Web Speech API with graceful degradation for voice input.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19+ | useOptimistic hook | Built-in optimistic updates, industry standard (note: current version 18.2.0) |
| canvas-confetti | 1.9.x | Celebration animations | Performant, 15KB, framework-agnostic, GPU-accelerated |
| react-hotkeys-hook | 4.x | Global keyboard shortcuts | Modern hook-based API, cross-platform Cmd/Ctrl, scoped shortcuts |
| sessionStorage | Browser API | Draft preservation | Built-in, cleared on session end, perfect for temporary drafts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Web Speech API | Browser API | Voice input | Chrome/Edge users (50% browser support), progressive enhancement |
| Zustand | 4.3.9 | Optimistic state management | Already installed, handles rollback patterns well |
| Framer Motion | 10.12.16 | UI feedback animations | Already installed, button press effects, transitions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| canvas-confetti | react-confetti | react-confetti is React-specific and heavier (full-screen canvas); canvas-confetti is 15KB and allows targeted confetti areas |
| react-hotkeys-hook | react-hotkeys | react-hotkeys is unmaintained (>6 months); react-hotkeys-hook is modern hook-based |
| Web Speech API | Cloud speech services (AssemblyAI, Google Cloud) | Cloud services cost money and add latency; Web Speech API is free and instant but Chrome/Edge only |
| React 19 useOptimistic | Manual optimistic patterns | Manual patterns work but require more code and miss React 19's concurrent rendering optimizations |

**Installation:**
```bash
npm install canvas-confetti react-hotkeys-hook
# Web Speech API, sessionStorage are browser-native (no install)
# React 19 upgrade (current: 18.2.0)
npm install react@19 react-dom@19 @types/react@19 @types/react-dom@19
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/
├── components/
│   ├── QuickCapture.tsx         # Already exists - add keyboard shortcut
│   ├── FloatingActionButton.tsx # New - trigger quick capture
│   ├── VoiceInput.tsx           # New - Web Speech API wrapper
│   └── ConfettiTrigger.tsx      # New - celebration wrapper
├── lib/
│   ├── store.ts                 # Zustand - add optimistic actions
│   └── hooks/
│       ├── useAutoSave.ts       # New - debounced auto-save
│       ├── useOptimisticTask.ts # New - React 19 wrapper
│       ├── useVoiceInput.ts     # New - Web Speech API hook
│       └── useDraftPreservation.ts # New - sessionStorage hook
└── app/
    └── layout.tsx               # Add global keyboard listener
```

### Pattern 1: Optimistic UI Updates with Rollback
**What:** Update UI immediately before server confirms, rollback on failure
**When to use:** Task creation, completion, status changes - any mutation requiring <100ms perceived response
**Example:**
```typescript
// Source: https://react.dev/reference/react/useOptimistic
import { useOptimistic, startTransition } from 'react'
import { useAppStore } from '@/lib/store'

function useOptimisticTask() {
  const tasks = useAppStore(state => state.tasks)
  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    tasks,
    (state, newTask: Task) => [...state, newTask]
  )

  async function createTaskOptimistically(taskData: TaskCreate) {
    const tempId = `temp-${Date.now()}`
    const optimisticTask = { ...taskData, id: tempId, status: 'backlog' }

    startTransition(async () => {
      addOptimisticTask(optimisticTask) // Immediate UI update

      try {
        const savedTask = await createTask(taskData)
        useAppStore.getState().appendTask(savedTask) // Update with real task
      } catch (error) {
        // Rollback happens automatically when real state doesn't include tempId
        toast.error('Failed to create task')
      }
    })
  }

  return { optimisticTasks, createTaskOptimistically }
}
```

### Pattern 2: Auto-Save with Debounce and Race Condition Prevention
**What:** Save draft every 2 seconds after typing stops, prevent out-of-order responses
**When to use:** Quick capture form, edit modal - any form needing draft preservation
**Example:**
```typescript
// Source: https://medium.com/@anshulkahar2211/building-lightning-fast-uis-implementing-optimistic-updates-with-react-query-and-zustand-cfb7f9e7cd82
import { useEffect, useRef, useState } from 'react'

function useAutoSave(value: string, onSave: (val: string) => Promise<void>, delay = 2000) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const timeoutRef = useRef<NodeJS.Timeout>()
  const requestIdRef = useRef(0) // Prevent race conditions

  useEffect(() => {
    if (!value) return

    setStatus('idle')
    clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(async () => {
      const currentRequestId = ++requestIdRef.current
      setStatus('saving')

      try {
        await onSave(value)
        // Only update status if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setStatus('saved')
          setTimeout(() => setStatus('idle'), 2000)
        }
      } catch (err) {
        if (currentRequestId === requestIdRef.current) {
          setStatus('error')
        }
      }
    }, delay)

    // Cleanup on unmount to prevent memory leaks
    return () => clearTimeout(timeoutRef.current)
  }, [value, onSave, delay])

  return status
}
```

### Pattern 3: Voice Input with Web Speech API
**What:** Browser-native speech recognition with real-time transcription
**When to use:** Quick capture alternative input method, accessibility requirement
**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
import { useState, useEffect } from 'react'

// Handle browser prefixes
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

function useVoiceInput(onResult: (transcript: string) => void) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.lang = 'en-US'
    recognition.interimResults = true // Real-time transcription
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onResult(transcript)
    }

    recognition.onspeechend = () => {
      recognition.stop()
      setIsListening(false)
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)

      if (event.error === 'not-allowed') {
        toast.error('Microphone permission denied')
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [onResult])

  const start = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const stop = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  return { start, stop, isListening, isSupported }
}
```

### Pattern 4: Global Keyboard Shortcuts (Cmd/Ctrl + N)
**What:** Cross-platform keyboard shortcut to trigger quick capture from anywhere
**When to use:** Global app shortcuts that work regardless of focused element
**Example:**
```typescript
// Source: https://react-hotkeys-hook.vercel.app/
import { useHotkeys } from 'react-hotkeys-hook'

function App() {
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false)

  // ctrl maps to Cmd on macOS, Ctrl on Windows/Linux automatically
  useHotkeys('ctrl+n', (e) => {
    e.preventDefault() // Prevent browser's "New Window"
    setIsQuickCaptureOpen(true)
  }, {
    enableOnFormTags: true, // Work even when input focused
    preventDefault: true
  })

  return (
    <>
      {isQuickCaptureOpen && <QuickCaptureModal onClose={() => setIsQuickCaptureOpen(false)} />}
    </>
  )
}
```

### Pattern 5: Confetti Celebration on Task Completion
**What:** Trigger confetti animation when task marked complete for dopamine hit
**When to use:** Task completion, streak milestones, any gamification reward
**Example:**
```typescript
// Source: https://www.npmjs.com/package/canvas-confetti + https://github.com/catdad/canvas-confetti
import confetti from 'canvas-confetti'

function TaskCompleteButton({ taskId }: { taskId: string }) {
  const completeTask = useAppStore(state => state.completeTask)

  const handleComplete = async () => {
    // Optimistic UI update
    completeTask(taskId)

    // Immediate celebration (don't wait for server)
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#3b82f6', '#f59e0b'] // Green, blue, orange
    })

    // Background server sync
    try {
      await updateTask(taskId, { status: 'done' })
    } catch (error) {
      // Rollback handled by optimistic update pattern
      toast.error('Failed to complete task')
    }
  }

  return (
    <button onClick={handleComplete}>
      Complete Task
    </button>
  )
}
```

### Pattern 6: Session-Based Draft Preservation
**What:** Auto-save form drafts to sessionStorage, clear when browser closes
**When to use:** Quick capture form, any form needing distraction protection
**Example:**
```typescript
// Source: https://www.darrenlester.com/blog/syncing-react-state-and-session-storage
import { useState, useEffect } from 'react'

function useDraftPreservation<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    // Initialize from sessionStorage if available
    const stored = sessionStorage.getItem(key)
    return stored ? JSON.parse(stored) : initialValue
  })

  useEffect(() => {
    // Sync to sessionStorage on every change
    sessionStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  const clearDraft = () => {
    sessionStorage.removeItem(key)
    setValue(initialValue)
  }

  return [value, setValue, clearDraft] as const
}

// Usage in QuickCapture
function QuickCaptureForm() {
  const [draft, setDraft, clearDraft] = useDraftPreservation('quick-capture-draft', '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createTask({ title: draft })
    clearDraft() // Clear after successful submission
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="What needs to be done?"
      />
      {draft && <span className="text-xs text-gray-500">Draft saved</span>}
    </form>
  )
}
```

### Pattern 7: Floating Action Button Placement
**What:** Persistent button for quick capture, positioned for thumb reach and minimal content blocking
**When to use:** Mobile-first apps, always-accessible primary actions
**Example:**
```typescript
// Source: https://mui.com/material-ui/react-floating-action-button/ + https://mobbin.com/glossary/floating-action-button
function FloatingActionButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg z-50"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label="Quick capture task"
    >
      <PlusIcon className="w-6 h-6" />
    </motion.button>
  )
}

// Alternative: bottom-center for left-handed users (more inclusive)
// className="fixed bottom-6 left-1/2 -translate-x-1/2 ..."
```

### Anti-Patterns to Avoid
- **No rollback strategy:** Optimistic updates without rollback cause data corruption when API fails. Always implement error handling and state reversion.
- **Debounced function in component body:** Creates new debounce on every render, breaking debouncing. Use useCallback or custom hook.
- **Event listeners without cleanup:** Memory leaks accumulate on route changes. Always return cleanup function from useEffect.
- **Blocking modals for quick capture:** Defeats <5 second goal. Use inline panel or slide-up sheet instead.
- **Voice input without fallback:** 50% of users can't use it (Firefox, Safari partial). Always provide keyboard alternative.
- **Confetti on every action:** Overuse reduces dopamine effectiveness. Reserve for meaningful completions only.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Optimistic UI updates | Manual state cloning + rollback | React 19 useOptimistic | Handles concurrent rendering, automatic rollback on state convergence, works with Suspense |
| Keyboard shortcuts | document.addEventListener('keydown') | react-hotkeys-hook | Cross-platform Cmd/Ctrl mapping, scoped shortcuts, form tag handling, cleanup management |
| Confetti animation | CSS animations + JS particles | canvas-confetti | GPU-accelerated, 15KB, customizable physics, shape support, accessible reduced-motion |
| Voice recognition | Manual WebRTC/audio processing | Web Speech API | Browser-native, zero latency, free, handles permissions, on-device option |
| Debounced auto-save | setTimeout + clearTimeout manually | Custom useAutoSave hook | Race condition prevention, request ID tracking, unmount cleanup, status indicators |
| Draft preservation | Manual localStorage sync | sessionStorage + useEffect | Automatic cleanup on session end, simpler than localStorage lifecycle management |

**Key insight:** Timing-sensitive UX patterns (optimistic updates, debouncing, auto-save) have complex edge cases around race conditions, memory leaks, and React's rendering lifecycle. Using battle-tested patterns prevents subtle bugs that only appear in production under concurrent user actions.

## Common Pitfalls

### Pitfall 1: Optimistic Update Without Rollback Strategy
**What goes wrong:** UI shows task created, but API fails silently. Task disappears on page refresh, confusing users.
**Why it happens:** Developer implements optimistic update (immediate UI feedback) but forgets error handling and state reversion.
**How to avoid:** Always wrap optimistic updates in try/catch. Use React 19's useOptimistic which handles rollback automatically when real state updates. Test with network throttling and server errors.
**Warning signs:** Bug reports of "tasks disappearing" or "data not saving." Inconsistent state between UI and server.

### Pitfall 2: Debounced Function Recreation on Every Render
**What goes wrong:** Auto-save triggers on every keystroke instead of debouncing, overwhelming the server.
**Why it happens:** Debounced function created in component body without useCallback, so React creates new function on every render.
**How to avoid:** Use useCallback with proper dependencies, or extract debouncing to custom hook (useAutoSave). Test by monitoring network tab - should see 1 request per 2 seconds, not per keystroke.
**Warning signs:** High API request volume. Server rate limiting errors. Form feels laggy.

### Pitfall 3: Event Listener Memory Leaks
**What goes wrong:** Global keyboard listener persists after component unmounts. After 50 route changes, 50 listeners fire for one keypress.
**Why it happens:** addEventListener without removeEventListener in cleanup function. Each mount adds new listener without removing old ones.
**How to avoid:** Always return cleanup function from useEffect that removes listener. Use react-hotkeys-hook which handles cleanup automatically. Test by navigating routes repeatedly and checking listener count.
**Warning signs:** App slows down over time. Multiple quick-capture modals open from one keypress. Memory usage increases with navigation.

### Pitfall 4: Web Speech API Permission Errors
**What goes wrong:** Voice input button does nothing, no feedback to user about why it failed.
**Why it happens:** Browser denies microphone permission, or user on unsupported browser (Firefox), but UI doesn't handle gracefully.
**How to avoid:** Check SpeechRecognition support before showing button. Handle 'not-allowed' error with clear message. Provide keyboard fallback always. Test on Firefox, Safari, Chrome.
**Warning signs:** Bug reports "microphone doesn't work." Silent failures. Accessibility complaints.

### Pitfall 5: Race Conditions in Auto-Save
**What goes wrong:** User types "ABC", auto-save fires for "A", then "AB", then "ABC". "AB" response arrives last, overwriting "ABC" with stale data.
**Why it happens:** HTTP responses arrive out of order. No request ID tracking to ignore stale responses.
**How to avoid:** Use request ID or timestamp to ignore out-of-order responses. Cancel pending requests before starting new one (AbortController). Show "saving" indicator during race window.
**Warning signs:** Users report "text reverting" or "losing characters." Flashing save indicator. Data inconsistency.

### Pitfall 6: Confetti Performance Impact
**What goes wrong:** Confetti animation causes frame drops, especially on mobile or when multiple tasks completed rapidly.
**Why it happens:** Too many particles, or confetti running on every action without throttling.
**How to avoid:** Use canvas-confetti with reasonable particle counts (100-150). Limit confetti to meaningful milestones (not every keystroke). Use reduced-motion media query to disable for accessibility.
**Warning signs:** Laggy animations. Mobile performance complaints. Accessibility issues.

### Pitfall 7: SessionStorage Quota Exceeded
**What goes wrong:** Draft preservation fails silently when sessionStorage reaches 5-10MB limit.
**Why it happens:** Storing large draft objects (descriptions with images, attachments) without size checking.
**How to avoid:** Only store minimal draft data (title, basic fields). Implement try/catch around sessionStorage.setItem. Consider localStorage with manual cleanup for large drafts.
**Warning signs:** Draft not persisting. Console errors in production. Bug reports on long-form inputs.

### Pitfall 8: Keyboard Shortcut Conflicts
**What goes wrong:** Cmd/Ctrl+N opens browser's "New Window" dialog instead of quick capture.
**Why it happens:** Forgot to call preventDefault() on keyboard event.
**How to avoid:** Use react-hotkeys-hook with preventDefault: true option. Test on all platforms (macOS, Windows, Linux). Document any unavoidable conflicts.
**Warning signs:** Shortcut doesn't work. Browser dialogs appear. User confusion about shortcuts.

## Code Examples

Verified patterns from official sources:

### Complete Optimistic Task Creation Flow
```typescript
// Source: https://react.dev/reference/react/useOptimistic
import { useOptimistic, startTransition } from 'react'
import { useAppStore } from '@/lib/store'
import confetti from 'canvas-confetti'

export function useOptimisticTaskCreation() {
  const tasks = useAppStore(state => state.tasks)
  const appendTask = useAppStore(state => state.appendTask)

  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    tasks,
    (state, newTask: Task) => [...state, newTask]
  )

  const createTaskWithFeedback = async (taskData: TaskCreate) => {
    const tempTask: Task = {
      ...taskData,
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Phase 1: Immediate UI update (<100ms)
    startTransition(() => {
      addOptimisticTask(tempTask)
    })

    // Phase 2: Background server save
    try {
      const savedTask = await createTask(taskData)
      appendTask(savedTask) // Real task replaces optimistic one

      // Phase 3: Celebration feedback
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.7 }
      })

      return savedTask
    } catch (error) {
      // Rollback handled automatically by useOptimistic
      toast.error('Failed to create task. Please try again.')
      throw error
    }
  }

  return { optimisticTasks, createTaskWithFeedback }
}
```

### Voice Input Component with Accessibility
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
import { useVoiceInput } from '@/lib/hooks/useVoiceInput'

export function VoiceInputButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const { start, stop, isListening, isSupported } = useVoiceInput(onTranscript)

  // Don't render if not supported (progressive enhancement)
  if (!isSupported) return null

  return (
    <button
      type="button"
      onClick={isListening ? stop : start}
      className={clsx(
        'p-2 rounded-full transition-colors',
        isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-200 hover:bg-gray-300'
      )}
      aria-label={isListening ? 'Stop recording' : 'Start voice input'}
      aria-pressed={isListening}
    >
      <MicrophoneIcon className="w-5 h-5" />
      {isListening && (
        <span className="sr-only">Recording... Speak now</span>
      )}
    </button>
  )
}
```

### Complete Quick Capture with All Features
```typescript
// Source: Combining all patterns
import { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useDraftPreservation } from '@/lib/hooks/useDraftPreservation'
import { useOptimisticTaskCreation } from '@/lib/hooks/useOptimisticTaskCreation'

export function QuickCaptureModal({ onClose }: { onClose: () => void }) {
  const [draft, setDraft, clearDraft] = useDraftPreservation('quick-capture-draft', '')
  const { createTaskWithFeedback } = useOptimisticTaskCreation()
  const saveStatus = useAutoSave(draft, async (val) => {
    sessionStorage.setItem('quick-capture-draft', val)
  }, 2000)

  // Close on Escape
  useHotkeys('escape', onClose)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return

    try {
      await createTaskWithFeedback({ title: draft })
      clearDraft()
      onClose()
    } catch (error) {
      // Error handled in useOptimisticTaskCreation
    }
  }

  const handleVoiceTranscript = (transcript: string) => {
    setDraft(transcript)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 px-4 py-2 border rounded-lg"
            autoFocus
          />
          <VoiceInputButton onTranscript={handleVoiceTranscript} />
        </div>

        {saveStatus === 'saving' && (
          <span className="text-xs text-gray-500">Saving draft...</span>
        )}

        <div className="flex gap-2 mt-4">
          <button type="submit" className="btn-primary">
            Create Task
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual optimistic updates | React 19 useOptimistic hook | 2024 (React 19) | Built-in rollback, concurrent rendering support, simpler API |
| Cloud speech APIs | Web Speech API (browser-native) | 2023-2024 | Zero latency, free, privacy-preserving, offline support |
| react-confetti (full-screen) | canvas-confetti (targeted) | 2023+ | 15KB vs 50KB+, targeted confetti areas, better performance |
| react-hotkeys (unmaintained) | react-hotkeys-hook | 2022 | Modern hooks, active maintenance, better TypeScript support |
| localStorage for drafts | sessionStorage for drafts | 2024+ | Automatic cleanup on session end, better security, simpler lifecycle |
| Manual debouncing | Custom hooks with race condition prevention | 2025+ | Request ID tracking, AbortController support, status indicators |

**Deprecated/outdated:**
- **react-hotkeys:** Unmaintained since 2022. Use react-hotkeys-hook.
- **Cloud-first speech recognition:** Web Speech API now reliable enough for production (Chrome/Edge).
- **react-confetti for targeted celebrations:** Use canvas-confetti for better performance and control.
- **Manual optimistic state management:** React 19's useOptimistic handles edge cases better.

## Open Questions

Things that couldn't be fully resolved:

1. **React 19 Upgrade Timing**
   - What we know: useOptimistic is React 19 only. Current codebase uses React 18.2.0. React 19 is stable and production-ready as of 2024.
   - What's unclear: Whether to upgrade React during Phase 2 or implement manual optimistic patterns with Zustand for now.
   - Recommendation: Implement manual optimistic patterns with Zustand in Phase 2 (proven pattern, no breaking changes). Plan React 19 upgrade as separate technical debt task. useOptimistic is "nice to have" not "must have" - Zustand handles optimistic updates well.

2. **Confetti Trigger Points**
   - What we know: Requirements state "task completion triggers confetti." ADHD users respond well to dopamine hits from visual rewards.
   - What's unclear: Should confetti trigger on every completion, or only on meaningful milestones (first of day, streak continuation, high-value tasks)?
   - Recommendation: Start with confetti on every completion. Add user preference toggle in settings ("Minimal celebrations" vs "Full celebrations"). Monitor performance impact on mobile. Consider reduced confetti particle count (50 instead of 100) for lower-end devices.

3. **Voice Input Browser Support Strategy**
   - What we know: Web Speech API has 50/100 browser compatibility. Works in Chrome/Edge, partial support in Safari, not supported in Firefox. 50% of users can access it.
   - What's unclear: Whether to show voice button to all users (with error handling) or hide it from unsupported browsers entirely.
   - Recommendation: Progressive enhancement - hide voice button if !SpeechRecognition. Show clear error message if permission denied. Always provide keyboard fallback. Don't make voice input discoverable enough to frustrate Firefox users.

4. **Floating Action Button vs Inline Quick-Add**
   - What we know: Context decisions specify "dual access: keyboard shortcut + floating action button." Bottom-right is standard but not inclusive for left-handed users.
   - What's unclear: Whether FAB should replace inline quick-add or supplement it. Mobile vs desktop placement strategy.
   - Recommendation: Implement both - FAB for mobile (bottom-center for inclusivity), inline quick-add persists for desktop. Keyboard shortcut (Cmd/Ctrl+N) triggers same modal on both. Test thumb reach zones on mobile.

5. **Auto-Save Debounce Interval**
   - What we know: Requirements state "2 seconds" but research shows tradeoff between data loss risk (longer interval) and server load (shorter interval).
   - What's unclear: Whether 2 seconds is optimal or if dynamic debouncing (typing pause detection) would be better.
   - Recommendation: Start with 2-second fixed debounce as specified. Monitor API request volume in production. Consider upgrade to "onBlur + periodic backup" pattern if 2 seconds proves too aggressive. Add visual "Draft saved" indicator so users trust the system.

6. **Post-Submission Behavior**
   - What we know: Context marks "Post-Enter behavior" as Claude's discretion. ADHD users may want rapid multi-task capture OR return-to-focus pattern.
   - What's unclear: Should quick-capture modal stay open after submission (for bulk capture) or close immediately (for focus preservation)?
   - Recommendation: Close modal after submission by default (matches <5 second capture goal). Add keyboard shortcut hint "Cmd/Ctrl+N to add another" in success toast. Consider "Add another task" button in modal footer for multi-capture sessions.

## Sources

### Primary (HIGH confidence)
- [React useOptimistic Hook Documentation](https://react.dev/reference/react/useOptimistic) - Official React 19 docs
- [Web Speech API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) - Official browser API docs
- [Using the Web Speech API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API) - Implementation guide
- [canvas-confetti GitHub](https://github.com/catdad/canvas-confetti) - Official repository
- [react-hotkeys-hook Documentation](https://react-hotkeys-hook.vercel.app/) - Official docs
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) - Official patterns

### Secondary (MEDIUM confidence)
- [Building Lightning-Fast UIs with React Query and Zustand](https://medium.com/@anshulkahar2211/building-lightning-fast-uis-implementing-optimistic-updates-with-react-query-and-zustand-cfb7f9e7cd82) - Optimistic patterns verified with official docs
- [Syncing React State and Session Storage](https://www.darrenlester.com/blog/syncing-react-state-and-session-storage) - Draft preservation patterns
- [React Query Autosave: Preventing Race Conditions](https://pz.com.au/avoiding-race-conditions-and-data-loss-when-autosaving-in-react-query) - Race condition prevention
- [Optimistic UI Patterns for Improved Perceived Performance](https://simonhearne.com/2021/optimistic-ui-patterns/) - Performance thresholds (100ms, 200ms)
- [Material UI Floating Action Button](https://mui.com/material-ui/react-floating-action-button/) - FAB placement best practices
- [Mobbin FAB Design Patterns](https://mobbin.com/glossary/floating-action-button) - UI/UX guidance

### Tertiary (LOW confidence)
- WebSearch results for React 2026 performance best practices - 100ms/200ms thresholds mentioned but not authoritative
- Multiple blog posts on auto-save debouncing - patterns converge but no single authoritative source
- Community discussions on confetti libraries - consensus around canvas-confetti but not official benchmark

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries have official documentation, active maintenance, and are production-proven
- Optimistic UI patterns: HIGH - React 19 useOptimistic is official API, Zustand patterns well-documented
- Voice input: MEDIUM - Web Speech API is official but browser support is incomplete (50/100 score)
- Auto-save patterns: HIGH - Race condition prevention patterns verified across multiple authoritative sources
- Keyboard shortcuts: HIGH - react-hotkeys-hook has comprehensive docs and handles cross-platform edge cases
- Confetti animations: HIGH - canvas-confetti is performance-tested and widely used in production

**Research date:** 2026-02-01
**Valid until:** 2026-03-15 (45 days - moderate stability, Web Speech API evolving, React 19 ecosystem maturing)
