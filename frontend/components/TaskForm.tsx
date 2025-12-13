'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Clock, BarChart2, AlertCircle } from 'lucide-react'
import { createTask, TaskCreate } from '@/lib/api'

interface TaskFormProps {
  onTaskCreated?: () => void
}

export default function TaskForm({ onTaskCreated }: TaskFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<TaskCreate>({
    title: '',
    priority: 'medium',
    estimated_duration: 30,
    value_score: 50,
    status: 'backlog'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createTask(formData)
      setFormData({
        title: '',
        priority: 'medium',
        estimated_duration: 30,
        value_score: 50,
        status: 'backlog'
      })
      setIsOpen(false)
      if (onTaskCreated) onTaskCreated()
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setLoading(false)
    }
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Title
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="What needs to be done?"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Clock size={14} />
              Duration (min)
            </label>
            <input
              type="number"
              min="5"
              step="5"
              value={formData.estimated_duration}
              onChange={(e) =>
                setFormData({ ...formData, estimated_duration: parseInt(e.target.value) || 0 })
              }
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <BarChart2 size={14} />
              Value Score
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.value_score}
              onChange={(e) =>
                setFormData({ ...formData, value_score: parseInt(e.target.value) || 50 })
              }
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <AlertCircle size={14} />
            Priority
          </label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFormData({ ...formData, priority: p })}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize border transition-colors ${
                  formData.priority === p
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
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
