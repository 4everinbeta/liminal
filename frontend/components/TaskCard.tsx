'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Trash2 } from 'lucide-react'
import { forwardRef, useState } from 'react'

interface TaskProps {
  task: {
    id: string
    title: string
    priority_score?: number
    estimatedTime?: number
    themeColor?: string
  }
  onComplete?: (id: string) => void
  onDelete?: (id: string) => void
}

const TaskCard = forwardRef<HTMLDivElement, TaskProps>(({ task, onComplete, onDelete }, ref) => {
  const [isCompleting, setIsCompleting] = useState(false)

  // Show theme color if available; fallback to priority color
  const priorityColorClass =
    task.priority_score && task.priority_score >= 67
      ? 'border-l-4 border-l-red-400'
      : task.priority_score && task.priority_score >= 34
        ? 'border-l-4 border-l-yellow-400'
        : 'border-l-4 border-l-blue-400'

  const cardBorderStyle = task.themeColor
    ? { borderLeft: '4px solid', borderLeftColor: task.themeColor }
    : undefined

  const effortLabel = typeof task.estimatedTime === 'number' ? `e:${task.estimatedTime}` : null

  const handleComplete = () => {
    setIsCompleting(true)
    setTimeout(() => {
      onComplete?.(task.id)
    }, 400) // Allow animation to play
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: isCompleting ? 0 : 1, 
        y: isCompleting ? 10 : 0,
        scale: isCompleting ? 0.95 : 1
      }}
      whileHover={{ scale: 1.01 }}
      className={`group bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-3 ${
        task.themeColor ? '' : priorityColorClass
      }`}
      style={cardBorderStyle}
    >
      <button 
        onClick={handleComplete}
        className="text-gray-300 hover:text-secondary transition-colors relative"
        disabled={isCompleting}
      >
        {isCompleting ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            className="text-green-500"
          >
            <CheckCircle2 size={24} />
          </motion.div>
        ) : (
          <Circle size={24} />
        )}
      </button>
      
      <div className={`flex-1 transition-opacity ${isCompleting ? 'opacity-50 line-through' : ''}`}>
        <h3 className="font-medium text-text">{task.title}</h3>
        {effortLabel && (
          <span className="text-xs text-muted font-mono bg-gray-100 px-2 py-0.5 rounded">
            {effortLabel}
          </span>
        )}
      </div>

      {onDelete && (
        <button
          onClick={() => onDelete(task.id)}
          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"
          title="Delete Task"
        >
          <Trash2 size={18} />
        </button>
      )}
    </motion.div>
  )
})

TaskCard.displayName = 'TaskCard'

export default TaskCard
