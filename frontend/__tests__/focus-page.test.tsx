import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FocusPage from '@/app/focus/page';
import { useAppStore } from '@/lib/store';
import { getTasks } from '@/lib/api';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock API
vi.mock('@/lib/api', () => ({
  getTasks: vi.fn(),
  updateTask: vi.fn(),
}));

// Mock NoisePlayer to avoid Web Audio API issues in integration tests
vi.mock('@/components/NoisePlayer', () => ({
  default: () => <div data-testid="noise-player">Noise Player</div>,
}));

describe('FocusPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ activeTaskId: null });
  });

  it('should render the noise player on the focus page', async () => {
    (getTasks as any).mockResolvedValue([
      { id: '1', title: 'Test Task', status: 'todo', priority: 'medium' },
    ]);

    render(<FocusPage />);

    await waitFor(() => {
      expect(screen.getByTestId('noise-player')).toBeInTheDocument();
    });
  });
});
