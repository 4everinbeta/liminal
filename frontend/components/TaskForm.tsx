'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronDown, ChevronUp, Calendar, FileText } from 'lucide-react'
import { createTask, TaskCreate } from '@/lib/api'
import { calculateSmartDefaults } from '@/lib/smartDefaults'

interface TaskFormProps {
  onTaskCreated?: () => void
}

const STORAGE_KEY = 'liminal_task_form_draft'

export default function TaskForm({ onTaskCreated }: TaskFormProps) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const [isOpen, setIsOpen] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)

  // Only track user-provided fields
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [duration, setDuration] = useState<number>(30)
  const [description, setDescription] = useState('')
  const [priorityPreset, setPriorityPreset] = useState<'today' | 'week' | 'later'>('week')
  const [valuePreset, setValuePreset] = useState<'quick' | 'standard' | 'big'>('standard')
  const [durationPreset, setDurationPreset] = useState<'quick' | 'medium' | 'long' | 'custom'>('medium')

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!hasMounted) return;
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const draft = JSON.parse(saved)
        setTitle(draft.title || '')
        setDueDate(draft.dueDate || '')
        setDuration(draft.duration || 30)
        setDescription(draft.description || '')
        setDurationPreset(draft.durationPreset || 'medium')
        setShowAdvanced(draft.showAdvanced || false)
        if (draft.title) setIsOpen(true)
      } catch (e) {
        console.error('Failed to parse task form draft', e)
      }
    }
  }, [hasMounted])

  // Save draft to localStorage whenever fields change
  useEffect(() => {
    if (!hasMounted) return;
    const draft = {
      title,
      dueDate,
      duration,
      description,
      durationPreset,
      showAdvanced,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [hasMounted, title, dueDate, duration, description, durationPreset, showAdvanced])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Build partial task from user input
      const partialTask: Partial<TaskCreate> = {
        title,
        description: description || undefined,
        due_date: dueDate || undefined,
        estimated_duration: duration,
      }

      // Apply smart defaults
      const taskWithDefaults = calculateSmartDefaults(partialTask)

      // Create the task
      await createTask(taskWithDefaults)

      // Clear draft
      localStorage.removeItem(STORAGE_KEY)

      // Reset form
      setTitle('')
      setDueDate('')
      setDuration(30)
      setDescription('')
      setPriorityPreset('week')
      setValuePreset('standard')
      setDurationPreset('medium')
      setShowAdvanced(false)
      setIsOpen(false)

      if (onTaskCreated) onTaskCreated()
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update duration when preset changes
  const handleDurationPresetChange = (preset: typeof durationPreset) => {
    setDurationPreset(preset)
    if (preset === 'quick') setDuration(15)
    else if (preset === 'medium') setDuration(30)
    else if (preset === 'long') setDuration(60)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-medium hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add New Task
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title - always visible (only required field) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="What needs to be done?"
            autoFocus
          />
        </div>

        {/* Progressive disclosure toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1"
        >
          {showAdvanced ? (
            <>
              <ChevronUp size={16} />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              Add details
            </>
          )}
        </button>

        {/* Advanced fields - progressive disclosure */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Calendar size={14} />
                  Due Date (optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Duration Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration
                </label>
                <div className="flex gap-2 mb-2">
                  {(['quick', 'medium', 'long'] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleDurationPresetChange(preset)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize border transition-colors ${
                        durationPreset === preset
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {preset === 'quick' && 'Quick (15m)'}
                      {preset === 'medium' && 'Medium (30m)'}
                      {preset === 'long' && 'Long (60m)'}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDurationPreset('custom')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      durationPreset === 'custom'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {durationPreset === 'custom' && (
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Minutes"
                  />
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <FileText size={14} />
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Additional details..."
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              setShowAdvanced(false)
            }}
            className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Task'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}
