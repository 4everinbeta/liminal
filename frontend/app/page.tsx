'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store'
import ChatInterface from '@/components/ChatInterface'
import TaskForm from '@/components/TaskForm'
import TaskActionMenu from '@/components/TaskActionMenu'
import { getTasks, updateTask, deleteTask, Task } from '@/lib/api'
import { Target } from 'lucide-react'

export default function Home() {
  const { setActiveTaskId } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTasks = async () => {
    setIsLoading(true)
    try {
      const fetchedTasks = await getTasks()
      const priorityMap = { high: 3, medium: 2, low: 1 }
      const sorted = fetchedTasks
        .filter((task) => task.status !== 'done')
        .sort((a, b) => {
          const pA = priorityMap[a.priority] || 0
          const pB = priorityMap[b.priority] || 0
          if (pA !== pB) return pB - pA
          if (a.value_score !== b.value_score) return b.value_score - a.value_score
          return (a.estimated_duration || 0) - (b.estimated_duration || 0)
        })

      setTasks(sorted)
      if (sorted.length > 0) {
        setActiveTaskId(sorted[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

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
            <a
              href="/focus"
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 text-primary text-sm font-semibold px-3 py-1.5 hover:bg-primary/5 transition-colors"
            >
              <Target size={14} />
              Focus mode
            </a>
          </div>
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-4">
              Wondering what to tackle next? Ask about priorities or the backlog.
            </p>
            <ChatInterface />
          </div>
        </aside>
      </div>
    </div>
  )
}
