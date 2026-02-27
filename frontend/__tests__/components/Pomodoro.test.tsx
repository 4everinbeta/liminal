import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Pomodoro from '@/components/Pomodoro';
import { useAppStore } from '@/lib/store';
import { getTasks } from '@/lib/api';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

// Mock API
vi.mock('@/lib/api', () => ({
  getTasks: vi.fn(),
}));

describe('Pomodoro Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      timerStatus: 'idle',
      timeLeft: 25 * 60,
      timerDuration: 25 * 60,
      sessionType: 'work',
      activeTaskId: '1',
    });
    (getTasks as any).mockResolvedValue([
      { id: '1', title: 'Test Task', estimated_duration: 25 },
    ]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render the timer with task-based duration', async () => {
    vi.useRealTimers();
    // Mock getTasks to return a task with 45m duration
    (getTasks as any).mockResolvedValue([
      { id: '1', title: 'Test Task', estimated_duration: 45 },
    ]);
    
    render(<Pomodoro />);
    
    await waitFor(() => {
      expect(screen.getByText('45:00')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should toggle the timer when clicking the play button', () => {
    render(<Pomodoro />);
    const playButton = screen.getByRole('button', { name: /play/i });
    
    fireEvent.click(playButton);
    expect(useAppStore.getState().timerStatus).toBe('running');
    
    // Icon should change to pause (or button style changes)
    // In our case we check the store status
  });

  it('should show break label when in break session', () => {
    useAppStore.setState({ sessionType: 'break', timerDuration: 5 * 60, timeLeft: 5 * 60 });
    render(<Pomodoro />);
    expect(screen.getByText(/break/i)).toBeInTheDocument();
  });
});
