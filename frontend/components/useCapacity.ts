'use client'

import { useMemo } from 'react'
import { Task } from '@/lib/api'

export interface CapacityData {
  hoursRemaining: number
  todayTasks: Task[]
  tasksFit: number
  totalTaskHours: number
  isOverCapacity: boolean
  isAfterWork: boolean
}

export function useCapacity(tasks: Task[]): CapacityData {
  return useMemo(() => {
    const now = new Date()
    const currentHour = now.getHours() + now.getMinutes() / 60

    // Hardcode 9-5 workday for MVP
    const hoursRemaining = Math.max(0, 17 - currentHour)

    // Filter tasks due today that are not done
    const todayTasks = tasks.filter((t) => {
      if (!t.due_date) return false
      if (t.status === 'done') return false
      return new Date(t.due_date).toDateString() === now.toDateString()
    })

    // Estimate hours per task: prefer estimated_duration, then effort_score, fallback 30 min
    const taskHours = todayTasks.map((t) => {
      const minutes = t.estimated_duration ?? t.effort_score ?? 30
      return minutes / 60
    })

    // Sort ascending (shortest first) for greedy fit
    const sortedHours = [...taskHours].sort((a, b) => a - b)

    // Count how many tasks fit in remaining hours
    let accumulated = 0
    let tasksFit = 0
    for (const hours of sortedHours) {
      if (accumulated + hours <= hoursRemaining) {
        accumulated += hours
        tasksFit++
      } else {
        break
      }
    }

    const totalTaskHours = taskHours.reduce((sum, h) => sum + h, 0)
    const isOverCapacity = totalTaskHours > hoursRemaining

    return {
      hoursRemaining,
      todayTasks,
      tasksFit,
      totalTaskHours,
      isOverCapacity,
      isAfterWork: hoursRemaining === 0,
    }
  }, [tasks])
}
