import { useState, useEffect, useCallback } from 'react'

/**
 * Syncs form state to sessionStorage for draft preservation across page navigation.
 *
 * Features:
 * - SSR-safe with typeof window check
 * - JSON serialization for complex state
 * - Quota exceeded handling
 * - Automatic cleanup when browser closes (sessionStorage)
 *
 * @param key - sessionStorage key for this draft
 * @param initialValue - Default value when no draft exists
 * @returns [value, setValue, clearDraft] tuple
 */
export function useDraftPreservation<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void, () => void] {
  // Initialize from sessionStorage if available (SSR-safe)
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue

    try {
      const stored = sessionStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch (error) {
      console.warn('Failed to parse draft from sessionStorage:', error)
      return initialValue
    }
  })

  // Sync to sessionStorage on every state change
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('sessionStorage quota exceeded - draft not saved')
      } else {
        console.error('Failed to save draft to sessionStorage:', error)
      }
    }
  }, [key, value])

  // Provide clearDraft function that removes from sessionStorage and resets to initial value
  const clearDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(key)
    }
    setValue(initialValue)
  }, [key, initialValue])

  return [value, setValue, clearDraft]
}
