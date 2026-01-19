import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type AuthConfig = {
  oidcAuthority: string
  oidcClientId: string
  oidcRedirectUri: string
  oidcPostLogoutRedirectUri: string
  oidcScope: string
  authRequired: boolean
  authProviders: AuthProvider[]
}

type AuthProvider = {
  key: string
  label: string
  idpHint?: string
}

function toBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value === '') return defaultValue
  return value.toLowerCase() in { '1': true, true: true, yes: true }
}

function parseProviders(input: string | undefined): AuthProvider[] {
  if (!input) return []

  return input
    .split('##')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawKey, rawLabel] = entry.split('=').map((part) => part?.trim())
      if (!rawKey) return null
      const key = rawKey
      const label = rawLabel || rawKey.replace(/_/g, ' ')
      const idpHint = key === 'default' ? undefined : key
      return { key, label, idpHint }
    })
    .filter((provider): provider is AuthProvider => Boolean(provider))
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const proto = req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '')
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host
  const origin = `${proto}://${host}`

  const oidcAuthority = process.env.NEXT_PUBLIC_OIDC_AUTHORITY || process.env.OIDC_AUTHORITY || ''
  const oidcClientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || process.env.OIDC_CLIENT_ID || ''

  const oidcRedirectUri =
    process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI || process.env.OIDC_REDIRECT_URI || `${origin}/auth/callback`

  const oidcPostLogoutRedirectUri =
    process.env.NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI ||
    process.env.OIDC_POST_LOGOUT_REDIRECT_URI ||
    `${origin}/login`

  const oidcScope = process.env.NEXT_PUBLIC_OIDC_SCOPE || process.env.OIDC_SCOPE || 'openid profile email offline_access'

  const oidcEnabled = Boolean(oidcAuthority && oidcClientId)
  const authRequired = toBool(process.env.NEXT_PUBLIC_AUTH_REQUIRED, oidcEnabled)
  const providerEnv =
    process.env.NEXT_PUBLIC_OIDC_PROVIDERS || process.env.OIDC_PROVIDERS || ''
  const parsedProviders = parseProviders(providerEnv)
  const authProviders =
    parsedProviders.length > 0
      ? parsedProviders
      : [{ key: 'default', label: 'Continue with Liminal', idpHint: undefined }]

  const payload: AuthConfig = {
    oidcAuthority,
    oidcClientId,
    oidcRedirectUri,
    oidcPostLogoutRedirectUri,
    oidcScope,
    authRequired,
    authProviders,
  }

  return NextResponse.json(payload)
}
