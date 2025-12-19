'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AUTH_REQUIRED } from '@/lib/auth'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!AUTH_REQUIRED) return
    if (pathname === '/login' || pathname === '/auth/callback') return

    const token = localStorage.getItem('liminal_token')
    if (!token) router.replace('/login')
  }, [pathname, router])

  return <>{children}</>
}
