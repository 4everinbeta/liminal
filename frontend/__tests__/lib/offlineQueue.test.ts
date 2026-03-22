import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  offlineQueueDB,
  enqueueOfflineMutation,
  flushOfflineQueue,
  type QueuedMutation,
} from '@/lib/offlineQueue'

beforeEach(async () => {
  // Clear the mutations table before each test
  await offlineQueueDB.mutations.clear()
})

describe('enqueueOfflineMutation', () => {
  it('Test 1: adds a mutation to the queue with auto-incremented id, timestamp, and retries=0', async () => {
    const before = Date.now()
    await enqueueOfflineMutation({ type: 'createTask', payload: { title: 'Buy milk' } })
    const after = Date.now()

    const all = await offlineQueueDB.mutations.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBeDefined()
    expect(all[0].type).toBe('createTask')
    expect(all[0].payload).toEqual({ title: 'Buy milk' })
    expect(all[0].retries).toBe(0)
    expect(all[0].timestamp).toBeGreaterThanOrEqual(before)
    expect(all[0].timestamp).toBeLessThanOrEqual(after)
  })
})

describe('flushOfflineQueue', () => {
  it('Test 2: replays mutations in timestamp order (oldest first)', async () => {
    // Insert with explicit timestamps to control ordering
    await offlineQueueDB.mutations.add({ type: 'updateTask', taskId: 'b', payload: {}, timestamp: 200, retries: 0 })
    await offlineQueueDB.mutations.add({ type: 'createTask', payload: {}, timestamp: 100, retries: 0 })
    await offlineQueueDB.mutations.add({ type: 'deleteTask', taskId: 'c', payload: {}, timestamp: 300, retries: 0 })

    const order: number[] = []
    await flushOfflineQueue(async (mutation) => {
      order.push(mutation.timestamp)
    })

    expect(order).toEqual([100, 200, 300])
  })

  it('Test 3: deletes mutation from queue after successful replay', async () => {
    await enqueueOfflineMutation({ type: 'createTask', payload: { title: 'Task A' } })
    expect(await offlineQueueDB.mutations.count()).toBe(1)

    await flushOfflineQueue(async (_mutation) => {
      // success — no error thrown
    })

    expect(await offlineQueueDB.mutations.count()).toBe(0)
  })

  it('Test 4: increments retry count on failed replay and does not delete the mutation', async () => {
    await enqueueOfflineMutation({ type: 'updateTask', taskId: 'task-1', payload: { status: 'done' } })

    await flushOfflineQueue(async (_mutation) => {
      throw new Error('Network error')
    })

    const all = await offlineQueueDB.mutations.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].retries).toBe(1)
  })

  it('Test 5: processes all mutations even if one fails mid-queue', async () => {
    await offlineQueueDB.mutations.add({ type: 'createTask', payload: { title: 'A' }, timestamp: 100, retries: 0 })
    await offlineQueueDB.mutations.add({ type: 'updateTask', taskId: 'x', payload: {}, timestamp: 200, retries: 0 })
    await offlineQueueDB.mutations.add({ type: 'deleteTask', taskId: 'y', payload: {}, timestamp: 300, retries: 0 })

    const processed: number[] = []
    await flushOfflineQueue(async (mutation) => {
      processed.push(mutation.timestamp)
      if (mutation.timestamp === 200) throw new Error('mid-queue failure')
    })

    // All 3 should have been attempted
    expect(processed).toEqual([100, 200, 300])

    // Only the failed one should remain
    const remaining = await offlineQueueDB.mutations.toArray()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].timestamp).toBe(200)
    expect(remaining[0].retries).toBe(1)
  })
})
