'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getAuthConfig, getUserManager } from '@/lib/auth'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authRequired, setAuthRequired] = useState<boolean | null>(null)

  useEffect(() => {
    // Initialize auth config
    getAuthConfig()
      .then((cfg) => setAuthRequired(cfg.authRequired))
      .catch(() => setAuthRequired(false))

    // Initialize user manager to attach event listeners
    getUserManager().then(um => {
        um?.getUser().then(user => {
            if (user?.access_token) {
                localStorage.setItem('liminal_token', user.access_token)
            }
        })
    })
  }, [])

  useEffect(() => {
    if (authRequired !== true) return
    if (pathname === '/login' || pathname === '/auth/callback' || pathname === '/register') return

    const token = localStorage.getItem('liminal_token')
    if (!token) router.replace('/login')
  }, [authRequired, pathname, router])

  return <>{children}</>
}
