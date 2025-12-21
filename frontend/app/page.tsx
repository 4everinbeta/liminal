'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store'
import FocusToggle from '@/components/FocusToggle'
import Pomodoro from '@/components/Pomodoro'
import ChatInterface from '@/components/ChatInterface'
import TaskForm from '@/components/TaskForm'
import { getTasks, updateTask, deleteTask, Task } from '@/lib/api'
import { logout } from '@/lib/auth'
import { LogOut, CheckCircle, PauseCircle } from 'lucide-react'

export default function Home() {
  const { activeTaskId, setActiveTaskId } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
      if (!activeTaskId && sorted.length > 0) {
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

  useEffect(() => {
    if (!activeTaskId && tasks.length > 0) {
      setActiveTaskId(tasks[0].id)
    }
  }, [tasks, activeTaskId, setActiveTaskId])

  const activeTask = tasks.find((task) => task.id === activeTaskId) || tasks[0]
  const urgentTasks = useMemo(() => tasks.slice(0, 4), [tasks])

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTask(taskId, { status: 'done' })
      const remaining = tasks.filter((t) => t.id !== taskId)
      setTasks(remaining)
      if (activeTaskId === taskId) {
        setActiveTaskId(remaining.length > 0 ? remaining[0].id : null)
      }
    } catch (err) {
      console.error('Complete failed', err)
      fetchTasks()
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Remove this task?')) return
    try {
      await deleteTask(taskId)
      const remaining = tasks.filter((t) => t.id !== taskId)
      setTasks(remaining)
      if (activeTaskId === taskId) {
        setActiveTaskId(remaining.length > 0 ? remaining[0].id : null)
      }
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  const handlePauseTask = () => {
    console.log('Paused task:', activeTask?.title)
  }

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (err) {
      console.error('Logout failed', err)
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6">
      <header className="py-6 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Liminal</p>
            <h1 className="text-3xl font-bold text-gray-900">Today’s Horizon</h1>
            <p className="text-gray-500">
              One calm surface for urgent work. Capture a thought, focus, or ask for help.
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full font-medium shadow-sm hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            <LogOut size={16} />
            <span className="text-sm">{isLoggingOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <span>{isLoading ? 'Loading focus list…' : `${tasks.length} active tasks`}</span>
          <a href="/board" className="text-primary font-medium hover:underline">
            Open full board
          </a>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <section className="space-y-6">
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
                Nothing screaming for attention. Capture a task or take a breath.
              </p>
            ) : (
              <ul className="space-y-3">
                {urgentTasks.map((task) => (
                  <li
                    key={task.id}
                    className="border border-gray-100 rounded-2xl px-4 py-3 bg-gray-50/60 hover:bg-white transition-colors"
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="text-primary text-sm font-medium flex items-center gap-1"
                        >
                          <CheckCircle size={16} />
                          Done
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-gray-400 text-xs uppercase tracking-wide"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick capture</h3>
            <p className="text-sm text-gray-500 mb-4">
              Drop a thought and we’ll score it for you. No complicated forms.
            </p>
            <TaskForm onTaskCreated={fetchTasks} />
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">Now focusing</p>
                <h3 className="text-2xl font-bold mt-1">
                  {activeTask ? activeTask.title : 'Choose a task to focus'}
                </h3>
              </div>
              <FocusToggle />
            </div>
            {activeTask && (
              <p className="text-white/80 text-sm mt-2">
                {activeTask.estimated_duration
                  ? `Estimated ${activeTask.estimated_duration} minutes`
                  : 'No duration set'}
              </p>
            )}

            <div className="mt-6 space-y-4">
              {activeTask ? (
                <>
                  <div className="bg-white/10 rounded-2xl p-4 backdrop-blur">
                    <Pomodoro />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleCompleteTask(activeTask.id!)}
                      className="flex-1 py-2 rounded-xl bg-white text-primary font-semibold flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} />
                      Complete
                    </button>
                    <button
                      onClick={handlePauseTask}
                      className="flex-1 py-2 rounded-xl border border-white/40 text-white font-semibold flex items-center justify-center gap-2"
                    >
                      <PauseCircle size={18} />
                      Pause
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-white/80 text-sm">
                  Select a task from the urgent list to start a focus block.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ask the coach</h3>
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
