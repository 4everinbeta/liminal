import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';

const DEFAULT_FOCUS_MINUTES = 20;
const MAX_FOCUS_MINUTES = 60;
const BREAK_MINUTES = 5;

export function usePomodoro(taskDurationMinutes: number | null | undefined) {
  const {
    timerStatus,
    timeLeft,
    timerDuration,
    sessionType,
    setTimerStatus,
    setTimeLeft,
    setTimerDuration,
    setSessionType,
    resetTimer,
  } = useAppStore();

  const prevTaskDurationRef = useRef<number | null | undefined>(taskDurationMinutes);

  // Initialize duration based on task
  // Only runs when taskDurationMinutes changes or when we are in a fresh 'idle' state for 'work'
  useEffect(() => {
    const shouldInitialize = (timerStatus === 'idle' && sessionType === 'work') || 
                            (prevTaskDurationRef.current !== taskDurationMinutes);
    
    if (shouldInitialize) {
      const minutes = taskDurationMinutes 
        ? Math.min(taskDurationMinutes, MAX_FOCUS_MINUTES)
        : DEFAULT_FOCUS_MINUTES;
      const durationSeconds = Math.floor(minutes * 60);
      
      setTimerDuration(durationSeconds);
      setTimeLeft(durationSeconds);
      setSessionType('work');
      prevTaskDurationRef.current = taskDurationMinutes;
    }
  }, [taskDurationMinutes, timerStatus, sessionType, setTimerDuration, setTimeLeft, setSessionType]);

  // Tick logic
  useEffect(() => {
    if (timerStatus !== 'running') return;

    if (timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft(Math.max(0, timeLeft - 1));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      // Session finished
      if (sessionType === 'work') {
        setSessionType('break');
        const breakSeconds = BREAK_MINUTES * 60;
        setTimerDuration(breakSeconds);
        setTimeLeft(breakSeconds);
        setTimerStatus('idle');
      } else {
        setSessionType('work');
        const minutes = taskDurationMinutes 
          ? Math.min(taskDurationMinutes, MAX_FOCUS_MINUTES)
          : DEFAULT_FOCUS_MINUTES;
        const durationSeconds = Math.floor(minutes * 60);
        setTimerDuration(durationSeconds);
        setTimeLeft(durationSeconds);
        setTimerStatus('idle');
      }
    }
  }, [timerStatus, timeLeft, sessionType, setTimeLeft, setSessionType, setTimerDuration, setTimerStatus, taskDurationMinutes]);

  const toggleTimer = useCallback(() => {
    if (timerStatus === 'running') {
      setTimerStatus('paused');
    } else {
      setTimerStatus('running');
    }
  }, [timerStatus, setTimerStatus]);

  const handleReset = useCallback(() => {
    resetTimer();
    setSessionType('work');
  }, [resetTimer, setSessionType]);

  return {
    timeLeft,
    timerStatus,
    timerDuration,
    sessionType,
    toggleTimer,
    resetTimer: handleReset,
  };
}
