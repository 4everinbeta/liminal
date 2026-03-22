'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, Plus, MoreHorizontal } from 'lucide-react'
import { useAppStore } from '@/lib/store'

export function BottomTabBar() {
  const pathname = usePathname()
  const openQuickCapture = useAppStore((s) => s.openQuickCapture)

  // Hide on auth pages
  if (pathname === '/login' || pathname === '/auth/callback' || pathname === '/register') return null

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around bg-white border-t border-gray-100 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Today tab */}
      <Link
        href="/"
        className="flex flex-col items-center justify-center min-h-[56px] min-w-[44px] flex-1"
      >
        <Home className="h-6 w-6" style={{ color: isActive('/') ? '#4F46E5' : '#6B7280' }} />
        <span className="text-[12px] mt-0.5" style={{ color: isActive('/') ? '#4F46E5' : '#6B7280' }}>Today</span>
      </Link>

      {/* Board tab */}
      <Link
        href="/board"
        className="flex flex-col items-center justify-center min-h-[56px] min-w-[44px] flex-1"
      >
        <LayoutGrid className="h-6 w-6" style={{ color: isActive('/board') ? '#4F46E5' : '#6B7280' }} />
        <span className="text-[12px] mt-0.5" style={{ color: isActive('/board') ? '#4F46E5' : '#6B7280' }}>Board</span>
      </Link>

      {/* Center Plus button */}
      <div className="flex items-center justify-center flex-1 relative">
        <button
          onClick={openQuickCapture}
          aria-label="Capture Task"
          className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg -translate-y-2"
          style={{ backgroundColor: '#4F46E5' }}
        >
          <Plus className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* More tab (disabled) */}
      <div className="flex flex-col items-center justify-center min-h-[56px] min-w-[44px] flex-1 opacity-40">
        <MoreHorizontal className="h-6 w-6" style={{ color: '#6B7280' }} />
        <span className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>More</span>
      </div>
    </nav>
  )
}
