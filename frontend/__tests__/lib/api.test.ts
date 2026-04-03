import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseQuickCapture, restoreTask, replayMutation } from '@/lib/api';
import * as offlineQueue from '@/lib/offlineQueue'
import * as apiModule from '@/lib/api'

describe('API Library', () => {
  describe('parseQuickCapture', () => {
    it('should parse simple task title', () => {
      const result = parseQuickCapture('Buy milk');
      expect(result).toEqual({
        title: 'Buy milk',
        priority: 'medium',
        priority_score: 50,
        status: 'backlog',
        value_score: 50,
        estimated_duration: 30, // Default from smartDefaults
        effort_score: 30, // Default from smartDefaults
        description: undefined,
        notes: undefined,
        start_date: undefined,
        due_date: undefined,
        start_date_natural: undefined,
        due_date_natural: undefined,
        theme_id: undefined,
        initiative_id: undefined,
      });
    });

    it('should parse high priority', () => {
      const result = parseQuickCapture('Buy milk !high');
      expect(result.priority).toBe('high');
      expect(result.priority_score).toBeGreaterThan(60);
      expect(result.title).toBe('Buy milk');
    });

    it('should parse low priority', () => {
      const result = parseQuickCapture('Chill !low');
      expect(result.priority).toBe('low');
      expect(result.title).toBe('Chill');
    });

    it('should parse duration in minutes (m)', () => {
      const result = parseQuickCapture('Meeting 30m');
      expect(result.estimated_duration).toBe(30);
      expect(result.effort_score).toBe(30);
      expect(result.title).toBe('Meeting');
    });

    it('should parse duration in hours (h)', () => {
      const result = parseQuickCapture('Deep work 2h');
      expect(result.estimated_duration).toBe(120);
      expect(result.effort_score).toBe(120);
      expect(result.title).toBe('Deep work');
    });

    it('should parse duration with explicit e: prefix', () => {
      const result = parseQuickCapture('Task e:45m');
      expect(result.estimated_duration).toBe(45);
      expect(result.effort_score).toBe(45);
      expect(result.title).toBe('Task');
    });

    it('should parse value score (v:)', () => {
      const result = parseQuickCapture('Big project v:90');
      expect(result.value_score).toBe(90);
      expect(result.title).toBe('Big project');
    });

    it('should clamp value score between 1 and 100', () => {
      const result = parseQuickCapture('Overload v:999');
      expect(result.value_score).toBe(100);

      const resultLow = parseQuickCapture('Low v:0');
      expect(resultLow.value_score).toBe(1);
    });

    it('should parse all metadata together', () => {
      const result = parseQuickCapture('Complex task v:80 e:1.5h !high');
      expect(result.title).toBe('Complex task');
      expect(result.value_score).toBe(80);
      expect(result.estimated_duration).toBe(90); // 1.5 * 60
      expect(result.effort_score).toBe(90);
      expect(result.priority).toBe('high');
    });

    it('should be case insensitive', () => {
      const result = parseQuickCapture('TASK V:50 E:20M !HIGH');
      expect(result.title).toBe('TASK');
      expect(result.value_score).toBe(50);
      expect(result.estimated_duration).toBe(20);
      expect(result.effort_score).toBe(20);
      expect(result.priority).toBe('high');
    });
  });
});

describe('restoreTask offline', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.spyOn(offlineQueue, 'enqueueOfflineMutation').mockResolvedValue()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('enqueues mutation when offline', async () => {
    // Mock navigator.onLine = false via registerOnlineChecker
    apiModule.registerOnlineChecker(() => false)

    await restoreTask('task-1')

    expect(offlineQueue.enqueueOfflineMutation).toHaveBeenCalledWith({
      type: 'restoreTask',
      taskId: 'task-1',
      payload: {},
    })

    // Reset online checker to default
    apiModule.registerOnlineChecker(() => true)
  })

  it('returns optimistic stub when offline', async () => {
    apiModule.registerOnlineChecker(() => false)

    const result = await restoreTask('task-1')

    expect(result).toMatchObject({ id: 'task-1' })

    apiModule.registerOnlineChecker(() => true)
  })
})

describe('replayMutation restoreTask', () => {
  beforeEach(() => {
    // Set a fake token so fetchWithAuth doesn't block the request
    localStorage.setItem('liminal_token', 'test-token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'task-1', title: 'Test', status: 'todo', priority: 'medium', value_score: 50, order: 0, user_id: 'user-1', created_at: '' }),
    }))
  })

  afterEach(() => {
    localStorage.removeItem('liminal_token')
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('replays restoreTask by POSTing to restore endpoint', async () => {
    await replayMutation({
      type: 'restoreTask',
      taskId: 'task-1',
      payload: {},
      timestamp: 0,
      retries: 0,
    })

    const fetchMock = vi.mocked(fetch)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/tasks/task-1/restore')
    expect((options as RequestInit).method).toBe('POST')
  })
})
