'use client';

import React, { useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { usePomodoro } from '@/lib/hooks/usePomodoro';
import { Play, Pause, RotateCcw, Timer, Coffee, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { getTasks } from '@/lib/api';

export default function Pomodoro() {
  const { activeTaskId } = useAppStore();
  const [activeTaskDuration, setActiveTaskDuration] = React.useState<number | null>(null);

  // Fetch task duration if activeTaskId changes
  useEffect(() => {
    const fetchDuration = async () => {
      if (activeTaskId) {
        try {
          const tasks = await getTasks();
          const task = tasks.find(t => t.id === activeTaskId);
          if (task) {
            setActiveTaskDuration(task.estimated_duration || null);
          }
        } catch (err) {
          console.error('Failed to fetch task duration', err);
        }
      } else {
        setActiveTaskDuration(null);
      }
    };
    fetchDuration();
  }, [activeTaskId]);

  const {
    timeLeft,
    timerStatus,
    timerDuration,
    sessionType,
    toggleTimer,
    resetTimer,
  } = usePomodoro(activeTaskDuration);

  // Trigger confetti when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && timerStatus === 'idle') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: sessionType === 'work' ? ['#4F46E5', '#818CF8'] : ['#10B981', '#34D399']
      });
    }
  }, [timeLeft, timerStatus, sessionType]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = timerDuration > 0 ? (timeLeft / timerDuration) : 0;
  const strokeDasharray = 2 * Math.PI * 45; // Radius is 45
  const strokeDashoffset = strokeDasharray * (1 - progress);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-primary/10 flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className={`absolute top-0 right-0 p-2 opacity-5 transition-colors ${sessionType === 'break' ? 'text-green-500' : 'text-primary'}`}>
        {sessionType === 'break' ? <Coffee size={120} /> : <Timer size={120} />}
      </div>

      <div className="flex items-center gap-2 text-primary/80 uppercase tracking-widest text-xs font-bold z-10">
        {sessionType === 'break' ? (
          <div className="flex items-center gap-2 text-green-600">
            <Coffee size={14} />
            <span>Break Time</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-primary">
            <Zap size={14} />
            <span>Focus Session</span>
          </div>
        )}
      </div>
      
      {/* Progress Circle */}
      <div className="relative flex items-center justify-center w-48 h-48 z-10">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="96"
            cy="96"
            r="80"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-100"
          />
          {/* Progress circle */}
          <motion.circle
            cx="96"
            cy="96"
            r="80"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 80}
            initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 80 * (1 - progress) }}
            transition={{ duration: 0.5, ease: "linear" }}
            className={sessionType === 'break' ? 'text-green-500' : 'text-primary'}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-mono font-bold tracking-tighter text-gray-800 tabular-nums">
            {formatTime(timeLeft)}
          </div>
          <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
            remaining
          </div>
        </div>
      </div>

      <div className="flex gap-4 z-10">
        <button 
          onClick={toggleTimer}
          aria-label={timerStatus === 'running' ? 'Pause' : 'Play'}
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
          className="p-4 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
          title="Reset"
          aria-label="Reset"
        >
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  );
}
