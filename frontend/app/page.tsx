'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/lib/store'
import TaskForm from '@/components/TaskForm'
import TaskActionMenu from '@/components/TaskActionMenu'
import EditTaskModal from '@/components/EditTaskModal'
import { getTasks, updateTask, deleteTask, Task } from '@/lib/api'
import { Target, Calendar, CheckCircle2, CircleDashed, Flame } from 'lucide-react'

export default function Home() {
  const { setActiveTaskId, lastUpdate } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Edit Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const fetchTasks = async () => {
    setIsLoading(true)
    setError(null)
    console.log("Fetching tasks...")
    try {
      const fetchedTasks = await getTasks()
      console.log("Fetched tasks:", fetchedTasks.length)
      const priorityMap = { high: 3, medium: 2, low: 1 }
      const sorted = fetchedTasks
        .sort((a, b) => {
          // Sort 'done' to bottom first
          if (a.status === 'done' && b.status !== 'done') return 1
          if (a.status !== 'done' && b.status === 'done') return -1
          
          const pA = priorityMap[a.priority] || 0
          const pB = priorityMap[b.priority] || 0
          if (pA !== pB) return pB - pA
          if (a.value_score !== b.value_score) return b.value_score - a.value_score
          return (a.estimated_duration || 0) - (b.estimated_duration || 0)
        })

      setTasks(sorted)
      
      const firstActive = sorted.find(t => t.status !== 'done')
      if (firstActive) {
        setActiveTaskId(firstActive.id)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to load tasks")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdate])

  const stats = useMemo(() => {
    const today = new Date()
    const todayStr = today.toDateString()
    
    // Done Today
    const doneToday = tasks.filter(t => t.status === 'done' && t.updated_at && new Date(t.updated_at).toDateString() === todayStr).length
    
    // Counts
    const backlog = tasks.filter(t => t.status === 'backlog').length
    const inProgress = tasks.filter(t => t.status === 'in_progress').length

    // Streak Calculation
    const completedDates = new Set(
        tasks
        .filter(t => t.status === 'done' && t.updated_at)
        .map(t => new Date(t.updated_at!).toDateString())
    )
    
    let streak = 0
    // Check up to 365 days back
    for (let i = 0; i < 365; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dStr = d.toDateString()
        
        if (completedDates.has(dStr)) {
            streak++
        } else if (i === 0 && !completedDates.has(dStr)) {
            continue 
        } else {
            break
        }
    }
    
    return { doneToday, backlog, inProgress, streak }
  }, [tasks])

  const urgentTasks = useMemo(() => tasks.filter(t => t.status !== 'done').slice(0, 4), [tasks])

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTask(taskId, { status: 'done' })
      setTasks((prev) => prev.filter((t) => t.id !== taskId)) // Optimistic remove from urgent
      // Actually, since we keep all tasks, we should update status in place
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done', updated_at: new Date().toISOString() } : t))
    } catch (err) {
      console.error('Complete failed', err)
      fetchTasks()
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Remove this task?')) return
    try {
      await deleteTask(taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    } catch (err) {
      console.error('Delete failed', err)
    }
  }
  
  const handleSaveTask = async (task: Task) => {
      await updateTask(task.id, {
        title: task.title,
        priority: task.priority,
        priority_score: task.priority_score,
        value_score: task.value_score,
        estimated_duration: task.estimated_duration,
        effort_score: task.effort_score,
        notes: task.notes
      })
      fetchTasks()
      setEditingTask(null)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6">
      <header className="py-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Liminal</p>
          <h1 className="text-3xl font-bold text-gray-900">Today’s board</h1>
          <p className="text-gray-500">
            Urgent tasks, quick capture, and a coach in one clean surface.
          </p>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-4">
            Failed to load tasks. <button onClick={fetchTasks} className="underline ml-2">Retry</button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/board" className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <CheckCircle2 size={20} />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{stats.doneToday}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Done Today</p>
            </div>
        </Link>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <Flame size={20} />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{stats.streak}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Day Streak</p>
            </div>
        </div>
        <Link href="/focus" className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Target size={20} />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">In Focus</p>
            </div>
        </Link>
        <Link href="/board" className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                <CircleDashed size={20} />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{stats.backlog}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Backlog</p>
            </div>
        </Link>
      </div>

      <div className="grid gap-6">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Quick capture</h3>
            <TaskForm onTaskCreated={fetchTasks} />
          </div>

          <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div>
                <p className="text-sm font-medium text-primary">Urgent queue</p>
                <h2 className="text-xl font-semibold text-gray-900">
                  {isLoading ? 'Loading tasks…' : 'Top focus tasks'}
                </h2>
              </div>
              <button
                onClick={fetchTasks}
                className="text-sm text-gray-500 hover:text-primary transition-colors"
              >
                Refresh
              </button>
            </div>

            {urgentTasks.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Nothing urgent. Capture a thought or ask the coach for a suggestion.
              </p>
            ) : (
              <ul className="space-y-3">
                {urgentTasks.map((task) => (
                  <li
                    key={task.id}
                    className="border border-gray-100 rounded-2xl px-4 py-3 bg-gray-50/60 hover:bg-white transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <button
                          onClick={() => setEditingTask(task)}
                          className="text-left text-base font-semibold text-gray-900 hover:text-primary"
                        >
                          {task.title}
                        </button>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                          <span className="uppercase tracking-wide">
                            {task.priority} priority
                          </span>
                          {task.estimated_duration && <span>{task.estimated_duration}m</span>}
                        </div>
                      </div>
                      <TaskActionMenu 
                        onDelete={() => handleDeleteTask(task.id)}
                        onToggleComplete={() => handleCompleteTask(task.id)}
                        onEdit={() => setEditingTask(task)}
                        isCompleted={false}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
      </div>
      
      {editingTask && (
        <EditTaskModal 
            task={editingTask} 
            onClose={() => setEditingTask(null)} 
            onSave={handleSaveTask} 
        />
      )}
    </div>
  )
}