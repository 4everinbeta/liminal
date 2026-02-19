/**
 * Urgency calculation utilities for Liminal task management.
 *
 * ADHD-safe design principles:
 * - Overdue tasks use warm orange (#f97316), NOT shame-inducing pure red
 * - No-deadline tasks use neutral gray (#94a3b8)
 * - Completed tasks always gray regardless of deadline
 * - Color gradient: green (safe) → yellow (soon) → orange (urgent) → red (critical)
 *
 * Note: Use inline style={{ backgroundColor: color }} for dynamic colors.
 * Dynamic Tailwind class strings (bg-[${color}]) break at build time.
 */
import chroma from 'chroma-js';

// HSL color scale: green → yellow → orange → red
// Domain points: [0=just created, 0.5=halfway, 0.85=urgent, 1=deadline]
const URGENCY_SCALE = chroma
  .scale(['#10b981', '#fbbf24', '#f97316', '#ef4444'])
  .mode('hsl')
  .domain([0, 0.5, 0.85, 1]);

const COLOR_GRAY = '#94a3b8';     // Tailwind gray-400 — no deadline / done
const COLOR_OVERDUE = '#f97316';  // Tailwind orange-500 — warm, not shame-inducing red

/**
 * Returns a hex color string representing urgency based on deadline proximity.
 *
 * Colors:
 * - Gray (#94a3b8): no due date or status === 'done'
 * - Orange (#f97316): overdue (due < now) — warm, not shame-inducing red
 * - Green→Red gradient: based on 1 - (timeRemaining / totalTime)
 *
 * @param dueDate - ISO date string or undefined
 * @param createdAt - ISO date string of task creation
 * @param status - Task status ('done', 'backlog', 'todo', 'in_progress', 'blocked')
 */
export function getUrgencyColor(
  dueDate: string | undefined,
  createdAt: string,
  status: string
): string {
  if (!dueDate || status === 'done') {
    return COLOR_GRAY;
  }

  const now = Date.now();
  const due = new Date(dueDate).getTime();

  // Overdue: warm orange (not shame-inducing red)
  if (due < now) {
    return COLOR_OVERDUE;
  }

  const created = new Date(createdAt).getTime();
  const totalTime = due - created;
  const timeRemaining = due - now;

  // progress: 0 = just created (green), 1 = at deadline (red)
  const progress = Math.max(0, Math.min(1, 1 - timeRemaining / totalTime));

  return URGENCY_SCALE(progress).hex();
}

export type UrgencyLevel = 'overdue' | 'critical' | 'urgent' | 'soon' | 'safe' | 'none';

/**
 * Returns a categorical urgency level based on time remaining until deadline.
 *
 * Levels:
 * - 'none': no due date
 * - 'overdue': past deadline
 * - 'critical': less than 1 hour remaining
 * - 'urgent': less than 4 hours remaining
 * - 'soon': less than 24 hours remaining
 * - 'safe': more than 24 hours remaining
 *
 * @param dueDate - ISO date string or undefined
 */
export function getUrgencyLevel(dueDate: string | undefined): UrgencyLevel {
  if (!dueDate) {
    return 'none';
  }

  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const remaining = due - now;

  if (remaining <= 0) return 'overdue';
  if (remaining < 60 * 60 * 1000) return 'critical';           // < 1 hour
  if (remaining < 4 * 60 * 60 * 1000) return 'urgent';        // < 4 hours
  if (remaining < 24 * 60 * 60 * 1000) return 'soon';         // < 24 hours
  return 'safe';
}

/**
 * Returns true if a task has been sitting in backlog longer than staleDays.
 *
 * Used to apply visual aging (opacity reduction) to stale backlog items.
 *
 * @param createdAt - ISO date string of task creation
 * @param status - Task status
 * @param staleDays - Number of days before a backlog task is considered stale (default 3)
 */
export function isStaleTask(
  createdAt: string,
  status: string,
  staleDays: number = 3
): boolean {
  if (status !== 'backlog') {
    return false;
  }

  const daysSinceCreated =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceCreated > staleDays;
}
