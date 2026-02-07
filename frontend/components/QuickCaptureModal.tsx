'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, Loader2 } from 'lucide-react'
import { useDraftPreservation } from '@/lib/hooks/useDraftPreservation'
import { useVoiceInput } from '@/lib/hooks/useVoiceInput'
import { useAutoSave } from '@/lib/hooks/useAutoSave'
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut'
import { triggerQuickCapture } from '@/lib/confetti'
import { createTask } from '@/lib/api'
import { calculateSmartDefaults } from '@/lib/smartDefaults'
import { useAppStore } from '@/lib/store'

interface QuickCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskCreated?: () => void
}

export function QuickCaptureModal({ isOpen, onClose, onTaskCreated }: QuickCaptureModalProps) {
  const [draft, setDraft, clearDraft] = useDraftPreservation('quick-capture-draft', '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const triggerUpdate = useAppStore(state => state.triggerUpdate)

  // Voice input
  const handleVoiceResult = useCallback((transcript: string) => {
    setDraft(transcript)
  }, [setDraft])
  const { start: startVoice, stop: stopVoice, isListening, isSupported: voiceSupported } = useVoiceInput(handleVoiceResult)

  // Auto-save to sessionStorage (draft already synced by useDraftPreservation, this is just for status indicator)
  const autoSaveStatus = useAutoSave(draft, async (val) => {
    // Draft already synced by useDraftPreservation hook, no-op for status display
  }, 2000)

  // Close on Escape
  useKeyboardShortcut({
    key: 'Escape',
    modifiers: [],
    callback: onClose,
    preventDefault: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const defaults = calculateSmartDefaults({ title: draft })
      await createTask({
        title: draft.trim(),
        status: 'backlog',
        priority: 'medium',
        ...defaults
      })
      triggerQuickCapture()
      clearDraft()
      triggerUpdate()
      onTaskCreated?.()
      onClose()
    } catch (error) {
      console.error('Failed to create task:', error)
      // Keep draft on error so user doesn't lose work
    } finally {
      setIsSubmitting(false)
    }
  }

  // Focus input on open
  const inputRef = useCallback((node: HTMLInputElement | null) => {
    if (node && isOpen) {
      setTimeout(() => node.focus(), 50)
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed left-1/2 top-1/3 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
            data-quick-capture
          >
            <div className="rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Quick Capture</h2>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="What needs to be done?"
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    autoComplete="off"
                  />

                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={isListening ? stopVoice : startVoice}
                      className={`rounded-xl px-4 transition-colors ${
                        isListening
                          ? 'animate-pulse bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      aria-label={isListening ? 'Stop recording' : 'Start voice input'}
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Press Enter to save
                    {draft && ' · Draft saved'}
                  </span>

                  <button
                    type="submit"
                    disabled={!draft.trim() || isSubmitting}
                    className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Create Task'
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-4 text-center text-xs text-gray-400">
                <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">⌘</kbd>
                <span className="mx-1">+</span>
                <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">N</kbd>
                <span className="ml-2">to open anytime</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
