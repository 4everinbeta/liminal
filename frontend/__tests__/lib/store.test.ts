import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/lib/store';

describe('App Store', () => {
  beforeEach(() => {
    // We can't easily reset the persisted store in tests without more setup
    // but we can at least reset the specific fields we changed
    useAppStore.setState({
      timerStatus: 'idle',
      sessionType: 'work',
      timeLeft: 25 * 60,
    });
  });

  it('should have sessionType initialized to work', () => {
    const state = useAppStore.getState();
    expect(state.sessionType).toBe('work');
  });

  it('should update sessionType', () => {
    useAppStore.getState().setSessionType('break');
    expect(useAppStore.getState().sessionType).toBe('break');
  });

  it('should update timerStatus', () => {
    useAppStore.getState().setTimerStatus('running');
    expect(useAppStore.getState().timerStatus).toBe('running');
  });

  it('should update timeLeft', () => {
    useAppStore.getState().setTimeLeft(100);
    expect(useAppStore.getState().timeLeft).toBe(100);
  });

  it('should reset timer', () => {
    useAppStore.setState({
      timerStatus: 'running',
      timeLeft: 10,
      timerDuration: 1200,
    });
    
    useAppStore.getState().resetTimer();
    
    const state = useAppStore.getState();
    expect(state.timerStatus).toBe('idle');
    expect(state.timeLeft).toBe(1200);
  });
});
