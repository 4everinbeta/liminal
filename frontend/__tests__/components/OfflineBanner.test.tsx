import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OfflineBanner } from '@/components/OfflineBanner'

// Mock Zustand store
vi.mock('@/lib/store', () => ({
  useAppStore: vi.fn(),
}))

// Mock framer-motion AnimatePresence to render children directly
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}))

import { useAppStore } from '@/lib/store'

const mockUseAppStore = useAppStore as unknown as ReturnType<typeof vi.fn>

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the offline banner when isOnline is false', () => {
    mockUseAppStore.mockImplementation((selector: (s: { isOnline: boolean }) => unknown) =>
      selector({ isOnline: false })
    )

    render(<OfflineBanner />)

    expect(
      screen.getByText("You're offline. Changes will sync when reconnected.")
    ).toBeInTheDocument()
  })

  it('does not render the offline banner when isOnline is true', () => {
    mockUseAppStore.mockImplementation((selector: (s: { isOnline: boolean }) => unknown) =>
      selector({ isOnline: true })
    )

    render(<OfflineBanner />)

    expect(
      screen.queryByText("You're offline. Changes will sync when reconnected.")
    ).not.toBeInTheDocument()
  })
})
