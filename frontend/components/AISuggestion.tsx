'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, Check, X } from 'lucide-react'

interface AISuggestionProps {
  taskTitle: string
  reasoning: string
  isVisible: boolean
  onAccept: () => void
  onDismiss: () => void
  dueDate?: string        // ISO date string, e.g. "2026-03-25"
  estimatedDuration?: number  // minutes
}

export const AISuggestion: React.FC<AISuggestionProps> = ({
  taskTitle,
  reasoning,
  isVisible,
  onAccept,
  onDismiss,
  dueDate,
  estimatedDuration,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="bg-white border border-gray-100 rounded-2xl p-6 mb-4 shadow-sm"
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary" aria-hidden="true">
              <Wand2 size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500">AI Suggestion: Do This Now</p>
              <h3 className="text-lg font-bold text-gray-900 mt-1">{taskTitle}</h3>
              {(dueDate || estimatedDuration) && (
                <p className="text-sm text-gray-500 mt-1">
                  {dueDate && (() => {
                    const [year, month, day] = dueDate.split('-').map(Number)
                    return `Due ${new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  })()}
                  {dueDate && estimatedDuration && ' \u00B7 '}
                  {estimatedDuration && `${estimatedDuration} min`}
                </p>
              )}
              <p className="text-sm text-gray-600 mt-2">{reasoning}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={onAccept}
              aria-label={`Accept AI suggestion: start working on ${taskTitle}`}
              className="flex-1 min-h-[44px] py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <Check size={16} aria-hidden="true" />
              Start This Task
            </button>
            <button
              onClick={onDismiss}
              aria-label="Dismiss AI suggestion for now"
              className="flex-1 min-h-[44px] py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <X size={16} aria-hidden="true" />
              Not Now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
