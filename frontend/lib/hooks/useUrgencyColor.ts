import { useMemo } from 'react';
import { getUrgencyColor } from '@/lib/urgency';

/**
 * Memoized urgency color hook wrapping getUrgencyColor.
 *
 * Returns a hex color string representing deadline urgency:
 * - '#94a3b8' (gray): no due date or status === 'done'
 * - '#f97316' (orange): overdue — warm, ADHD-safe (not shame-inducing red)
 * - '#10b981'→'#ef4444' gradient: green→yellow→orange→red based on deadline proximity
 *
 * The heavy interpolation logic lives in urgency.ts (getUrgencyColor).
 * This hook is a thin memoization wrapper to prevent recalculation on every render.
 *
 * Usage:
 * ```typescript
 * const color = useUrgencyColor(task.due_date, task.created_at, task.status);
 * // Use inline styles (NOT dynamic Tailwind class names — they break at build time)
 * return <div style={{ backgroundColor: color }}>...</div>;
 * ```
 *
 * @param dueDate - ISO date string or undefined
 * @param createdAt - ISO date string of task creation
 * @param status - Task status ('done', 'backlog', 'todo', 'in_progress', 'blocked')
 * @returns Hex color string
 */
export function useUrgencyColor(
  dueDate: string | undefined,
  createdAt: string,
  status: string
): string {
  return useMemo(
    () => getUrgencyColor(dueDate, createdAt, status),
    [dueDate, createdAt, status]
  );
}
