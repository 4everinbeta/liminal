'use client'

import { Task } from '@/lib/api'
import { useCapacity } from './useCapacity'

interface CapacitySummaryStripProps {
  tasks: Task[]
}

export default function CapacitySummaryStrip({ tasks }: CapacitySummaryStripProps) {
  const capacity = useCapacity(tasks)

  if (capacity.isAfterWork) {
    return (
      <div className="flex items-center gap-2 text-xs text-blue-600 py-2 px-1">
        <span className="text-blue-400">●</span>
        <span>Workday ended</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs text-blue-600 py-2 px-1">
      <span className="text-blue-400">●</span>
      <span>
        {capacity.hoursRemaining.toFixed(1)}h left{capacity.todayTasks.length > 0
          ? ` · ${capacity.tasksFit}/${capacity.todayTasks.length} tasks fit`
          : ''}
      </span>
    </div>
  )
}
