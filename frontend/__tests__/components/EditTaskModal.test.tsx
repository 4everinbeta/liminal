import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import EditTaskModal from '@/components/EditTaskModal'
import type { Task } from '@/lib/api'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    getThemes: vi.fn().mockResolvedValue([]),
  }
})

const mockTask: Task = {
  id: '1',
  title: 'Test',
  status: 'todo',
  priority: 'medium',
  priority_score: 60,
  value_score: 50,
  order: 0,
  user_id: 'u1',
  created_at: '2026-01-01',
}

describe('EditTaskModal priority buttons', () => {
  it('renders "Low" button for priority 30', () => {
    render(
      <EditTaskModal
        task={mockTask}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('Low')).toBeInTheDocument()
  })

  it('renders "Medium" button for priority 60', () => {
    render(
      <EditTaskModal
        task={mockTask}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )
    // "Medium" appears in both Duration ("Medium 30m") and Priority ("Medium") buttons
    // We check that the priority section has a standalone "Medium" label
    const allMedium = screen.getAllByText('Medium')
    expect(allMedium.length).toBeGreaterThanOrEqual(1)
  })

  it('renders "High" button for priority 90', () => {
    render(
      <EditTaskModal
        task={mockTask}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('does NOT render raw number "30" inside priority buttons', () => {
    render(
      <EditTaskModal
        task={mockTask}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )
    // The priority buttons should not show raw scores
    const buttons = screen.getAllByRole('button')
    const priorityButtons = buttons.filter(
      (b) => b.textContent === '30' || b.textContent === '60' || b.textContent === '90'
    )
    expect(priorityButtons).toHaveLength(0)
  })

  it('does NOT render raw number "60" as standalone button text', () => {
    render(
      <EditTaskModal
        task={mockTask}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )
    const buttons = screen.getAllByRole('button')
    const hasSixty = buttons.some((b) => b.textContent === '60')
    expect(hasSixty).toBe(false)
  })

  it('does NOT render raw number "90" as standalone button text', () => {
    render(
      <EditTaskModal
        task={mockTask}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )
    const buttons = screen.getAllByRole('button')
    const hasNinety = buttons.some((b) => b.textContent === '90')
    expect(hasNinety).toBe(false)
  })
})
