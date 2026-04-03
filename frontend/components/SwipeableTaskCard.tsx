'use client'

import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { CheckCircle2, PencilLine } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

interface SwipeableTaskCardProps {
  children: ReactNode
  onComplete: () => void
  onEdit: () => void
}

const SWIPE_THRESHOLD = 80

export function SwipeableTaskCard({ children, onComplete, onEdit }: SwipeableTaskCardProps) {
  const x = useMotionValue(0)
  const hasTriggeredHaptic = useRef(false)

  // Reveal layer opacity (0 at center, 1 at threshold)
  const completeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])
  const editOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])

  const handleDrag = async (_: unknown, info: PanInfo) => {
    // Haptic feedback on threshold crossing
    if (Math.abs(info.offset.x) >= SWIPE_THRESHOLD && !hasTriggeredHaptic.current) {
      hasTriggeredHaptic.current = true
      try {
        const { Haptics, ImpactStyle } = await import(/* webpackIgnore: true */ '@capacitor/haptics')
        if (info.offset.x < 0) {
          await Haptics.impact({ style: ImpactStyle.Medium })
        } else {
          await Haptics.impact({ style: ImpactStyle.Light })
        }
      } catch {
        // Haptics not available (web browser) — silently skip
      }
    }
    if (Math.abs(info.offset.x) < SWIPE_THRESHOLD) {
      hasTriggeredHaptic.current = false
    }
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    hasTriggeredHaptic.current = false
    if (info.offset.x < -SWIPE_THRESHOLD) {
      onComplete()
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      onEdit()
    }
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Complete reveal (left swipe — green background) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-6 rounded-lg"
        style={{ backgroundColor: '#10B981', opacity: completeOpacity }}
      >
        <CheckCircle2 className="h-6 w-6 text-white" />
      </motion.div>

      {/* Edit reveal (right swipe — indigo background) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-start pl-6 rounded-lg"
        style={{ backgroundColor: '#4F46E5', opacity: editOpacity }}
      >
        <PencilLine className="h-6 w-6 text-white" />
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  )
}
