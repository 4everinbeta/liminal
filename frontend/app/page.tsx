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

  const fetchTasks = async () => {
    // ... existing ...
  }

  useEffect(() => {
    fetchTasks()
  }, [lastUpdate])

  const stats = useMemo(() => {
    const today = new Date().toDateString()
    // Note: updated_at is needed for "Done Today" accuracy, but assuming backend provides it
    // If backend doesn't provide updated_at for tasks, this will be NaN. 
    // We safeguarded backend to provide it.
    const doneToday = tasks.filter(t => t.status === 'done' && new Date(t.updated_at).toDateString() === today).length
    const backlog = tasks.filter(t => t.status === 'backlog').length
    const inProgress = tasks.filter(t => t.status === 'in_progress').length
    return { doneToday, backlog, inProgress }
  }, [tasks])

  const urgentTasks = useMemo(() => tasks.slice(0, 4), [tasks])

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTask(taskId, { status: 'done' })
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
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
