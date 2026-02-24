'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store'
import TaskForm from '@/components/TaskForm'
import TaskActionMenu from '@/components/TaskActionMenu'
import EditTaskModal from '@/components/EditTaskModal'
import ChatInterface from '@/components/ChatInterface'
import CapacitySummary from '@/components/CapacitySummary'
import UrgencyIndicator from '@/components/UrgencyIndicator'
import { getTasks, updateTask, deleteTask, getDeletedTasks, restoreTask, getAiSuggestion, sendAiFeedback, Task, type AISuggestion as AISuggestionType } from '@/lib/api'
import { AISuggestion } from '@/components/AISuggestion'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { useUrgencyColor } from '@/lib/hooks/useUrgencyColor'
import { isStaleTask } from '@/lib/urgency'
import { CheckCircle, ArrowRight, CircleDashed, ListTodo, ArrowDownCircle, RotateCcw } from 'lucide-react'
import { StatsBar } from '@/components/StatsBar'
import { EodSummaryToast, useEodSummaryScheduler } from '@/components/EodSummaryToast'
import { useGamificationStats } from '@/lib/hooks/useGamificationStats'

// Extracted component so hooks (useUrgencyColor) can be called per-task row
function PlanningTaskRow({
  task,
  isActive,
  onTaskClick,
  onDelete,
  onComplete,
  onEdit,
  onPause,
}: {
  task: Task
  isActive: boolean
  onTaskClick: () => void
  onDelete: () => void
  onComplete: () => void
  onEdit: () => void
  onPause: () => void
}) {
  const urgencyColor = useUrgencyColor(task.due_date, task.created_at, task.status)
  const stale = isStaleTask(task.created_at, task.status)
  const isPaused = task.status === 'paused'

  const borderStyle = task.due_date
    ? { borderLeft: '4px solid', borderLeftColor: urgencyColor }
    : {}

  return (
    <li
      className={`border rounded-2xl px-4 py-3 transition-all group ${
        isActive ? 'border-primary bg-primary/5' : 'border-gray-100 bg-gray-50/60 hover:bg-white'
      }`}
      style={{ opacity: stale || isPaused ? 0.5 : 1, filter: stale ? 'grayscale(30%)' : undefined, ...borderStyle }}
    >
      <div className="flex items-start justify-between gap-3">
        <button onClick={onTaskClick} className="flex-1 text-left">
          <div className="text-base font-semibold text-gray-900 hover:text-primary flex items-center gap-2">
            {task.title}
            {isPaused && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded uppercase tracking-wider">Paused</span>}
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
          onPause={onPause}
          isCompleted={false}
          isPaused={isPaused}
        />
      </div>
    </li>
  )
}

export default function Home() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const {
    isFocusMode,
    toggleFocusMode,
    activeTaskId,
    setActiveTaskId,
    previouslyActiveTaskId,
    planningScrollPosition,
    setPlanningScrollPosition,
    eodSummaryEnabled,
    setEodSummaryEnabled,
    triggerUpdate,
    lastUpdate,
    lastCompletedTask,
    setLastCompletedTask,
    lastDeletedTask,
    setLastDeletedTask,
    sortingMode,
    setSortingMode
  } = useAppStore()

  const [tasks, setTasks] = useState<Task[]>([])
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestionType | null>(null);

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
      const [fetchedTasks, fetchedDeleted, suggestion] = await Promise.all([
        getTasks(),
        getDeletedTasks(),
        getAiSuggestion().catch(err => {
          console.log("No AI suggestion available:", err.message);
          return null;
        })
      ])
      console.log("Fetched tasks:", fetchedTasks.length)
      const priorityMap = { high: 3, medium: 2, low: 1 }
      const sorted = fetchedTasks
        .sort((a, b) => {
          // Sort 'done' to bottom first
          if (a.status === 'done' && b.status !== 'done') return 1
          if (a.status !== 'done' && b.status === 'done') return -1

          if (sortingMode === 'ai') {
            // AI Mode: AI Score is primary
            const scoreA = a.ai_relevance_score || 0
            const scoreB = b.ai_relevance_score || 0
            if (scoreA !== scoreB) return scoreB - scoreA
          }

          // Fallback or Manual Mode: Traditional priority
          const pA = priorityMap[a.priority] || 0
          const pB = priorityMap[b.priority] || 0
          if (pA !== pB) return pB - pA
          
          if (a.value_score !== b.value_score) return b.value_score - a.value_score
          return (a.estimated_duration || 0) - (b.estimated_duration || 0)
        })

      setTasks(sorted)
      setDeletedTasks(fetchedDeleted)
      setAiSuggestion(suggestion)

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
  }, [lastUpdate, sortingMode])

  // AI Suggestion Polling (15 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("Polling for fresh AI suggestions...");
      fetchTasks();
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const gamificationStats = useGamificationStats(tasks)
  const { showSummary, dismissSummary } = useEodSummaryScheduler(eodSummaryEnabled, gamificationStats)

  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks])
  const activeTask = activeTasks.find(t => t.id === activeTaskId)

  const handleAcceptSuggestion = async () => {
    if (aiSuggestion) {
      const taskId = aiSuggestion.suggested_task_id;
      setActiveTaskId(taskId);
      setAiSuggestion(null);
      try {
        await sendAiFeedback(taskId, 'accepted');
      } catch (err) {
        console.error("Failed to send AI feedback:", err);
      }
    }
  }

  const handleDismissSuggestion = async () => {
    if (aiSuggestion) {
      const taskId = aiSuggestion.suggested_task_id;
      setAiSuggestion(null);
      try {
        await sendAiFeedback(taskId, 'dismissed');
      } catch (err) {
        console.error("Failed to send AI feedback:", err);
      }
    }
  }

  const previousTask = useMemo(() => {
    if (!previouslyActiveTaskId) return null;
    return tasks.find(t => t.id === previouslyActiveTaskId && t.status !== 'done');
  }, [tasks, previouslyActiveTaskId]);

  const handleCompleteTask = async (taskId: string) => {
    const taskToComplete = tasks.find(t => t.id === taskId)
    try {
      await updateTask(taskId, { status: 'done' })
      if (taskToComplete) {
        setLastCompletedTask({ ...taskToComplete })
        // Clear after 30 seconds
        setTimeout(() => {
          setLastCompletedTask(null)
        }, 30000)
      }
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

  const handlePauseTask = async (taskId: string) => {
    try {
      await updateTask(taskId, { status: 'paused' })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'paused', updated_at: new Date().toISOString() } : t))
      
      // Move to next task if this was the active one
      if (taskId === activeTaskId) {
        const currentIndex = activeTasks.findIndex(t => t.id === taskId)
        const nextTask = activeTasks[currentIndex + 1] || activeTasks[0]
        if (nextTask && nextTask.id !== taskId) {
          setActiveTaskId(nextTask.id)
        } else {
          setActiveTaskId(null)
        }
      }
    } catch (err) {
      console.error('Pause failed', err)
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
    const taskToDelete = tasks.find(t => t.id === taskId)
    try {
      await deleteTask(taskId)
      if (taskToDelete) {
        setLastDeletedTask({ ...taskToDelete })
        // Clear after 30 seconds
        setTimeout(() => {
          setLastDeletedTask(null)
        }, 30000)
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      fetchTasks()
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  const handleRestoreTask = async (taskId: string) => {
    try {
      await restoreTask(taskId)
      fetchTasks()
    } catch (err) {
      console.error('Restore failed', err)
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

  if (!hasMounted) return null;

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

      {/* Gamification Stats Bar — shown in both focus and planning mode */}
      <StatsBar stats={gamificationStats} />

      {/* FOCUS MODE VIEW */}
      {isFocusMode && (
        <div className="space-y-6 py-6">
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
                  onClick={() => handlePauseTask(activeTask.id)}
                  className="flex-1 py-4 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors text-lg"
                >
                  <ArrowDownCircle size={24} />
                  Pause
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
              <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-4">
                {previousTask && (
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-primary font-bold mb-1">Previous interruption</p>
                    <button
                      onClick={() => setActiveTaskId(previousTask.id)}
                      className="text-sm font-medium text-gray-900 hover:text-primary transition-colors text-left flex items-center gap-2"
                    >
                      <RotateCcw size={14} />
                      Resume "{previousTask.title}"
                    </button>
                  </div>
                )}
                
                <div>
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
          {/* Toggles Row */}
          <div className="flex items-center justify-end gap-6 text-xs text-gray-400">
            {/* Sorting Toggle */}
            <div className="flex items-center gap-2">
              <span>AI Sorting</span>
              <button
                onClick={() => setSortingMode(sortingMode === 'ai' ? 'manual' : 'ai')}
                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                  sortingMode === 'ai' ? 'bg-primary' : 'bg-gray-200'
                }`}
                aria-label="Toggle AI sorting"
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                    sortingMode === 'ai' ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* EOD Summary opt-in toggle */}
            <div className="flex items-center gap-2">
              <span>End-of-day summary</span>
              <button
                onClick={() => setEodSummaryEnabled(!eodSummaryEnabled)}
                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                  eodSummaryEnabled ? 'bg-primary' : 'bg-gray-200'
                }`}
                aria-label="Toggle end-of-day summary"
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                    eodSummaryEnabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

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
                    onPause={() => handlePauseTask(task.id)}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Recently Deleted Section */}
          {deletedTasks.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Recently Deleted (24h)</h3>
              <div className="space-y-2">
                {deletedTasks.map(task => (
                  <div key={task.id} className="bg-white border border-gray-100 rounded-xl px-4 py-2 flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                    <span className="text-sm text-gray-600 line-through">{task.title}</span>
                    <button
                      onClick={() => handleRestoreTask(task.id)}
                      className="text-xs font-bold text-primary hover:text-primary/80 uppercase tracking-tighter"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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

      {/* End-of-day summary toast */}
      <EodSummaryToast
        stats={gamificationStats}
        isVisible={showSummary}
        onDismiss={dismissSummary}
      />

      <AISuggestion
        isVisible={!!aiSuggestion}
        taskTitle={tasks.find(t => t.id === aiSuggestion?.suggested_task_id)?.title || ""}
        reasoning={aiSuggestion?.reasoning || ""}
        onAccept={handleAcceptSuggestion}
        onDismiss={handleDismissSuggestion}
      />
    </div>
  )
}
