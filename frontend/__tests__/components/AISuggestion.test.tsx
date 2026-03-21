import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AISuggestion } from '@/components/AISuggestion'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const defaultProps = {
  taskTitle: 'Fix login bug',
  reasoning: 'This task is due soon and matches your morning productivity pattern.',
  isVisible: true,
  onAccept: vi.fn(),
  onDismiss: vi.fn(),
  dueDate: '2026-03-25',
  estimatedDuration: 30,
}

describe('AISuggestion', () => {
  it('renders card with task title as text-lg font-bold heading when isVisible=true', () => {
    render(<AISuggestion {...defaultProps} />)
    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Fix login bug')
  })

  it('renders "30 min" and due date when estimatedDuration and dueDate are provided', () => {
    render(<AISuggestion {...defaultProps} />)
    expect(screen.getByText(/30 min/)).toBeInTheDocument()
    // Due date should appear somewhere in the card
    expect(screen.getByText(/Mar 25/)).toBeInTheDocument()
  })

  it('renders nothing when isVisible=false', () => {
    const { container } = render(<AISuggestion {...defaultProps} isVisible={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('calls onAccept exactly once when "Start This Task" button is clicked', async () => {
    const onAccept = vi.fn()
    const user = userEvent.setup()
    render(<AISuggestion {...defaultProps} onAccept={onAccept} />)
    await user.click(screen.getByText('Start This Task'))
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss exactly once when "Not Now" button is clicked', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()
    render(<AISuggestion {...defaultProps} onDismiss={onDismiss} />)
    await user.click(screen.getByText('Not Now'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('contains "AI Suggestion: Do This Now" label text', () => {
    render(<AISuggestion {...defaultProps} />)
    expect(screen.getByText('AI Suggestion: Do This Now')).toBeInTheDocument()
  })

  it('renders without crashing when dueDate and estimatedDuration are undefined', () => {
    const propsWithoutOptional = {
      taskTitle: 'Fix login bug',
      reasoning: 'This task is due soon and matches your morning productivity pattern.',
      isVisible: true,
      onAccept: vi.fn(),
      onDismiss: vi.fn(),
      dueDate: undefined,
      estimatedDuration: undefined,
    }
    expect(() => render(<AISuggestion {...propsWithoutOptional} />)).not.toThrow()
    expect(screen.getByText('Fix login bug')).toBeInTheDocument()
  })
})
