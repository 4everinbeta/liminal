'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, Check, X } from 'lucide-react'

interface AISuggestionProps {
  taskTitle: string
  reasoning: string
  isVisible: boolean
  onAccept: () => void
  onDismiss: () => void
}

export const AISuggestion: React.FC<AISuggestionProps> = ({
  taskTitle,
  reasoning,
  isVisible,
  onAccept,
  onDismiss,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl p-6 z-50 border border-gray-100"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Wand2 size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500">AI Suggestion: Do This Now</p>
              <h3 className="text-lg font-bold text-gray-900 mt-1">{taskTitle}</h3>
              <p className="text-sm text-gray-600 mt-2">{reasoning}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={onAccept}
              className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Accept
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <X size={16} />
              Dismiss
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
