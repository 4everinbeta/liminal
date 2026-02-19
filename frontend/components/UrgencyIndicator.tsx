'use client'

import { Clock } from 'lucide-react'
import { useCountdown } from '@/lib/hooks/useCountdown'
import { getUrgencyLevel } from '@/lib/urgency'

interface UrgencyIndicatorProps {
  dueDate: string | undefined
  size?: 'sm' | 'md'
}

const sizeClass = { sm: 'text-xs', md: 'text-sm' }

/**
 * Displays a live countdown timer with urgency-level styling.
 *
 * ADHD-safe messaging:
 * - Overdue: "Let's finish this" in warm orange (not "late" or "overdue")
 * - Critical (<1h): red — creates urgency, not shame
 * - Soon (<24h): amber
 * - Safe: gray
 *
 * Returns null when no dueDate is provided.
 */
export default function UrgencyIndicator({ dueDate, size = 'sm' }: UrgencyIndicatorProps) {
  const { timeLeft, isOverdue } = useCountdown(dueDate)

  if (!dueDate || timeLeft === null) return null

  const level = getUrgencyLevel(dueDate)
  const text = sizeClass[size]

  if (isOverdue) {
    return (
      <span className={`${text} text-orange-500 font-medium flex items-center gap-1`}>
        <Clock size={size === 'sm' ? 10 : 12} />
        Let&apos;s finish this
      </span>
    )
  }

  const colorClass =
    level === 'critical' ? 'text-red-500 font-medium' :
    level === 'urgent'   ? 'text-amber-600 font-medium' :
    level === 'soon'     ? 'text-amber-600' :
                           'text-gray-500'

  return (
    <span className={`${text} ${colorClass} flex items-center gap-1`}>
      <Clock size={size === 'sm' ? 10 : 12} />
      {timeLeft} left
    </span>
  )
}
