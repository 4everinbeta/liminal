'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Layout, CheckCircle2, Settings, LogOut, Menu, X, Home, Target } from 'lucide-react'

const navItems = [
  { icon: Home, label: 'Today', href: '/' },
  { icon: Layout, label: 'Board', href: '/board' },
  { icon: Target, label: 'Focus Mode', href: '/focus' },
]

export default function AppSidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Hide on login page
  if (pathname === '/login' || pathname === '/auth/callback') return null

  const handleLogout = () => {
    localStorage.removeItem('liminal_token')
    router.push('/login')
  }

  return (
    <>
      {/* Mobile Toggle (Simple top bar implementation for now) */}
      {/* For desktop, we use the side hover interaction */}
      
      <motion.nav
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-50 shadow-sm"
        initial={{ width: '4rem' }}
        animate={{ width: isExpanded ? '16rem' : '4rem' }}
        onHoverStart={() => setIsExpanded(true)}
        onHoverEnd={() => setIsExpanded(false)}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-center h-16 border-b border-gray-100">
            {/* Logo Placeholder */}
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
                L
            </div>
            {isExpanded && (
                <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="ml-3 font-bold text-gray-800 text-xl tracking-tight"
                >
                    Liminal
                </motion.span>
            )}
        </div>

        <div className="flex-1 py-6 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <div className={`relative flex items-center h-12 px-4 cursor-pointer transition-colors ${
                    isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}>
                  <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  
                  {isActive && !isExpanded && (
                      <motion.div 
                        layoutId="activeIndicator"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"
                      />
                  )}

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="ml-4 font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-gray-100">
            <button 
                onClick={handleLogout}
                className="flex items-center w-full h-12 text-gray-400 hover:text-red-500 transition-colors"
            >
                <LogOut size={24} />
                <AnimatePresence>
                    {isExpanded && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="ml-4 font-medium whitespace-nowrap"
                        >
                            Log Out
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>
        </div>
      </motion.nav>

      {/* Mobile Bottom Bar (visible only on small screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex justify-around items-center z-50 pb-safe">
        {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
                <Link key={item.href} href={item.href} className={`flex flex-col items-center p-2 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                    <item.icon size={24} />
                    <span className="text-[10px] font-medium mt-1">{item.label}</span>
                </Link>
            )
        })}
        <button onClick={handleLogout} className="flex flex-col items-center p-2 text-gray-400 hover:text-red-500">
            <LogOut size={24} />
            <span className="text-[10px] font-medium mt-1">Exit</span>
        </button>
      </div>
    </>
  )
}
