'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, PauseCircle } from 'lucide-react'
import { forwardRef, memo, useState } from 'react'
import TaskActionMenu from './TaskActionMenu'
import UrgencyIndicator from './UrgencyIndicator'
import { triggerTaskComplete } from '@/lib/confetti'
import { useUrgencyColor } from '@/lib/hooks/useUrgencyColor'
import { isStaleTask } from '@/lib/urgency'

interface TaskProps {
  task: {
    id: string
    title: string
    priority_score?: number
    estimatedTime?: number
    themeColor?: string
    due_date?: string
    created_at?: string
    status?: string
  }
  onComplete?: (id: string) => void
  onDelete?: (id: string) => void
  isWhereYouLeftOff?: boolean
  isInterrupted?: boolean
  onResumeFromInterrupt?: () => void
}

const TaskCard = memo(forwardRef<HTMLDivElement, TaskProps>(({ task, onComplete, onDelete, isWhereYouLeftOff, isInterrupted, onResumeFromInterrupt }, ref) => {
  const [isCompleting, setIsCompleting] = useState(false)

  const urgencyColor = useUrgencyColor(task.due_date, task.created_at || '', task.status || '')
  const stale = isStaleTask(task.created_at || '', task.status || '')

  // Priority: themeColor > urgencyColor (when due_date present) > priority class
  const priorityColorClass =
    task.priority_score && task.priority_score >= 67
      ? 'border-l-4 border-l-red-400'
      : task.priority_score && task.priority_score >= 34
        ? 'border-l-4 border-l-yellow-400'
        : 'border-l-4 border-l-blue-400'

  const cardBorderStyle: React.CSSProperties = task.themeColor
    ? { borderLeft: '4px solid', borderLeftColor: task.themeColor }
    : task.due_date
      ? { borderLeft: '4px solid', borderLeftColor: urgencyColor }
      : {}

  const effortLabel = typeof task.estimatedTime === 'number' ? `e:${task.estimatedTime}` : null

  const handleComplete = () => {
    // Immediate celebration (optimistic feedback)
    triggerTaskComplete()

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
        opacity: isCompleting ? 0 : stale ? 0.5 : 1,
        y: isCompleting ? 10 : 0,
        scale: isCompleting ? 0.95 : 1,
        filter: stale ? 'grayscale(30%)' : 'grayscale(0%)',
      }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.01 }}
      className={`relative group bg-white p-4 rounded-xl shadow-sm border border-gray-100 md:hover:shadow-md transition-shadow flex items-center gap-3 ${
        task.themeColor || task.due_date ? '' : priorityColorClass
      } ${isWhereYouLeftOff ? 'ring-2 ring-primary/30 ring-offset-2' : ''}`}
      style={cardBorderStyle}
    >
      <motion.button
        onClick={handleComplete}
        whileTap={{ scale: 0.9 }}
        className="text-gray-300 md:hover:text-secondary transition-colors relative"
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
      </motion.button>
      
      <div className={`flex-1 transition-opacity ${isCompleting ? 'opacity-50 line-through' : ''}`}>
        <h3 className="font-medium text-text">{task.title}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          {effortLabel && (
            <span className="text-xs text-muted font-mono bg-gray-100 px-2 py-0.5 rounded">
              {effortLabel}
            </span>
          )}
          <UrgencyIndicator dueDate={task.due_date} size="sm" />
        </div>
      </div>

      <div onClick={e => e.stopPropagation()}>
        <TaskActionMenu
            onDelete={onDelete ? () => onDelete(task.id) : undefined}
            onToggleComplete={onComplete ? handleComplete : undefined}
            isCompleted={false}
        />
      </div>
      <AnimatePresence>
        {isInterrupted && (
          <motion.span
            key="interrupted-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute top-2 right-2 flex items-center bg-orange-50 rounded px-1.5 py-0.5 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onResumeFromInterrupt?.() }}
          >
            <PauseCircle size={14} className="text-orange-500" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}))

TaskCard.displayName = 'TaskCard'

export default TaskCard