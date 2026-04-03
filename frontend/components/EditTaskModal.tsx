'use client'

import { Task, Theme, getThemes } from '@/lib/api'
import { useState, useEffect } from 'react'

interface EditTaskModalProps {
  task: Task
  onClose: () => void
  onSave: (task: Task) => void
}

const PRIORITY_LABELS: Record<number, string> = { 30: 'Low', 60: 'Medium', 90: 'High' }

export default function EditTaskModal({ task, onClose, onSave }: EditTaskModalProps) {
  const [editedTask, setEditedTask] = useState<Task>(task)
  const [themes, setThemes] = useState<Theme[]>([])

  useEffect(() => {
    const loadThemes = async () => {
      try {
        const t = await getThemes()
        setThemes(t)
      } catch (err) {
        console.error('Failed to load themes', err)
      }
    }
    loadThemes()
  }, [])

  // Convert ISO datetime to YYYY-MM-DD format for date input
  const toDateInputValue = (dateString?: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }

  // Convert date input value to ISO datetime string
  const fromDateInputValue = (dateValue: string) => {
    if (!dateValue) return undefined
    try {
      // Create date at noon to avoid timezone issues
      const date = new Date(dateValue + 'T12:00:00Z')
      return date.toISOString()
    } catch {
      return undefined
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(editedTask)
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoDate = fromDateInputValue(e.target.value)
    setEditedTask({...editedTask, start_date: isoDate})
  }

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoDate = fromDateInputValue(e.target.value)
    setEditedTask({...editedTask, due_date: isoDate})
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-1">Edit Task</h3>
            <p className="text-sm text-gray-500 mb-4">All fields are optional. Add details when you&apos;re ready.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1">Title</label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded-lg"
                        value={editedTask.title}
                        onChange={e => setEditedTask({...editedTask, title: e.target.value})}
                        required
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted mb-1">Start Date</label>
                        <input
                            type="date"
                            className="w-full p-2 border rounded-lg text-base"
                            value={toDateInputValue(editedTask.start_date)}
                            onChange={handleStartDateChange}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted mb-1">Due Date</label>
                        <input
                            type="date"
                            className="w-full p-2 border rounded-lg text-base"
                            value={toDateInputValue(editedTask.due_date)}
                            onChange={handleDueDateChange}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1">Duration</label>
                    <div className="flex gap-2">
                        {([
                            { label: 'Quick', minutes: 15 },
                            { label: 'Medium', minutes: 30 },
                            { label: 'Long', minutes: 60 },
                        ] as const).map(({ label, minutes }) => (
                            <button
                                key={minutes}
                                type="button"
                                onClick={() => setEditedTask({
                                    ...editedTask,
                                    estimated_duration: minutes,
                                    value_score: minutes <= 15 ? 30 : minutes <= 30 ? 50 : 70,
                                    effort_score: minutes <= 15 ? 30 : minutes <= 30 ? 50 : 70,
                                })}
                                className={`flex-1 py-2 rounded-lg border text-sm ${
                                    editedTask.estimated_duration === minutes
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-gray-600 border-gray-200 md:hover:bg-gray-50'
                                }`}
                            >
                                {label} <span className="opacity-70">{minutes}m</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1">Priority</label>
                    <div className="flex gap-2">
                        {[30, 60, 90].map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setEditedTask({
                                    ...editedTask,
                                    priority_score: p,
                                    priority: p >= 67 ? 'high' : p >= 34 ? 'medium' : 'low'
                                })}
                                className={`flex-1 py-2 rounded-lg capitalize border ${
                                    editedTask.priority_score === p 
                                        ? 'bg-primary text-white border-primary' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {PRIORITY_LABELS[p]}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted mb-1">Theme</label>
                        <select
                            className="w-full p-2 border rounded-lg text-base"
                            value={editedTask.theme_id || ''}
                            onChange={e => setEditedTask({...editedTask, theme_id: e.target.value || undefined})}
                        >
                            <option value="">No theme</option>
                            {themes.map(theme => (
                                <option key={theme.id} value={theme.id}>{theme.title}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted mb-1">Initiative</label>
                        <select
                            className="w-full p-2 border rounded-lg text-base"
                            value={editedTask.initiative_id || ''}
                            onChange={e => setEditedTask({...editedTask, initiative_id: e.target.value || undefined})}
                        >
                            <option value="">No initiative</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1">Notes</label>
                    <textarea 
                        className="w-full p-2 border rounded-lg h-24 resize-none"
                        value={editedTask.notes || ''}
                        onChange={e => setEditedTask({...editedTask, notes: e.target.value})}
                    />
                </div>
                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-muted hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-lg">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
  )
}
