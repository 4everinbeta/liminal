import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuickCapture from '@/components/QuickCapture'
import { useAppStore, INITIAL_CHAT_MESSAGES } from '@/lib/store'

const mockTask = {
  id: '1',
  title: 'Test task',
  status: 'backlog' as const,
  priority: 'medium' as const,
  value_score: 50,
  order: 0,
  user_id: 'test',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    createTask: vi.fn(),
    updateTask: vi.fn(),
    getThemes: vi.fn().mockResolvedValue([]),
    createTheme: vi.fn(),
    chatWithLlm: vi.fn().mockResolvedValue('{"title":"Draft investor update","value_score":90,"estimated_duration":60,"priority":"high"}'),
  }
})

import * as api from '@/lib/api'

describe('QuickCapture chat intake', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.createTask).mockResolvedValue(mockTask)
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear()
    }
    useAppStore.getState().setChatMessages([...INITIAL_CHAT_MESSAGES])
  })

  it('renders the chat input and lets you type', async () => {
    const user = userEvent.setup()
    render(<QuickCapture />)
    const input = screen.getByPlaceholderText(/ask liminal/i)
    await user.type(input, 'Draft investor update')
    expect(input).toHaveValue('Draft investor update')
  })

  it('prepares a draft and creates a task on confirm', async () => {
    const user = userEvent.setup()
    render(<QuickCapture />)
    const input = screen.getByPlaceholderText(/ask liminal/i)

    await user.type(input, 'Update roadmap v:90 e:60m !high')
    await user.keyboard('{Enter}')

    const confirmButton = await screen.findByRole('button', { name: /create task/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(api.createTask).toHaveBeenCalled()
    })

    const payload = vi.mocked(api.createTask).mock.calls[0][0]
    expect(payload.title).toBe('Update roadmap')
    expect(payload.value_score).toBe(90)
    expect(payload.estimated_duration).toBe(60)
    expect(payload.priority).toBe('high')
  })

  it('applies quick button tweaks before confirm', async () => {
    const user = userEvent.setup()
    render(<QuickCapture />)
    const input = screen.getByPlaceholderText(/ask liminal/i)
    await user.type(input, 'Create task Refine me{Enter}')

    const valueButton = await screen.findByTestId('value-80')
    await user.click(valueButton)
    const effortButton = await screen.findByTestId('effort-50')
    await user.click(effortButton)

    const confirmButton = await screen.findByRole('button', { name: /create task/i })
    await user.click(confirmButton)

    const payload = vi.mocked(api.createTask).mock.calls[0][0]
    expect(payload.value_score).toBe(80)
    expect(payload.effort_score).toBe(50)
  })
})
