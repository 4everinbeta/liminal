import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePomodoro } from '@/lib/hooks/usePomodoro';
import { useAppStore } from '@/lib/store';

describe('usePomodoro Hook', () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState({
      timerStatus: 'idle',
      timeLeft: 25 * 60,
      timerDuration: 25 * 60,
      sessionType: 'work',
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default duration when no task duration is provided', () => {
    const { result } = renderHook(() => usePomodoro(null));
    expect(result.current.timeLeft).toBe(20 * 60);
  });

  it('should adapt duration based on task estimated_duration (capped at 60m)', () => {
    const { result } = renderHook(() => usePomodoro(45));
    expect(result.current.timeLeft).toBe(45 * 60);

    const { result: resultCapped } = renderHook(() => usePomodoro(90));
    expect(resultCapped.current.timeLeft).toBe(60 * 60);
  });

  it('should start, pause, and reset the timer', () => {
    const { result } = renderHook(() => usePomodoro(20));
    
    act(() => {
      result.current.toggleTimer();
    });
    expect(result.current.timerStatus).toBe('running');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.timeLeft).toBe(20 * 60 - 1);

    act(() => {
      result.current.toggleTimer();
    });
    expect(result.current.timerStatus).toBe('paused');

    act(() => {
      result.current.resetTimer();
    });
    expect(result.current.timerStatus).toBe('idle');
    expect(result.current.timeLeft).toBe(20 * 60);
  });

  it('should transition to break state when timer finishes', () => {
    const { result } = renderHook(() => usePomodoro(1 / 60)); // Exactly 1 second
    
    act(() => {
      result.current.toggleTimer();
    });
    
    // Advance 1s to reach 0
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Advance slightly more to trigger the transition effect
    act(() => {
      vi.advanceTimersByTime(0);
    });
    
    expect(result.current.sessionType).toBe('break');
    expect(result.current.timeLeft).toBe(5 * 60);
    expect(result.current.timerStatus).toBe('idle');
  });
});
