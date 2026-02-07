'use client'

import { useAppStore } from '@/lib/store'
import { useQuickCaptureShortcut } from '@/lib/hooks/useKeyboardShortcut'
import { FloatingActionButton } from './FloatingActionButton'
import { QuickCaptureModal } from './QuickCaptureModal'

export function GlobalQuickCapture() {
  const isOpen = useAppStore(state => state.isQuickCaptureOpen)
  const openQuickCapture = useAppStore(state => state.openQuickCapture)
  const closeQuickCapture = useAppStore(state => state.closeQuickCapture)
  const triggerUpdate = useAppStore(state => state.triggerUpdate)

  // Global keyboard shortcut (Cmd/Ctrl+N)
  useQuickCaptureShortcut(openQuickCapture)

  const handleTaskCreated = () => {
    triggerUpdate() // Refresh task lists
  }

  return (
    <>
      <FloatingActionButton onClick={openQuickCapture} />
      <QuickCaptureModal
        isOpen={isOpen}
        onClose={closeQuickCapture}
        onTaskCreated={handleTaskCreated}
      />
    </>
  )
}
