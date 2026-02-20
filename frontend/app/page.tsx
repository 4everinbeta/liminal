'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store'
import TaskForm from '@/components/TaskForm'
import TaskActionMenu from '@/components/TaskActionMenu'
import EditTaskModal from '@/components/EditTaskModal'
import ChatInterface from '@/components/ChatInterface'
import CapacitySummary from '@/components/CapacitySummary'
import UrgencyIndicator from '@/components/UrgencyIndicator'
import { getTasks, updateTask, deleteTask, Task } from '@/lib/api'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { useUrgencyColor } from '@/lib/hooks/useUrgencyColor'
import { isStaleTask } from '@/lib/urgency'
import { CheckCircle, ArrowRight, CircleDashed, Flame, ListTodo } from 'lucide-react'

// Extracted component so hooks (useUrgencyColor) can be called per-task row
function PlanningTaskRow({
  task,
  isActive,
  onTaskClick,
  onDelete,
  onComplete,
  onEdit,
}: {
  task: Task
  isActive: boolean
  onTaskClick: () => void
  onDelete: () => void
  onComplete: () => void
  onEdit: () => void
}) {
  const urgencyColor = useUrgencyColor(task.due_date, task.created_at, task.status)
  const stale = isStaleTask(task.created_at, task.status)

  const borderStyle = task.due_date
    ? { borderLeft: '4px solid', borderLeftColor: urgencyColor }
    : {}

  return (
    <li
      className={`border rounded-2xl px-4 py-3 transition-all group ${
        isActive ? 'border-primary bg-primary/5' : 'border-gray-100 bg-gray-50/60 hover:bg-white'
      }`}
      style={{ opacity: stale ? 0.5 : 1, filter: stale ? 'grayscale(30%)' : undefined, ...borderStyle }}
    >
      <div className="flex items-start justify-between gap-3">
        <button onClick={onTaskClick} className="flex-1 text-left">
          <div className="text-base font-semibold text-gray-900 hover:text-primary">
            {task.title}
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
            <span className="uppercase tracking-wide">{task.priority} priority</span>
            {task.estimated_duration && <span>{task.estimated_duration}m</span>}
            <UrgencyIndicator dueDate={task.due_date} size="sm" />
          </div>
        </button>
        <TaskActionMenu
          onDelete={onDelete}
          onToggleComplete={onComplete}
          onEdit={onEdit}
          isCompleted={false}
        />
      </div>
    </li>
  )
}

export default function Home() {
  const {
    isFocusMode,
    toggleFocusMode,
    activeTaskId,
    setActiveTaskId,
    planningScrollPosition,
    setPlanningScrollPosition,
    triggerUpdate,
    lastUpdate
  } = useAppStore()

  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Notification soft-ask (dismissed state persisted to sessionStorage)
  const { permission, showSoftAsk, requestPermission, dismissSoftAsk, triggerSoftAsk, scheduleNotification } = useNotifications()
  const [softAskDismissed, setSoftAskDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('notif-soft-ask-dismissed') === 'true'
    }
    return false
  })

  const handleDismissSoftAsk = () => {
    dismissSoftAsk()
    setSoftAskDismissed(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('notif-soft-ask-dismissed', 'true')
    }
  }

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

      // Set active task to first non-done task if none is set
      if (!activeTaskId) {
        const firstActive = sorted.find(t => t.status !== 'done')
        if (firstActive) {
          setActiveTaskId(firstActive.id)
        }
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

  // Trigger notification soft-ask and schedule notifications after tasks load
  useEffect(() => {
    if (tasks.length === 0) return
    const hasDueDates = tasks.some(t => t.due_date && t.status !== 'done')
    if (hasDueDates && !softAskDismissed && permission === 'default') {
      triggerSoftAsk()
    }
    if (permission === 'granted') {
      tasks.forEach(t => {
        if (t.due_date && t.status !== 'done') {
          scheduleNotification(t.id, t.title, t.due_date)
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, permission])

  // Restore scroll position when switching to planning mode
  useEffect(() => {
    if (!isFocusMode) {
      window.scrollTo(0, planningScrollPosition)
    }
  }, [isFocusMode, planningScrollPosition])

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

  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks])
  const activeTask = activeTasks.find(t => t.id === activeTaskId)

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTask(taskId, { status: 'done' })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done', updated_at: new Date().toISOString() } : t))

      // Move to next task
      const currentIndex = activeTasks.findIndex(t => t.id === taskId)
      const nextTask = activeTasks[currentIndex + 1] || activeTasks[0]
      if (nextTask && nextTask.id !== taskId) {
        setActiveTaskId(nextTask.id)
      }
    } catch (err) {
      console.error('Complete failed', err)
      fetchTasks()
    }
  }

  const handleSkipTask = () => {
    const currentIndex = activeTasks.findIndex(t => t.id === activeTaskId)
    const nextTask = activeTasks[currentIndex + 1] || activeTasks[0]
    if (nextTask && nextTask.id !== activeTaskId) {
      setActiveTaskId(nextTask.id)
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

  const handleSwitchToFocus = () => {
    setPlanningScrollPosition(window.scrollY)
    toggleFocusMode()
  }

  const handleTaskClick = (taskId: string) => {
    setActiveTaskId(taskId)
    if (isFocusMode === false) {
      handleSwitchToFocus()
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      {/* Header with Mode Toggle */}
      <header className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold text-gray-900">Liminal</h1>
        <div className="flex items-center gap-3">
          {/* Mode toggle - prominent */}
          <div className="bg-gray-100 rounded-full p-1 flex">
            <button
              onClick={() => isFocusMode ? null : handleSwitchToFocus()}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isFocusMode ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Focus
            </button>
            <button
              onClick={() => isFocusMode ? toggleFocusMode() : null}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !isFocusMode ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Plan
            </button>
          </div>
          {/* Board link - secondary */}
          <a href="/board" className="text-sm text-gray-500 hover:text-primary transition-colors">
            Board
          </a>
        </div>
      </header>

      {/* Notification soft-ask banner */}
      {showSoftAsk && !softAskDismissed && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between mb-4">
          <span className="text-sm text-blue-800">Get reminded 1 hour before deadlines?</span>
          <div className="flex gap-2">
            <button
              onClick={requestPermission}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
            >
              Enable
            </button>
            <button
              onClick={handleDismissSoftAsk}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-4">
            Failed to load tasks. <button onClick={fetchTasks} className="underline ml-2">Retry</button>
        </div>
      )}

      {/* FOCUS MODE VIEW */}
      {isFocusMode && (
        <div className="space-y-6 py-6">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.doneToday}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Done Today</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <Flame size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.streak}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Day Streak</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                <CircleDashed size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeTasks.length}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active</p>
              </div>
            </div>
          </div>

          {/* Active Task Card */}
          {activeTask ? (
            <div className="bg-white border border-gray-100 rounded-3xl shadow-lg p-8">
              <div className="text-center mb-6">
                <p className="text-sm font-medium text-primary mb-2">Current Focus</p>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{activeTask.title}</h2>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                  <span className="uppercase tracking-wide">{activeTask.priority} priority</span>
                  {activeTask.estimated_duration && <span>{activeTask.estimated_duration}m</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 w-full mt-8">
                <button
                  onClick={() => handleCompleteTask(activeTask.id)}
                  className="flex-1 py-4 bg-green-50 text-green-700 hover:bg-green-100 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors text-lg"
                >
                  <CheckCircle size={24} />
                  Complete
                </button>
                <button
                  onClick={handleSkipTask}
                  className="flex-1 py-4 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors text-lg"
                >
                  <ArrowRight size={24} />
                  Skip
                </button>
              </div>

              {/* Task Queue Preview */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Up Next</p>
                <div className="space-y-2">
                  {activeTasks.slice(1, 4).map(task => (
                    <button
                      key={task.id}
                      onClick={() => setActiveTaskId(task.id)}
                      className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      {task.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-3xl shadow-lg p-12 text-center">
              <CircleDashed size={48} className="mx-auto text-gray-300 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No active tasks</h2>
              <p className="text-gray-500 mb-6">Switch to Plan mode to add your first task</p>
              <button
                onClick={toggleFocusMode}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Go to Planning
              </button>
            </div>
          )}
        </div>
      )}

      {/* PLANNING MODE VIEW */}
      {!isFocusMode && (
        <div className="space-y-6 py-6">
          {/* Quick Capture */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Quick capture</h3>
            <TaskForm onTaskCreated={fetchTasks} />
          </div>

          {/* Capacity Summary */}
          <div className="mb-4">
            <CapacitySummary tasks={tasks} />
          </div>

          {/* Task List */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div className="flex items-center gap-2">
                <ListTodo size={20} className="text-primary" />
                <h2 className="text-xl font-semibold text-gray-900">
                  {isLoading ? 'Loading tasks…' : 'All Tasks'}
                </h2>
              </div>
              <button
                onClick={fetchTasks}
                className="text-sm text-gray-500 hover:text-primary transition-colors"
              >
                Refresh
              </button>
            </div>

            {activeTasks.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No tasks yet. Capture a thought above or ask the coach for suggestions.
              </p>
            ) : (
              <ul className="space-y-3">
                {activeTasks.map((task) => (
                  <PlanningTaskRow
                    key={task.id}
                    task={task}
                    isActive={task.id === activeTaskId}
                    onTaskClick={() => handleTaskClick(task.id)}
                    onDelete={() => handleDeleteTask(task.id)}
                    onComplete={() => handleCompleteTask(task.id)}
                    onEdit={() => setEditingTask(task)}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Chat Assistant */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">AI Coach</h3>
            <ChatInterface onTaskCreated={fetchTasks} />
          </div>
        </div>
      )}

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
