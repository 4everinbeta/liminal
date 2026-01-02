'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, ChevronDown } from 'lucide-react'
import ChatInterface from '@/components/ChatInterface'
import { usePathname } from 'next/navigation'

export default function GlobalChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Hide on login/auth pages
  if (pathname === '/login' || pathname === '/auth/callback') return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-[350px] md:w-[400px] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
          >
            <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50/80">
              <span className="text-sm font-semibold text-gray-700">Liminal Coach</span>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/50 transition-colors"
              >
                <ChevronDown size={18} />
              </button>
            </div>
            <div className="h-[500px]">
                <ChatInterface />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-lg transition-colors ${
            isOpen ? 'bg-gray-800 text-white' : 'bg-primary text-white hover:bg-primary/90'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>
    </div>
  )
}
