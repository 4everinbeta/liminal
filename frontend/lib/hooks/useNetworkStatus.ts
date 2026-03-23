'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { flushOfflineQueue } from '@/lib/offlineQueue'

export function useNetworkStatus() {
  const setIsOnline = useAppStore((s) => s.setIsOnline)

  useEffect(() => {
    let cleanup: (() => void) | null = null

    async function init() {
      try {
        // Dynamic import to avoid SSR issues — Capacitor plugins are browser-only
        const { Network } = await import('@capacitor/network')

        const status = await Network.getStatus()
        setIsOnline(status.connected)

        const handle = await Network.addListener('networkStatusChange', async (status) => {
          setIsOnline(status.connected)

          // Flush queue on reconnect
          if (status.connected) {
            const { replayMutation } = await import('@/lib/api')
            await flushOfflineQueue(replayMutation)
          }
        })

        cleanup = () => { handle.remove() }
      } catch {
        // Capacitor not available (running in regular browser) — fall back to browser events
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        setIsOnline(navigator.onLine)

        cleanup = () => {
          window.removeEventListener('online', handleOnline)
          window.removeEventListener('offline', handleOffline)
        }
      }
    }

    init()
    return () => { cleanup?.() }
  }, [setIsOnline])
}
