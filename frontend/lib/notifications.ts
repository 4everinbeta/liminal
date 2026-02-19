/**
 * Browser notification utilities for Liminal.
 *
 * Design principles (ADHD-safe):
 * - Never auto-request notification permission
 * - Use soft-ask pattern: show friendly prompt first, then browser dialog only on explicit user gesture
 * - Notifications scheduled 1 hour before deadline via setTimeout
 * - Active notifications tracked per taskId to prevent duplicates
 */

// Module-level map tracking active notification timeout IDs by taskId
const activeNotifications = new Map<string, number>()

/**
 * Request browser notification permission.
 * Must be called from a user gesture handler (button click, etc).
 * Returns true if permission was granted, false otherwise.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  // SSR safety and browser support check
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }

  const { permission } = Notification

  if (permission === 'granted') return true
  if (permission === 'denied') return false

  // Request permission (only call this from a user gesture)
  const result = await Notification.requestPermission()
  return result === 'granted'
}

/**
 * Schedule a browser notification 1 hour before the task due date.
 * Returns the timeout ID so it can be cancelled, or null if scheduling is not possible.
 *
 * Automatically cancels any existing notification for the same taskId to prevent duplicates.
 */
export function scheduleTaskNotification(
  taskId: string,
  taskTitle: string,
  dueDate: string
): number | null {
  // SSR safety and browser support check
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }

  if (Notification.permission !== 'granted') {
    return null
  }

  const due = new Date(dueDate).getTime()
  const now = Date.now()
  const msUntilNotification = due - 60 * 60 * 1000 - now // 1 hour before due

  // Don't schedule if the notification time is in the past or more than 25 days out
  // (setTimeout max reliable delay is ~25 days due to 32-bit int overflow)
  const MAX_MS = 25 * 24 * 60 * 60 * 1000
  if (msUntilNotification <= 0 || msUntilNotification > MAX_MS) {
    return null
  }

  // Cancel any existing notification for this task to prevent duplicates
  const existingId = activeNotifications.get(taskId)
  if (existingId !== undefined) {
    clearTimeout(existingId)
    activeNotifications.delete(taskId)
  }

  const timeoutId = window.setTimeout(() => {
    new Notification('Liminal: Task due soon', {
      body: `"${taskTitle}" is due in 1 hour`,
      tag: `task-${taskId}`, // tag deduplicates notifications with the same tag
    })
    activeNotifications.delete(taskId)
  }, msUntilNotification)

  activeNotifications.set(taskId, timeoutId)
  return timeoutId
}

/**
 * Cancel a previously scheduled task notification by timeout ID.
 */
export function cancelTaskNotification(timeoutId: number): void {
  clearTimeout(timeoutId)
}
