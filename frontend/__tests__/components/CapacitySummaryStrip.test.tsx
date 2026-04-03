import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import CapacitySummaryStrip from '@/components/CapacitySummaryStrip'
import type { Task } from '@/lib/api'

// Helper to build a minimal Task object
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    status: 'todo',
    priority: 'medium',
    value_score: 50,
    order: 0,
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    ...overrides,
  } as Task
}

describe('CapacitySummaryStrip', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders hours remaining and task count when today tasks exist', () => {
    // Mock Date to a time during the workday (9am = 9.0 → hoursRemaining = 17 - 9 = 8)
    const mockDate = new Date()
    mockDate.setHours(9, 0, 0, 0)
    vi.setSystemTime(mockDate)

    const todayStr = mockDate.toISOString().split('T')[0]
    const tasks: Task[] = [
      makeTask({ id: 'task-1', due_date: todayStr, estimated_duration: 60 }),
      makeTask({ id: 'task-2', due_date: todayStr, estimated_duration: 60 }),
    ]

    render(<CapacitySummaryStrip tasks={tasks} />)

    // Should render hours left text
    expect(screen.getByText(/h left/)).toBeInTheDocument()
    // Should render tasks fit text
    expect(screen.getByText(/tasks fit/)).toBeInTheDocument()
  })

  it('renders in empty state with no today tasks (shows h left)', () => {
    // Mock Date to a time during the workday (10am)
    const mockDate = new Date()
    mockDate.setHours(10, 0, 0, 0)
    vi.setSystemTime(mockDate)

    const tasks: Task[] = []

    render(<CapacitySummaryStrip tasks={tasks} />)

    // Strip should still render with hours remaining
    expect(screen.getByText(/h left/)).toBeInTheDocument()
    // No tasks fit text when no today tasks
    expect(screen.queryByText(/tasks fit/)).not.toBeInTheDocument()
  })

  it('renders workday ended when after 5pm (isAfterWork)', () => {
    // Mock Date to 18:00 (6pm) — after 5pm workday
    const mockDate = new Date()
    mockDate.setHours(18, 0, 0, 0)
    vi.setSystemTime(mockDate)

    render(<CapacitySummaryStrip tasks={[]} />)

    expect(screen.getByText('Workday ended')).toBeInTheDocument()
  })
})
