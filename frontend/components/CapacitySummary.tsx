'use client'

import { Task } from '@/lib/api'
import { useCapacity } from './useCapacity'

interface CapacitySummaryProps {
  tasks: Task[]
}

export default function CapacitySummary({ tasks }: CapacitySummaryProps) {
  const capacity = useCapacity(tasks)

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
