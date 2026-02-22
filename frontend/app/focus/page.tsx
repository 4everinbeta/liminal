'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, PauseCircle } from 'lucide-react'
import Pomodoro from '@/components/Pomodoro'
import NoisePlayer from '@/components/NoisePlayer'
import { useAppStore } from '@/lib/store'
import { getTasks, updateTask, Task } from '@/lib/api'

export default function FocusPage() {
  const router = useRouter()
  const { 
    activeTaskId, 
    setActiveTaskId, 
    setLastCompletedTask 
  } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTasks = async () => {
    setIsLoading(true)
    try {
      const fetched = await getTasks()
      const filtered = fetched.filter((task) => task.status !== 'done')
      setTasks(filtered)
      if (!activeTaskId && filtered.length > 0) {
        setActiveTaskId(filtered[0].id)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeTask = useMemo(() => {
    if (!tasks.length) return undefined
    return tasks.find((task) => task.id === activeTaskId) || tasks[0]
  }, [tasks, activeTaskId])

  const handleCompleteTask = async () => {
    if (!activeTask) return
    try {
      await updateTask(activeTask.id, { status: 'done' })
      setLastCompletedTask({ ...activeTask })
      // Clear after 30 seconds
      setTimeout(() => {
        setLastCompletedTask(null)
      }, 30000)
      fetchTasks()
    } catch (err) {
      console.error('Complete failed', err)
    }
  }

  const handlePause = async () => {
    if (!activeTask) return
    try {
      await updateTask(activeTask.id, { status: 'paused' })
      fetchTasks()
    } catch (err) {
      console.error('Pause failed', err)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <header className="flex items-center justify-end mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-primary/70">deep work</p>
      </header>

      <div className="bg-white border border-gray-100 rounded-3xl shadow-lg p-8 space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Current focus</p>
          <h1 className="text-3xl font-bold text-gray-900">
            {isLoading ? 'Loading tasks…' : activeTask?.title || 'Select a task to focus'}
          </h1>
          {activeTask?.estimated_duration && (
            <p className="text-gray-500">
              Estimated {activeTask.estimated_duration} minutes • Priority {activeTask.priority}
            </p>
          )}
        </div>

        {activeTask ? (
          <>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-2xl p-6">
                    <Pomodoro />
                </div>
                <div className="flex flex-col justify-center">
                    <NoisePlayer />
                </div>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleCompleteTask}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <CheckCircle size={18} />
                Complete task
              </button>
              <button
                onClick={handlePause}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <PauseCircle size={18} />
                Pause
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-sm">
            You’re caught up! Head back to the board to pick your next focus.
          </p>
        )}
      </div>
    </div>
  )
}