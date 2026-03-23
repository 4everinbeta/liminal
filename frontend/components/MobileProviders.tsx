'use client'

import { useEffect } from 'react'
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus'
import { registerOnlineChecker } from '@/lib/api'
import { useAppStore } from '@/lib/store'

export function MobileProviders() {
  useNetworkStatus()

  useEffect(() => {
    registerOnlineChecker(() => useAppStore.getState().isOnline)
  }, [])

  return null
}
