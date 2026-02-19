'use client'

import { useMemo } from 'react'
import { Task } from '@/lib/api'

interface CapacitySummaryProps {
  tasks: Task[]
}

export default function CapacitySummary({ tasks }: CapacitySummaryProps) {
  const capacity = useMemo(() => {
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

  if (capacity.isAfterWork) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm font-medium text-blue-900">Due Today</p>
        <p className="text-sm text-blue-600 mt-1">Workday ended</p>
      </div>
    )
  }

  if (capacity.todayTasks.length === 0) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm font-medium text-blue-900">Due Today</p>
        <p className="text-sm text-blue-600 mt-1">No tasks due today</p>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <p className="text-sm font-medium text-blue-900">Due Today</p>
      <p className="text-2xl font-bold text-blue-700 mt-1">
        {capacity.hoursRemaining.toFixed(1)}h left
      </p>
      <p
        className={`text-xs mt-2 ${
          capacity.isOverCapacity ? 'text-orange-600' : 'text-blue-600'
        }`}
      >
        {capacity.tasksFit} of {capacity.todayTasks.length} tasks fit
        {capacity.isOverCapacity && ' (over capacity)'}
      </p>
    </div>
  )
}
