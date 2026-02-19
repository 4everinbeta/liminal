import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';

export interface CountdownResult {
  timeLeft: string | null;
  isOverdue: boolean;
}

/**
 * Real-time countdown hook using requestAnimationFrame for performance.
 *
 * WHY requestAnimationFrame over setInterval:
 * - setInterval throttles to 1000ms when tab is backgrounded (causes drift)
 * - requestAnimationFrame suspends cleanly and resumes without lag
 * - Throttled to ~1000ms updates (no need for 60fps on a seconds display)
 *
 * @param targetDate - ISO date string for the deadline, or undefined
 * @returns { timeLeft: string | null, isOverdue: boolean }
 *   - timeLeft: human-readable string ("3 hours", "2 minutes") or 'overdue' or null
 *   - isOverdue: true when past deadline (RAF loop stops)
 *
 * Usage:
 * ```typescript
 * const { timeLeft, isOverdue } = useCountdown(task.due_date);
 * ```
 */
export function useCountdown(targetDate: string | undefined): CountdownResult {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isOverdue, setIsOverdue] = useState(false);
  const rafIdRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    // No target date — return null immediately, no RAF loop needed
    if (!targetDate) {
      setTimeLeft(null);
      setIsOverdue(false);
      return;
    }

    const updateCountdown = (timestamp: number) => {
      // Throttle to ~1000ms updates — seconds display doesn't need 60fps
      if (timestamp - lastUpdateRef.current >= 1000) {
        const remaining = new Date(targetDate).getTime() - Date.now();

        if (remaining <= 0) {
          setTimeLeft('overdue');
          setIsOverdue(true);
          // Stop RAF loop — no more updates needed
          return;
        }

        setTimeLeft(
          formatDistanceToNowStrict(new Date(targetDate), { addSuffix: false })
        );
        lastUpdateRef.current = timestamp;
      }

      rafIdRef.current = requestAnimationFrame(updateCountdown);
    };

    // Trigger initial update immediately (don't wait 1 second for first render)
    const remaining = new Date(targetDate).getTime() - Date.now();
    if (remaining <= 0) {
      setTimeLeft('overdue');
      setIsOverdue(true);
    } else {
      setTimeLeft(
        formatDistanceToNowStrict(new Date(targetDate), { addSuffix: false })
      );
      rafIdRef.current = requestAnimationFrame(updateCountdown);
    }

    return () => {
      if (rafIdRef.current !== undefined) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [targetDate]);

  return { timeLeft, isOverdue };
}
