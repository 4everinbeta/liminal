'use client'
import { useSpring, useTransform, useMotionValue, motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { CheckCircle, Flame, Clock } from 'lucide-react'
import { GamificationStats } from '@/lib/hooks/useGamificationStats'
import { formatImpactMessage } from '@/lib/gamification'

function AnimatedCounter({ value }: { value: number }) {
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { stiffness: 200, damping: 20, restDelta: 0.001 })
  const rounded = useTransform(spring, (v) => Math.round(v))

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  return <motion.span>{rounded}</motion.span>
}

function StatsPills({ stats, impactMsg }: { stats: GamificationStats; impactMsg: string }) {
  return (
    <div className="flex flex-wrap gap-3 w-full">
      {/* Done today */}
      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
        <CheckCircle size={16} className="text-green-500" />
        <span className="text-sm font-semibold">
          <AnimatedCounter value={stats.doneToday} />
        </span>
        <span className="text-xs text-gray-500">done today</span>
      </div>

      {/* Streak with personal best */}
      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
        <Flame size={16} className="text-orange-500" />
        <span className="text-sm font-semibold">
          <AnimatedCounter value={stats.currentStreak} />
        </span>
        <span className="text-xs text-gray-500">
          days {stats.personalBest > stats.currentStreak && `(best: ${stats.personalBest})`}
        </span>
      </div>

      {/* Impact message — only show when data available */}
      {impactMsg && (
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
          <Clock size={16} className="text-blue-500" />
          <span className="text-xs text-gray-600">{impactMsg}</span>
        </div>
      )}
    </div>
  )
}

export function StatsBar({ stats }: { stats: GamificationStats }) {
  const [expanded, setExpanded] = useState(false)
  const impactMsg = formatImpactMessage(stats.impactHours)

  return (
    <div className="mb-4">
      {/* Mobile toggle — hidden on sm+ */}
      <button
        className="sm:hidden flex items-center gap-1 text-xs text-gray-400 mb-2"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        Today's progress {expanded ? '▲' : '▼'}
      </button>

      {/* Desktop: always visible */}
      <div className="hidden sm:flex gap-3">
        <StatsPills stats={stats} impactMsg={impactMsg} />
      </div>

      {/* Mobile: collapsible */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="sm:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="flex gap-3">
              <StatsPills stats={stats} impactMsg={impactMsg} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
