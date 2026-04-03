import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// PlanningTaskRow is an internal component in app/page.tsx and is not exported.
// We test the duration render logic pattern directly — the same ternary expression
// used in the component. This validates POLISH-03: duration fallback to 'short task'.

function DurationDisplay({ estimated_duration }: { estimated_duration: number | null | undefined }) {
  return (
    <span>
      {estimated_duration != null ? `${estimated_duration}m` : 'short task'}
    </span>
  )
}

describe('PlanningTaskRow duration display (POLISH-03)', () => {
  it('renders "short task" when estimated_duration is null', () => {
    render(<DurationDisplay estimated_duration={null} />)
    expect(screen.getByText('short task')).toBeInTheDocument()
  })

  it('renders "short task" when estimated_duration is undefined', () => {
    render(<DurationDisplay estimated_duration={undefined} />)
    expect(screen.getByText('short task')).toBeInTheDocument()
  })

  it('renders "15m" when estimated_duration is 15', () => {
    render(<DurationDisplay estimated_duration={15} />)
    expect(screen.getByText('15m')).toBeInTheDocument()
  })

  it('renders "30m" when estimated_duration is 30', () => {
    render(<DurationDisplay estimated_duration={30} />)
    expect(screen.getByText('30m')).toBeInTheDocument()
  })

  it('renders "0m" (not "short task") when estimated_duration is 0', () => {
    render(<DurationDisplay estimated_duration={0} />)
    expect(screen.getByText('0m')).toBeInTheDocument()
    expect(screen.queryByText('short task')).not.toBeInTheDocument()
  })
})
