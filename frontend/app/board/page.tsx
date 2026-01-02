'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Plus, MoreHorizontal, AlertTriangle, ArrowRight, ArrowLeft, Trash2, Circle, CheckCircle2, Eye, EyeOff, Edit2, X } from 'lucide-react'
import { getTasks, getThemes, updateTask, deleteTask, createTheme, updateTheme, deleteTheme, Task, Theme } from '@/lib/api'
import TaskActionMenu from '@/components/TaskActionMenu'
import { useAppStore } from '@/lib/store'

export default function BoardPage() {
  const { lastUpdate } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [themes, setThemes] = useState<Theme[]>([])
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  
  // Validation Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  
  // New Theme State
  const [isCreatingTheme, setIsCreatingTheme] = useState(false)
  const [newThemeTitle, setNewThemeTitle] = useState('')
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null)
  const [editingThemeTitle, setEditingThemeTitle] = useState('')

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true))
    fetchData()
    return () => {
        cancelAnimationFrame(animation)
        setEnabled(false)
    }
  }, [lastUpdate])

  const fetchData = async () => {
    try {
      const [t, th] = await Promise.all([getTasks(), getThemes()])
      setTasks(t)
      setThemes(th.sort((a, b) => a.order - b.order))
    } catch (err) {
      console.error("Failed to load board data:", err)
      setError("Unable to connect to Liminal Core. Please ensure the backend service is running.")
    }
  }

  const handleCreateTheme = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newThemeTitle.trim()) return
      
      try {
          const order = themes.length > 0 ? Math.max(...themes.map(t => t.order)) + 1 : 0
          const theme = await createTheme({ 
              title: newThemeTitle, 
              color: '#4F46E5', 
              priority: 'medium',
              order 
          })
          setThemes([...themes, theme])
          setNewThemeTitle('')
          setIsCreatingTheme(false)
      } catch (err) {
          console.error("Failed to create theme", err)
      }
  }

  const handleUpdateThemeTitle = async (themeId: string) => {
      if (!editingThemeTitle.trim()) return
      
      // Optimistic
      setThemes(prev => prev.map(t => t.id === themeId ? { ...t, title: editingThemeTitle } : t))
      setEditingThemeId(null)
      
      try {
          await updateTheme(themeId, { title: editingThemeTitle })
      } catch (err) {
          console.error("Failed to update theme", err)
          fetchData() // Revert
      }
  }

  const handleDeleteTheme = async (themeId: string) => {
      if (!confirm("Delete this column? Tasks will be moved to Backlog.")) return
      
      // Move tasks to backlog optimistically
      setTasks(prev => prev.map(t => t.theme_id === themeId ? { ...t, theme_id: undefined, status: 'backlog' } : t))
      setThemes(prev => prev.filter(t => t.id !== themeId))
      
      try {
          await deleteTheme(themeId)
          // Ideally backend handles task reassignment, but we should refresh to be sure
          fetchData() 
      } catch (err) {
          console.error("Failed to delete theme", err)
          fetchData()
      }
  }

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result
    if (!destination) return

    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    // --- COLUMN REORDERING ---
    if (type === 'COLUMN') {
        const newThemes = Array.from(themes)
        const [movedTheme] = newThemes.splice(source.index, 1)
        newThemes.splice(destination.index, 0, movedTheme)
        
        // Update local state immediately
        const reorderedThemes = newThemes.map((t, index) => ({ ...t, order: index }))
        setThemes(reorderedThemes)
        
        // Persist order
        try {
            // In a real app, send batch update. Here loop (not efficient but works for MVP)
            await Promise.all(reorderedThemes.map(t => updateTheme(t.id, { order: t.order })))
        } catch (err) {
            console.error("Failed to reorder themes", err)
        }
        return
    }

    // --- TASK REORDERING ---
    const task = tasks.find(t => t.id === draggableId)
    if (!task) return

    const targetThemeId = destination.droppableId === 'backlog' ? undefined : destination.droppableId
    const targetStatus: Task['status'] = targetThemeId ? 'in_progress' : 'backlog'
    
    // GATING CHECK: If leaving backlog, must have Value & Estimate
    if (source.droppableId === 'backlog' && destination.droppableId !== 'backlog') {
        const effort = task.effort_score ?? task.estimated_duration
        const isValid = task.value_score > 0 && effort && effort > 0
        if (!isValid) {
            setEditingTask(task) // Open Modal
            return 
        }
    }

    // Optimistic Update
    const updatedTasks = tasks.map(t => {
        if (t.id === draggableId) {
            return { 
                ...t, 
                status: targetStatus,
                theme_id: targetThemeId
            }
        }
        return t
    })
    setTasks(updatedTasks)

    // API Call
    await updateTask(draggableId, { 
        status: targetStatus,
        theme_id: targetThemeId
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

    await updateTask(editingTask.id, {
        title: editingTask.title,
        priority: editingTask.priority,
        priority_score: editingTask.priority_score,
        value_score: editingTask.value_score,
        estimated_duration: editingTask.estimated_duration,
        effort_score: editingTask.effort_score,
        notes: editingTask.notes
    })
    
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
        </div>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" direction="horizontal" type="COLUMN">
            {(provided) => (
                <div 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className="flex gap-6 h-[calc(100vh-200px)] min-w-max"
                >
                    {/* Fixed Backlog Column */}
                    <div className="w-80 flex-shrink-0 flex flex-col">
                        <div className="flex items-center justify-between mb-4 px-2 border-b-2 pb-2 border-gray-200">
                            <h3 className="font-bold text-gray-700">The Threshold</h3>
                            <span className="bg-gray-100 text-xs px-2 py-1 rounded-full">
                                {tasks.filter(t => t.status === 'backlog').length}
                            </span>
                        </div>
                        <Droppable droppableId="backlog" type="TASK">
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex-1 bg-gray-50/50 rounded-xl p-3 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
                                >
                                    {tasks.filter(t => t.status === 'backlog').map((task, index) => (
                                        <TaskItem 
                                            key={task.id} 
                                            task={task} 
                                            index={index} 
                                            handleComplete={handleComplete} 
                                            handleDelete={handleDelete} 
                                            setEditingTask={setEditingTask} 
                                            isBacklog={true}
                                        />
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>

                    {/* Draggable Theme Columns */}
                    {themes.map((theme, index) => (
                        <Draggable key={theme.id} draggableId={theme.id} index={index}>
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className="w-80 flex-shrink-0 flex flex-col group/col"
                                >
                                    <div 
                                        {...provided.dragHandleProps}
                                        className="flex items-center justify-between mb-4 px-2 border-b-2 pb-2 border-primary/50 cursor-grab active:cursor-grabbing hover:bg-gray-50 rounded-t-lg transition-colors"
                                    >
                                        {editingThemeId === theme.id ? (
                                            <div className="flex items-center gap-2 flex-1 mr-2">
                                                <input 
                                                    autoFocus
                                                    className="w-full px-2 py-1 text-sm border rounded"
                                                    value={editingThemeTitle}
                                                    onChange={e => setEditingThemeTitle(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleUpdateThemeTitle(theme.id)
                                                        if (e.key === 'Escape') setEditingThemeId(null)
                                                    }}
                                                    onBlur={() => handleUpdateThemeTitle(theme.id)}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <h3 
                                                    className="font-bold text-gray-700 cursor-pointer hover:text-primary"
                                                    onClick={() => {
                                                        setEditingThemeId(theme.id)
                                                        setEditingThemeTitle(theme.title)
                                                    }}
                                                >
                                                    {theme.title}
                                                </h3>
                                                <span className="bg-gray-100 text-xs px-2 py-1 rounded-full">
                                                    {tasks.filter(t => t.theme_id === theme.id && t.status !== 'backlog').length}
                                                </span>
                                            </div>
                                        )}
                                        
                                        <button 
                                            onClick={() => handleDeleteTheme(theme.id)}
                                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover/col:opacity-100 transition-opacity"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    
                                    <Droppable droppableId={theme.id} type="TASK">
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`flex-1 bg-gray-50/50 rounded-xl p-3 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
                                            >
                                                {tasks
                                                    .filter(t => t.theme_id === theme.id && t.status !== 'backlog')
                                                    .filter(t => showCompleted || t.status !== 'done')
                                                    .map((task, index) => (
                                                        <TaskItem 
                                                            key={task.id} 
                                                            task={task} 
                                                            index={index} 
                                                            handleComplete={handleComplete} 
                                                            handleDelete={handleDelete} 
                                                            setEditingTask={setEditingTask} 
                                                        />
                                                    ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            )}
                        </Draggable>
                    ))}
                    
                    {provided.placeholder}

                    {/* Add Column Button */}
                    <div className="w-80 flex-shrink-0">
                        {isCreatingTheme ? (
                            <form onSubmit={handleCreateTheme} className="bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-200">
                                <input 
                                    autoFocus
                                    placeholder="Theme Name..."
                                    className="w-full px-3 py-2 rounded border border-gray-300 mb-2"
                                    value={newThemeTitle}
                                    onChange={e => setNewThemeTitle(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-primary text-white py-1.5 rounded text-sm font-medium">Add</button>
                                    <button type="button" onClick={() => setIsCreatingTheme(false)} className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded text-sm font-medium">Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <button 
                                onClick={() => setIsCreatingTheme(true)}
                                className="w-full h-12 flex items-center justify-center gap-2 text-muted hover:text-primary hover:bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 transition-colors"
                            >
                                <Plus size={20} />
                                <span className="font-medium">Add Theme</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </Droppable>
      </DragDropContext>

      {/* Edit Modal (reused from before) */}
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

function TaskItem({ task, index, handleComplete, handleDelete, setEditingTask, isBacklog = false }: any) {
    return (
        <Draggable draggableId={task.id} index={index}>
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
                            {/* Visual indicator for priority */}
                             <span className={`w-2 h-2 rounded-full ${
                                task.priority_score >= 90 ? 'bg-red-400' :
                                task.priority_score >= 60 ? 'bg-yellow-400' : 'bg-blue-400'
                             }`} />
                        </div>
                        
                        {/* Missing Data Warning */}
                        {isBacklog && task.status !== 'done' && (!task.value_score || !(task.effort_score ?? task.estimated_duration)) && (
                            <div className="mt-2 text-[10px] text-orange-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <AlertTriangle size={10} /> Needs details to start
                            </div>
                        )}
                    </div>

                    <div onClick={e => e.stopPropagation()}>
                        <TaskActionMenu 
                            onDelete={() => handleDelete({ stopPropagation: () => {} }, task.id)}
                            onEdit={() => setEditingTask(task)}
                            isCompleted={task.status === 'done'}
                        />
                    </div>
                </div>
            )}
        </Draggable>
    )
}