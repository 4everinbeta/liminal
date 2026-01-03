'use client'

import { Task } from '@/lib/api'
import { useState } from 'react'

interface EditTaskModalProps {
  task: Task
  onClose: () => void
  onSave: (task: Task) => void
}

export default function EditTaskModal({ task, onClose, onSave }: EditTaskModalProps) {
  const [editedTask, setEditedTask] = useState<Task>(task)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(editedTask)
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Edit Task</h3>
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
                        <label className="block text-xs font-bold uppercase text-muted mb-1">Value (1-100)</label>
                        <input 
                            type="number" min="1" max="100" 
                            className="w-full p-2 border rounded-lg"
                            value={editedTask.value_score || ''}
                            onChange={e => setEditedTask({...editedTask, value_score: parseInt(e.target.value)})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted mb-1">Effort (1-100)</label>
                        <input 
                            type="number" min="1" max="100"
                            className="w-full p-2 border rounded-lg"
                            value={editedTask.effort_score || ''}
                            onChange={e => setEditedTask({...editedTask, effort_score: parseInt(e.target.value), estimated_duration: parseInt(e.target.value)})}
                            required
                        />
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
                                {p}
                            </button>
                        ))}
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
