import Dexie, { type Table } from 'dexie'

export type MutationType = 'createTask' | 'updateTask' | 'deleteTask' | 'completeTask' | 'restoreTask'

export interface QueuedMutation {
  id?: number
  type: MutationType
  taskId?: string
  payload: Record<string, unknown>
  timestamp: number
  retries: number
}

export class OfflineQueueDB extends Dexie {
  mutations!: Table<QueuedMutation>

  constructor() {
    super('liminal-offline-queue')
    this.version(1).stores({
      mutations: '++id, type, timestamp',
    })
  }
}

export const offlineQueueDB = new OfflineQueueDB()

export async function enqueueOfflineMutation(
  mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retries'>
): Promise<void> {
  await offlineQueueDB.mutations.add({
    ...mutation,
    timestamp: Date.now(),
    retries: 0,
  })
}

export async function flushOfflineQueue(
  replayFn: (mutation: QueuedMutation) => Promise<void>
): Promise<void> {
  const queued = await offlineQueueDB.mutations.orderBy('timestamp').toArray()
  for (const mutation of queued) {
    try {
      await replayFn(mutation)
      await offlineQueueDB.mutations.delete(mutation.id!)
    } catch {
      await offlineQueueDB.mutations.update(mutation.id!, {
        retries: mutation.retries + 1,
      })
    }
  }
}

export async function getQueueLength(): Promise<number> {
  return offlineQueueDB.mutations.count()
}
