import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomTabBar } from '@/components/BottomTabBar'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock Zustand store
const mockOpenQuickCapture = vi.fn()
vi.mock('@/lib/store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      openQuickCapture: mockOpenQuickCapture,
    }
    return selector(state)
  }),
}))

describe('BottomTabBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders 4 tab items: Today, Board, center Plus button, and More', () => {
    render(<BottomTabBar />)
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Board')).toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
    // Center Plus button has no label text, verified by aria-label
    expect(screen.getByRole('button', { name: 'Capture Task' })).toBeInTheDocument()
  })

  it('center Plus button has aria-label="Capture Task"', () => {
    render(<BottomTabBar />)
    const captureButton = screen.getByRole('button', { name: 'Capture Task' })
    expect(captureButton).toHaveAttribute('aria-label', 'Capture Task')
  })

  it('clicking center Plus button calls openQuickCapture from store', async () => {
    const user = userEvent.setup()
    render(<BottomTabBar />)
    const captureButton = screen.getByRole('button', { name: 'Capture Task' })
    await user.click(captureButton)
    expect(mockOpenQuickCapture).toHaveBeenCalledTimes(1)
  })

  it('active route highlights the corresponding tab with accent color', async () => {
    const { usePathname } = await import('next/navigation')
    vi.mocked(usePathname).mockReturnValue('/board')

    render(<BottomTabBar />)

    // Board tab should have accent color style
    const boardText = screen.getByText('Board')
    expect(boardText).toHaveStyle({ color: '#4F46E5' })

    // Today tab should have inactive color style
    const todayText = screen.getByText('Today')
    expect(todayText).toHaveStyle({ color: '#6B7280' })
  })
})
