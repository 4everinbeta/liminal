'use client'

import { useAppStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { Zap, LayoutDashboard } from 'lucide-react'

export default function FocusToggle() {
  const { isFocusMode, toggleFocusMode } = useAppStore()

  return (
    <button
      onClick={toggleFocusMode}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all
        ${isFocusMode 
          ? 'bg-primary text-white shadow-lg shadow-primary/30' 
          : 'bg-white text-muted hover:text-primary border border-gray-200'
        }
      `}
      title={isFocusMode ? "Switch to Planning Mode" : "Switch to Focus Mode"}
    >
      {isFocusMode ? (
        <>
          <Zap size={18} className="fill-current" />
          <span>Focus Mode On</span>
        </>
      ) : (
        <>
          <LayoutDashboard size={18} />
          <span>Planning Mode</span>
        </>
      )}
    </button>
  )
}
