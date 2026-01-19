'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { handleLoginCallback } from '@/lib/auth'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    ;(async () => {
      try {
        console.log("Processing login callback...")
        await handleLoginCallback()
        console.log("Login callback successful, redirecting...")
        router.replace('/')
      } catch (e: any) {
        console.error("Login callback failed:", e)
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
