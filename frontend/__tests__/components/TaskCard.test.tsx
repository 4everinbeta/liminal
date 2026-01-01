import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskCard from '@/components/TaskCard';

describe('TaskCard Component', () => {
  const mockTask = {
    id: '1',
    title: 'Test Task',
    priority_score: 90,
    estimatedTime: 30,
    themeColor: undefined,
  };

  it('should render task title', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should display estimated time when provided', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('e:30')).toBeInTheDocument();
  });

  it('should not display estimated time when not provided', () => {
    const taskWithoutTime = { ...mockTask, estimatedTime: undefined };
    render(<TaskCard task={taskWithoutTime} />);
    expect(screen.queryByText(/e:/)).not.toBeInTheDocument();
  });

  it('should apply high priority styling', () => {
    const { container } = render(<TaskCard task={mockTask} />);
    // Find the motion.div which is the card root element
    const card = container.querySelector('.border-l-red-400');
    expect(card).toBeInTheDocument();
  });

  it('should apply medium priority styling', () => {
    const mediumTask = { ...mockTask, priority_score: 60 };
    const { container } = render(<TaskCard task={mediumTask} />);
    const card = container.querySelector('.border-l-yellow-400');
    expect(card).toBeInTheDocument();
  });

  it('should apply low priority styling', () => {
    const lowTask = { ...mockTask, priority_score: 30 };
    const { container } = render(<TaskCard task={lowTask} />);
    const card = container.querySelector('.border-l-blue-400');
    expect(card).toBeInTheDocument();
  });

  it('should render checkbox button', () => {
    render(<TaskCard task={mockTask} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should have hover effects on card', () => {
    const { container } = render(<TaskCard task={mockTask} />);
    // Check that the card has hover:shadow-md class
    const card = container.querySelector('.hover\\:shadow-md');
    expect(card).toBeInTheDocument();
  });
});
