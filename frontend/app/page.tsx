'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store'
import TaskForm from '@/components/TaskForm'
import TaskActionMenu from '@/components/TaskActionMenu'
import { getTasks, updateTask, deleteTask, Task } from '@/lib/api'
import { Target, Calendar, CheckCircle2, CircleDashed } from 'lucide-react'

export default function Home() {
  const { setActiveTaskId, lastUpdate } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  }, [lastUpdate])

  const stats = useMemo(() => {
    const today = new Date().toDateString()
    const doneToday = tasks.filter(t => t.status === 'done' && t.updated_at && new Date(t.updated_at).toDateString() === today).length
    const backlog = tasks.filter(t => t.status === 'backlog').length
    const inProgress = tasks.filter(t => t.status === 'in_progress').length
    return { doneToday, backlog, inProgress }
  }, [tasks])

  const urgentTasks = useMemo(() => tasks.filter(t => t.status !== 'done').slice(0, 4), [tasks])

  // ... handlers ...

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6">
      {/* ... header ... */}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-4">
            Failed to load tasks. <button onClick={fetchTasks} className="underline ml-2">Retry</button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <CheckCircle2 size={20} />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{stats.doneToday}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Done Today</p>
            </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Target size={20} />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">In Focus</p>
            </div>
        </div>
         <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                <CircleDashed size={20} />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{stats.backlog}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Backlog</p>
            </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr),minmax(0,2fr)]">
        <section className="space-y-6">
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
                          onClick={() => setActiveTaskId(task.id)}
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
                        isCompleted={false}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </section>

        <aside className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Coach</h3>
            {/* Coach is now global, but we can keep a "Tip" or prompt here? */}
            {/* Removing ChatInterface from here. */}
          </div>
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 text-center text-gray-500 text-sm">
            <p className="mb-2">Need help prioritizing?</p>
            <p>Click the chat bubble in the corner to talk to your AI Coach.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
