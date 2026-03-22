'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useAppStore } from '@/lib/store'

export function OfflineBanner() {
  const isOnline = useAppStore((s) => s.isOnline)

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -36, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -36, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed left-0 right-0 z-50 flex items-center justify-center gap-2 h-9 text-sm font-normal"
          style={{
            top: 'env(safe-area-inset-top, 0px)',
            backgroundColor: '#FFFBEB',
            color: '#B45309',
          }}
        >
          <WifiOff className="h-4 w-4" />
          <span>You&apos;re offline. Changes will sync when reconnected.</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
