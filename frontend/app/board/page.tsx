'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Plus, MoreHorizontal, AlertTriangle, ArrowRight, ArrowLeft, Trash2, Circle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { getTasks, getThemes, updateTask, deleteTask, Task, Theme } from '@/lib/api'

export default function BoardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [themes, setThemes] = useState<Theme[]>([])
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  
  // Validation Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true))
    fetchData()
    return () => {
        cancelAnimationFrame(animation)
        setEnabled(false)
    }
  }, [])

  const fetchData = async () => {
    try {
      const [t, th] = await Promise.all([getTasks(), getThemes()])
      setTasks(t)
      setThemes(th)
    } catch (err) {
      console.error("Failed to load board data:", err)
      setError("Unable to connect to Liminal Core. Please ensure the backend service is running.")
    }
  }

  // Columns: Threshold (Backlog) + Themes
  const columns = [
    { id: 'backlog', title: 'The Threshold', color: 'border-gray-200' },
    ...themes.map(t => ({ id: t.id, title: t.title, color: 'border-primary' }))
  ]

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return

    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const task = tasks.find(t => t.id === draggableId)
    if (!task) return

    // Logic: 
    // If moving from Backlog -> Theme, Check gates.
    // If moving to Backlog -> Clear theme.
    // If moving between Themes -> Update theme.

    const targetThemeId = destination.droppableId === 'backlog' ? null : destination.droppableId
    const targetStatus: Task['status'] = targetThemeId ? 'in_progress' : 'backlog'
    
    // GATING CHECK: If leaving backlog, must have Value & Estimate
    if (source.droppableId === 'backlog' && destination.droppableId !== 'backlog') {
        const effort = task.effort_score ?? task.estimated_duration
        const isValid = task.value_score > 0 && effort && effort > 0
        if (!isValid) {
            setEditingTask(task) // Open Modal
            return // Cancel drop visually (React state won't update yet)
        }
    }

    // Optimistic Update
    const updatedTasks = tasks.map(t => {
        if (t.id === draggableId) {
            return { 
                ...t, 
                status: targetStatus,
                theme_id: targetThemeId || undefined
            }
        }
        return t
    })
    setTasks(updatedTasks)

    // API Call
    await updateTask(draggableId, { 
        status: targetStatus,
        theme_id: targetThemeId || undefined
    })
  }

  const handleDelete = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    if (!confirm("Delete this task?")) return
    try {
        await deleteTask(taskId)
        setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (err) {
        console.error("Delete failed", err)
    }
  }

  const handleComplete = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    const newStatus = task.status === 'done' ? 'in_progress' : 'done'
    
    // Optimistic
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))

    try {
        await updateTask(task.id, { status: newStatus })
    } catch (err) {
        console.error("Update failed", err)
        fetchData() // Revert
    }
  }

  const saveTaskDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask) return

    // Save and move to "In Progress" (we assume user was trying to move it)
    // For simplicity, we just save the data. The user has to drag again.
    // OR we could auto-move, but we lost the drop destination.
    await updateTask(editingTask.id, {
        title: editingTask.title,
        priority: editingTask.priority,
        priority_score: editingTask.priority_score,
        value_score: editingTask.value_score,
        estimated_duration: editingTask.estimated_duration,
        effort_score: editingTask.effort_score,
        notes: editingTask.notes
    })
    
    // Refresh local state
    const newTasks = tasks.map(t => t.id === editingTask.id ? editingTask : t)
    setTasks(newTasks)
    setEditingTask(null)
  }

  if (!enabled) return null

  if (error) {
    return (
      <div className="min-h-screen bg-background text-text p-6 flex items-center justify-center">
        <div className="bg-red-50 text-red-600 p-8 rounded-2xl max-w-md text-center">
          <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Connection Lost</h2>
          <p>{error}</p>
          <button 
            onClick={() => { setError(null); fetchData(); }}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-text p-6 overflow-x-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Horizon View</h1>
            <p className="text-muted">Align work to themes. Clear the Threshold.</p>
        </div>
        <div className="flex gap-3">
            <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-muted hover:text-primary border border-gray-200 rounded-full font-medium transition-all"
            >
                {showCompleted ? <EyeOff size={16} /> : <Eye size={16} />}
                <span className="text-sm">{showCompleted ? 'Hide Done' : 'Show Done'}</span>
            </button>
            <a href="/" className="flex items-center gap-2 px-4 py-2 bg-white text-muted hover:text-primary border border-gray-200 rounded-full font-medium transition-all">
                <ArrowLeft size={16} />
                <span className="text-sm">Focus Mode</span>
            </a>
        </div>
      </header>

      <div className="flex gap-6 h-[calc(100vh-200px)] min-w-max">
        <DragDropContext onDragEnd={onDragEnd}>
            {columns.map((col) => {
                // Filter tasks: 
                // Backlog col gets 'backlog' status.
                // Theme cols get 'in_progress' or 'done' status AND matching theme_id
                const colTasks = tasks.filter(t => {
                    if (!showCompleted && t.status === 'done') return false
                    
                    if (col.id === 'backlog') {
                        // Backlog column shows backlog items OR done items that have no theme
                        if (t.status === 'done' && !t.theme_id) return true
                        return t.status === 'backlog'
                    }
                    
                    // Theme columns show items with that theme_id (in_progress or done)
                    return t.theme_id === col.id && t.status !== 'backlog'
                })
                const sortedTasks = colTasks

                return (
                    <div key={col.id} className="w-80 flex-shrink-0 flex flex-col">
                         <div className={`flex items-center justify-between mb-4 px-2 border-b-2 pb-2 ${col.id === 'backlog' ? 'border-gray-200' : 'border-primary/50'}`}>
                            <h3 className="font-bold text-gray-700">{col.title}</h3>
                            <span className="bg-gray-100 text-xs px-2 py-1 rounded-full">{sortedTasks.length}</span>
                        </div>
                        
                        <Droppable droppableId={col.id}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex-1 bg-gray-50/50 rounded-xl p-3 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
                                >
                                    {sortedTasks.map((task, index) => (
                                        <Draggable key={task.id} draggableId={task.id} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    onClick={() => setEditingTask(task)}
                                                    className={`mb-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-primary transition-all group cursor-pointer flex gap-3 items-start ${task.status === 'done' ? 'opacity-60 bg-gray-50' : ''}`}
                                                    style={provided.draggableProps.style}
                                                >
                                                    <button 
                                                        onClick={(e) => handleComplete(e, task)}
                                                        className="mt-1 text-gray-300 hover:text-secondary transition-colors shrink-0"
                                                    >
                                                        {task.status === 'done' ? <CheckCircle2 size={20} className="text-green-500" /> : <Circle size={20} />}
                                                    </button>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={`font-medium mb-2 ${task.status === 'done' ? 'line-through text-muted' : ''}`}>{task.title}</h4>
                                                        <div className="flex justify-between items-center text-xs text-muted">
                                                            <div className="flex gap-2">
                                                                {task.value_score > 0 && <span className="text-green-600 font-mono">v:{task.value_score}</span>}
                                                                {(task.effort_score || task.estimated_duration) && (
                                                                <span className="text-blue-600 font-mono">e:{task.effort_score ?? task.estimated_duration}</span>
                                                                )}
                                                            </div>
                                                            <span className="w-2 h-2 rounded-full bg-gray-300" />
                                                        </div>
                                                        
                                                        {/* Missing Data Warning */}
                                                        {col.id === 'backlog' && task.status !== 'done' && (!task.value_score || !(task.effort_score ?? task.estimated_duration)) && (
                                                            <div className="mt-2 text-[10px] text-orange-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <AlertTriangle size={10} /> Needs details to start
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={(e) => handleDelete(e, task.id)}
                                                        className="mt-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                )
            })}
        </DragDropContext>
      </div>

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full">
                <h3 className="text-lg font-bold mb-4">Edit Task</h3>
                
                <form onSubmit={saveTaskDetails} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted mb-1">Title</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg"
                            value={editingTask.title}
                            onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                            required
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted mb-1">Value (1-100)</label>
                            <input 
                                type="number" min="1" max="100" 
                                className="w-full p-2 border rounded-lg"
                                value={editingTask.value_score || ''}
                                onChange={e => setEditingTask({...editingTask, value_score: parseInt(e.target.value)})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted mb-1">Effort (1-100)</label>
                            <input 
                                type="number" min="1" max="100"
                                className="w-full p-2 border rounded-lg"
                                value={editingTask.effort_score || ''}
                                onChange={e => setEditingTask({...editingTask, effort_score: parseInt(e.target.value), estimated_duration: parseInt(e.target.value)})}
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
                                    onClick={() => setEditingTask({
                                        ...editingTask,
                                        priority_score: p,
                                        priority: p >= 67 ? 'high' : p >= 34 ? 'medium' : 'low'
                                    })}
                                    className={`flex-1 py-2 rounded-lg capitalize border ${
                                        editingTask.priority_score === p 
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
                            value={editingTask.notes || ''}
                            onChange={e => setEditingTask({...editingTask, notes: e.target.value})}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setEditingTask(null)} className="flex-1 px-4 py-2 text-muted hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-lg">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}
