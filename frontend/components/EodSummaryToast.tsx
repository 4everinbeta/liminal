'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GamificationStats } from '@/lib/hooks/useGamificationStats'
import { formatImpactMessage } from '@/lib/gamification'

export function useEodSummaryScheduler(
  isEnabled: boolean,
  stats: GamificationStats
) {
  const [showSummary, setShowSummary] = useState(false)

  useEffect(() => {
    if (!isEnabled) return

    const now = new Date()
    const eodToday = new Date()
    eodToday.setHours(17, 0, 0, 0) // 5pm today

    const msUntilEod = eodToday.getTime() - now.getTime()

    // Already past 5pm today — check if we already showed it today
    if (msUntilEod <= 0) {
      if (typeof window !== 'undefined') {
        const lastShownDate = sessionStorage.getItem('eod-summary-shown-date')
        if (lastShownDate !== now.toDateString()) {
          setShowSummary(true)
        }
      }
      return
    }

    // Schedule for 5pm
    const timeoutId = window.setTimeout(() => {
      setShowSummary(true)
    }, msUntilEod)

    return () => clearTimeout(timeoutId)
  }, [isEnabled])

  const dismissSummary = () => {
    setShowSummary(false)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('eod-summary-shown-date', new Date().toDateString())
    }
  }

  return { showSummary, dismissSummary }
}

interface EodSummaryToastProps {
  stats: GamificationStats
  isVisible: boolean
  onDismiss: () => void
}

export function EodSummaryToast({ stats, isVisible, onDismiss }: EodSummaryToastProps) {
  const isNewBest = stats.currentStreak > 0 && stats.currentStreak === stats.personalBest
  const impactMsg = formatImpactMessage(stats.impactHours)

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
          />
          {/* Toast card */}
          <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 z-50 text-center"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="text-2xl mb-2">
              {isNewBest ? 'New personal best!' : 'Great work today!'}
            </div>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <div>Tasks completed: <strong>{stats.doneToday}</strong></div>
              {impactMsg && <div>{impactMsg}</div>}
              {stats.currentStreak > 0 && (
                <div>
                  Streak: <strong>{stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}</strong>
                  {stats.personalBest > 0 && ` (best: ${stats.personalBest})`}
                </div>
              )}
            </div>
            <button
              onClick={onDismiss}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
