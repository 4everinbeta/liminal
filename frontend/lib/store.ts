import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ChatMessage = { role: 'assistant' | 'user'; content: string }

const DEFAULT_DURATION = 25 * 60

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    role: 'assistant',
    content:
      "I'm Liminal. Tell me a task name. To prioritize, include priority (1-100), value (1-100), and effort (1-100). Otherwise I'll park it in the Threshold and ask for the missing pieces.",
  },
]

interface AppState {
  isFocusMode: boolean
  toggleFocusMode: () => void

  // Focus Mode Task
  activeTaskId: string | null
  setActiveTaskId: (id: string | null) => void

  // Timer
  timerStatus: 'idle' | 'running' | 'paused'
  timeLeft: number
  timerDuration: number // in seconds
  setTimerStatus: (status: 'idle' | 'running' | 'paused') => void
  setTimeLeft: (time: number) => void
  resetTimer: () => void

  // Chat
  chatMessages: ChatMessage[]
  appendChatMessage: (msg: ChatMessage) => void
  setChatMessages: (msgs: ChatMessage[]) => void
  resetChatMessages: () => void

  // Quick Capture
  isQuickCaptureOpen: boolean
  openQuickCapture: () => void
  closeQuickCapture: () => void

  // Planning scroll position
  planningScrollPosition: number
  setPlanningScrollPosition: (pos: number) => void

  // Global Refresh Signal
  lastUpdate: number
  triggerUpdate: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isFocusMode: true, // Focus mode is now the default
      toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),
      // ... existing ...
      activeTaskId: null,
      setActiveTaskId: (id) => set({ activeTaskId: id }),

      timerStatus: 'idle',
      timeLeft: DEFAULT_DURATION,
      timerDuration: DEFAULT_DURATION,
      setTimerStatus: (status) => set({ timerStatus: status }),
      setTimeLeft: (time) => set({ timeLeft: time }),
      resetTimer: () =>
        set((state) => ({
          timerStatus: 'idle',
          timeLeft: state.timerDuration,
        })),

      chatMessages: INITIAL_CHAT_MESSAGES,
      appendChatMessage: (msg) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, msg],
        })),
      setChatMessages: (msgs) =>
        set({
          chatMessages: msgs.length ? msgs : INITIAL_CHAT_MESSAGES,
        }),
      resetChatMessages: () => set({ chatMessages: INITIAL_CHAT_MESSAGES }),

      isQuickCaptureOpen: false,
      openQuickCapture: () => set({ isQuickCaptureOpen: true }),
      closeQuickCapture: () => set({ isQuickCaptureOpen: false }),

      planningScrollPosition: 0,
      setPlanningScrollPosition: (pos) => set({ planningScrollPosition: pos }),

      lastUpdate: 0,
      triggerUpdate: () => set({ lastUpdate: Date.now() }),
    }),
    {
      name: 'liminal-app',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') return undefined as unknown as Storage
        return window.sessionStorage
      }),
      // Persist focus mode preference, active task, scroll position, and chat messages
      partialize: (state) => ({
        chatMessages: state.chatMessages,
        isFocusMode: state.isFocusMode,
        activeTaskId: state.activeTaskId,
        planningScrollPosition: state.planningScrollPosition,
      }),
    }
  )
)
