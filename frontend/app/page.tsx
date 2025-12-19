'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import FocusToggle from '@/components/FocusToggle'
import TaskCard from '@/components/TaskCard'
import Pomodoro from '@/components/Pomodoro'
import ChatInterface from '@/components/ChatInterface'
import TaskForm from '@/components/TaskForm'
import { motion, AnimatePresence } from 'framer-motion'
import { getTasks, updateTask, deleteTask, Task } from '@/lib/api'
import { logout } from '@/lib/auth'
import { Layout, CheckCircle, PauseCircle, LogOut } from 'lucide-react'

export default function Home() {
  const { isFocusMode, activeTaskId, setActiveTaskId } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const fetchTasks = async () => {
    setIsLoading(true)
    try {
      const fetchedTasks = await getTasks()
      
      // Sort Logic:
      // 1. Priority (high > medium > low)
      // 2. Value Score (desc)
      // 3. Duration (asc) - Quick wins
      const priorityMap = { high: 3, medium: 2, low: 1 }
      
      const sorted = fetchedTasks
        .filter(t => t.status !== 'done') // Show backlog/todo/in_progress
        .sort((a, b) => {
          const pA = priorityMap[a.priority] || 0
          const pB = priorityMap[b.priority] || 0
          if (pA !== pB) return pB - pA // Higher priority first
          if (a.value_score !== b.value_score) return b.value_score - a.value_score // Higher value first
          return (a.estimated_duration || 0) - (b.estimated_duration || 0) // Shorter duration first
        })

      setTasks(sorted)
      
      // Auto-select active task if none set
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

  // Sync active task if tasks change (e.g. initial load)
  useEffect(() => {
    if (!activeTaskId && tasks.length > 0) {
      setActiveTaskId(tasks[0].id)
    }
  }, [tasks, activeTaskId, setActiveTaskId])

  const activeTask = tasks.find(t => t.id === activeTaskId) || tasks[0]

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTask(taskId, { status: 'done' })
      
      // Optimistic update
      const remaining = tasks.filter(t => t.id !== taskId)
      setTasks(remaining)
      
      // Auto-advance if active task was completed
      if (activeTaskId === taskId) {
        setActiveTaskId(remaining.length > 0 ? remaining[0].id : null)
      }
    } catch (err) {
      console.error('Complete failed', err)
      fetchTasks() // Revert on error
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await deleteTask(taskId)
      const remaining = tasks.filter(t => t.id !== taskId)
      setTasks(remaining)
      if (activeTaskId === taskId) {
        setActiveTaskId(remaining.length > 0 ? remaining[0].id : null)
      }
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  const handlePauseTask = () => {
    // Just simple logic for now: maybe move it down the list?
    // For now, we'll just keep it but stop the timer (handled by Pomodoro component internally usually)
    // Or we could shuffle it. Let's just do nothing visually but log it.
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Liminal Horizon</h1>
          <p className="text-gray-500 text-sm">Your single pane of glass for clarity.</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/board"
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 hover:text-primary border border-gray-200 hover:border-primary/20 rounded-full font-medium transition-all shadow-sm"
          >
            <Layout size={16} />
            <span className="text-sm">Board View</span>
          </a>
          <FocusToggle />
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full font-medium shadow-sm hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            <LogOut size={16} />
            <span className="text-sm">{isLoggingOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {isFocusMode ? (
          <motion.main
            key="focus"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col items-center justify-center py-12 gap-8"
          >
            {activeTask ? (
              <div className="w-full max-w-2xl space-y-8">
                <div className="text-center space-y-2">
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
                    Current Focus
                  </span>
                  <h2 className="text-4xl font-bold text-gray-900 leading-tight">
                    {activeTask.title}
                  </h2>
                  {activeTask.estimated_duration && (
                    <p className="text-gray-500 text-lg">
                      Est. {activeTask.estimated_duration}m
                    </p>
                  )}
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center gap-6">
                  <Pomodoro />
                  
                  <div className="flex gap-4 w-full">
                    <button
                      onClick={() => handleCompleteTask(activeTask.id)}
                      className="flex-1 py-4 bg-green-50 text-green-700 hover:bg-green-100 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors text-lg"
                    >
                      <CheckCircle size={24} />
                      Complete Task
                    </button>
                    <button
                      onClick={handlePauseTask}
                      className="flex-1 py-4 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors text-lg"
                    >
                      <PauseCircle size={24} />
                      Pause
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p className="text-xl">All clear! No tasks remaining.</p>
                <button onClick={() => fetchTasks()} className="mt-4 text-primary underline">
                  Refresh List
                </button>
              </div>
            )}
          </motion.main>
        ) : (
          <motion.main
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid lg:grid-cols-12 gap-8"
          >
            {/* Left Column: Top Tasks */}
            <section className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-2 h-8 bg-primary rounded-full"></span>
                  Top Priorities
                </h2>
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {tasks.length} Active
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              ) : tasks.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400">
                  <p>Your horizon is clear.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={{
                          id: task.id,
                          title: task.title,
                          priority_score: task.priority_score,
                          estimatedTime: task.estimated_duration
                        }}
                        onComplete={handleCompleteTask}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>

            {/* Right Column: Chat & Create */}
            <aside className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Assistant</h3>
                <ChatInterface onTaskCreated={fetchTasks} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Quick Add</h3>
                <TaskForm onTaskCreated={fetchTasks} />
              </div>
            </aside>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  )
}
