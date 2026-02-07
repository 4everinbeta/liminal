import { useEffect, useRef, useState } from 'react'

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Debounced auto-save hook with race condition prevention.
 *
 * Features:
 * - Debounces save calls to prevent server overload (default 2000ms)
 * - Tracks request IDs to ignore out-of-order responses
 * - Returns status for UI feedback: idle, saving, saved, error
 * - Cleans up timeout on unmount to prevent memory leaks
 * - Resets to idle after showing 'saved' for 2 seconds
 *
 * Usage:
 * ```typescript
 * const saveStatus = useAutoSave(formValue, async (val) => {
 *   await api.saveDraft(val)
 * }, 2000)
 * ```
 *
 * Note: Wrap onSave in useCallback at call site to prevent infinite loops.
 *
 * @param value - Value to auto-save (triggers debounce when changed)
 * @param onSave - Async function to save the value
 * @param delay - Debounce delay in milliseconds (default 2000)
 * @returns Current save status
 */
export function useAutoSave(
  value: string,
  onSave: (val: string) => Promise<void>,
  delay = 2000
): AutoSaveStatus {
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const timeoutRef = useRef<NodeJS.Timeout>()
  const requestIdRef = useRef(0) // Prevent race conditions

  useEffect(() => {
    // Don't auto-save empty values
    if (!value) return

    // Reset status and clear previous timeout
    setStatus('idle')
    clearTimeout(timeoutRef.current)

    // Debounce the save operation
    timeoutRef.current = setTimeout(async () => {
      const currentRequestId = ++requestIdRef.current
      setStatus('saving')

      try {
        await onSave(value)

        // Only update status if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setStatus('saved')
          // Reset to idle after showing 'saved' for 2 seconds
          setTimeout(() => setStatus('idle'), 2000)
        }
      } catch (error) {
        console.error('Auto-save failed:', error)

        // Only update status if this is still the latest request
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
