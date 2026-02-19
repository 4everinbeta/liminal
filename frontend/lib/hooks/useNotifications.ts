/**
 * useNotifications hook - manages notification permission state and scheduling.
 *
 * Soft-ask pattern:
 * 1. Component calls triggerSoftAsk() when a task with a due_date is encountered
 * 2. UI shows friendly prompt ("Get reminded 1 hour before deadlines?")
 * 3. Only when user clicks "Yes" does the hook call requestPermission()
 * 4. requestPermission() triggers the browser permission dialog
 *
 * This avoids Chrome/Firefox penalties for aggressive permission requests.
 */

import { useCallback, useState } from 'react'
import {
  cancelTaskNotification,
  requestNotificationPermission,
  scheduleTaskNotification,
} from '@/lib/notifications'

export interface UseNotificationsReturn {
  /** Current browser notification permission state */
  permission: NotificationPermission
  /** Whether the browser supports the Notification API */
  isSupported: boolean
  /** Whether to show the soft-ask prompt to the user */
  showSoftAsk: boolean
  /** Triggers the actual browser permission dialog (call only on user gesture) */
  requestPermission: () => Promise<boolean>
  /** User dismissed the soft-ask prompt without granting permission */
  dismissSoftAsk: () => void
  /** Trigger the soft-ask prompt (call when first encountering a task with a due_date) */
  triggerSoftAsk: () => void
  /** Schedule a notification for a task (only fires if permission is granted) */
  scheduleNotification: (taskId: string, title: string, dueDate: string) => void
}

export function useNotifications(): UseNotificationsReturn {
  // SSR-safe: only read Notification.permission in browser context
  const getInitialPermission = (): NotificationPermission => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'default'
    }
    return Notification.permission
  }

  const [permission, setPermission] = useState<NotificationPermission>(getInitialPermission)
  const [showSoftAsk, setShowSoftAsk] = useState(false)

  // SSR-safe support check
  const isSupported =
    typeof window !== 'undefined' && 'Notification' in window

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await requestNotificationPermission()
    // Sync state with actual permission after dialog
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
    setShowSoftAsk(false)
    return granted
  }, [])

  const dismissSoftAsk = useCallback((): void => {
    setShowSoftAsk(false)
  }, [])

  const triggerSoftAsk = useCallback((): void => {
    // Only show soft ask if permission hasn't been decided yet
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      setShowSoftAsk(true)
    }
  }, [])

  const scheduleNotification = useCallback(
    (taskId: string, title: string, dueDate: string): void => {
      scheduleTaskNotification(taskId, title, dueDate)
    },
    []
  )

  return {
    permission,
    isSupported,
    showSoftAsk,
    requestPermission,
    dismissSoftAsk,
    triggerSoftAsk,
    scheduleNotification,
  }
}
