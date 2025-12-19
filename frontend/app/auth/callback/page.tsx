'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { handleLoginCallback } from '@/lib/auth'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        await handleLoginCallback()
        router.replace('/')
      } catch (e: any) {
        setError(e?.message || 'Login callback failed')
      }
    })()
  }, [router])

  return (
    <div className="max-w-lg mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-2">
      <h1 className="text-xl font-bold">Signing you in…</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
