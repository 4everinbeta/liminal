'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { exchangeSpotifyCode } from '@/lib/spotify'

export default function SpotifyCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    ;(async () => {
      const code = searchParams.get('code')
      const errorParam = searchParams.get('error')

      if (errorParam) {
        setError(errorParam === 'access_denied' ? 'Spotify access was denied.' : `Spotify error: ${errorParam}`)
        setStatus('error')
        return
      }

      if (!code) {
        setError('No authorization code received from Spotify.')
        setStatus('error')
        return
      }

      try {
        await exchangeSpotifyCode(code)
        setStatus('success')
        setTimeout(() => router.replace('/'), 1500)
      } catch (e: any) {
        setError(e?.message || 'Failed to connect Spotify account.')
        setStatus('error')
      }
    })()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-sm w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-3 text-center">
        {status === 'loading' && (
          <>
            <div className="text-3xl">🎵</div>
            <h1 className="text-lg font-semibold">Connecting Spotify…</h1>
            <p className="text-sm text-gray-500">Just a moment</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-3xl">✓</div>
            <h1 className="text-lg font-semibold">Spotify connected!</h1>
            <p className="text-sm text-gray-500">Redirecting you back…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-3xl">✗</div>
            <h1 className="text-lg font-semibold">Connection failed</h1>
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={() => router.replace('/')}
              className="mt-2 text-sm text-gray-500 underline"
            >
              Go back
            </button>
          </>
        )}
      </div>
    </div>
  )
}
