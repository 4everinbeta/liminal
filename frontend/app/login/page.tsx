'use client'

import { useEffect, useState } from 'react'
import { AuthConfig, AuthProvider, getAuthConfig, login, logout } from '@/lib/auth'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<AuthConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAuthConfig()
      .then((cfg) => setConfig(cfg))
      .catch(() => setConfig(null))
      .finally(() => setLoading(false))
  }, [])

  const onLogin = async (provider?: AuthProvider) => {
    try {
      setError(null)
      await login(provider?.idpHint ? { idpHint: provider.idpHint } : undefined)
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

      {loading && <p className="text-sm text-gray-500">Loading login providers…</p>}

      {!loading && !config && (
        <p className="text-sm text-gray-600">
          OIDC is not configured. Set NEXT_PUBLIC_OIDC_AUTHORITY and NEXT_PUBLIC_OIDC_CLIENT_ID in Railway Variables for the frontend.
        </p>
      )}

      {config?.authProviders?.map((provider) => (
        <button
          key={provider.key}
          onClick={() => onLogin(provider)}
          className="w-full py-3 rounded-2xl bg-primary text-white font-semibold"
        >
          {provider.label}
        </button>
      ))}

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
