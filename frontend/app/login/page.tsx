'use client'

import { useState } from 'react'
import { login, logout, OIDC_ENABLED } from '@/lib/auth'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)

  const onLogin = async () => {
    try {
      setError(null)
      await login()
    } catch (e: any) {
      setError(e?.message || 'Login failed')
    }
  }

  const onLogout = async () => {
    try {
      setError(null)
      await logout()
    } catch (e: any) {
      setError(e?.message || 'Logout failed')
    }
  }

  return (
    <div className="max-w-lg mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
      {!OIDC_ENABLED ? (
        <p className="text-sm text-gray-600">
          OIDC is not configured. Set NEXT_PUBLIC_OIDC_AUTHORITY and NEXT_PUBLIC_OIDC_CLIENT_ID.
        </p>
      ) : (
        <button
          onClick={onLogin}
          className="w-full py-3 rounded-2xl bg-primary text-white font-semibold"
        >
          Continue with your Identity Provider
        </button>
      )}

      <button
        onClick={onLogout}
        className="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold"
      >
        Clear session
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
