import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTheme, updateTheme, deleteTheme, getThemes } from '@/lib/api'

// Mock fetch globally
const globalFetch = vi.fn()
global.fetch = globalFetch

describe('Theme API', () => {
  beforeEach(() => {
    globalFetch.mockReset()
    // Mock local storage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'fake-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    })
  })

  it('should create a theme with order', async () => {
    const mockTheme = { id: '1', title: 'New Theme', color: '#000', priority: 'medium', order: 5 }
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTheme,
    })

    const result = await createTheme({ title: 'New Theme', color: '#000', priority: 'medium', order: 5 })
    
    expect(globalFetch).toHaveBeenCalledWith(
      expect.stringContaining('/themes'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"order":5'),
      })
    )
    expect(result).toEqual(mockTheme)
  })

  it('should update a theme title and order', async () => {
    const mockTheme = { id: '1', title: 'Updated', order: 2 }
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTheme,
    })

    const result = await updateTheme('1', { title: 'Updated', order: 2 })
    
    expect(globalFetch).toHaveBeenCalledWith(
      expect.stringContaining('/themes/1'),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"title":"Updated"'),
      })
    )
  })

  it('should delete a theme', async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => undefined,
    })

    await deleteTheme('1')
    
    expect(globalFetch).toHaveBeenCalledWith(
      expect.stringContaining('/themes/1'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
