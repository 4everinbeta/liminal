import { useEffect, useCallback } from 'react'

type Modifier = 'ctrl' | 'meta' | 'alt' | 'shift'

interface ShortcutConfig {
  key: string
  modifiers?: Modifier[]
  callback: () => void
  preventDefault?: boolean
}

export function useKeyboardShortcut({
  key,
  modifiers = [],
  callback,
  preventDefault = true
}: ShortcutConfig): void {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check if the key matches (case-insensitive)
    if (event.key.toLowerCase() !== key.toLowerCase()) return

    // Check modifiers
    const modifierChecks = {
      ctrl: event.ctrlKey || event.metaKey, // Treat Cmd same as Ctrl for cross-platform
      meta: event.metaKey,
      alt: event.altKey,
      shift: event.shiftKey
    }

    // For 'ctrl' modifier, accept either Ctrl or Cmd (cross-platform)
    const allModifiersMatch = modifiers.every(mod => {
      if (mod === 'ctrl') return event.ctrlKey || event.metaKey
      return modifierChecks[mod]
    })

    if (!allModifiersMatch) return

    // Don't trigger if user is typing in an input/textarea (unless it's our quick capture)
    const target = event.target as HTMLElement
    const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName) &&
                     !target.closest('[data-quick-capture]')

    if (isTyping) return

    if (preventDefault) {
      event.preventDefault()
      event.stopPropagation()
    }

    callback()
  }, [key, modifiers, callback, preventDefault])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Convenience export for the quick capture shortcut
export function useQuickCaptureShortcut(onTrigger: () => void): void {
  useKeyboardShortcut({
    key: 'n',
    modifiers: ['ctrl'],
    callback: onTrigger,
    preventDefault: true
  })
}
