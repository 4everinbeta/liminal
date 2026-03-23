'use client'

import { useAppStore } from '@/lib/store'

/**
 * Amber banner shown when the app is offline.
 * Appears below the top safe area inset, above page content.
 *
 * NOTE: This is a stub — the full implementation with Framer Motion
 * AnimatePresence slide animation is provided by plan 07-02.
 * This stub allows plan 07-03 (layout) to compile and render while
 * 07-02 executes in parallel.
 */
export function OfflineBanner() {
  const isOnline = useAppStore((s) => s.isOnline)

  if (isOnline) return null

  return (
    <div
      className="fixed left-0 right-0 z-50 flex items-center justify-center h-9 text-sm"
      style={{
        top: 'env(safe-area-inset-top, 0px)',
        backgroundColor: '#FFFBEB',
        color: '#B45309',
      }}
    >
      You&apos;re offline. Changes will sync when reconnected.
    </div>
  )
}
