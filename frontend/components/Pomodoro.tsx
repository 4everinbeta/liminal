'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Play, Pause, RotateCcw, Timer } from 'lucide-react'

export default function Pomodoro() {
  const { 
    timerStatus, timeLeft, setTimeLeft, setTimerStatus, resetTimer 
  } = useAppStore()

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerStatus === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setTimerStatus('idle')
    }
    return () => clearInterval(interval)
  }, [timerStatus, timeLeft, setTimeLeft, setTimerStatus])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const toggleTimer = () => {
    if (timerStatus === 'running') {
      setTimerStatus('paused')
    } else {
      setTimerStatus('running')
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-primary/10 flex flex-col items-center justify-center space-y-4">
      <div className="flex items-center gap-2 text-primary/80 uppercase tracking-widest text-xs font-bold">
        <Timer size={14} />
        <span>Focus Timer</span>
      </div>
      
      <div className="text-6xl font-mono font-bold tracking-tighter text-gray-800 tabular-nums">
        {formatTime(timeLeft)}
      </div>

      <div className="flex gap-4">
        <button 
          onClick={toggleTimer}
          className={`
            p-4 rounded-full transition-all flex items-center justify-center
            ${timerStatus === 'running' 
              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
              : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30'
            }
          `}
        >
          {timerStatus === 'running' ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
        </button>

        <button 
          onClick={resetTimer}
          className="p-4 rounded-full bg-gray-100 text-muted hover:bg-gray-200 transition-all"
          title="Reset"
        >
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  )
}
