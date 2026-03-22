'use client'

import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

export type AuthProvider = {
  key: string
  label: string
  idpHint?: string
}

export type AuthConfig = {
  oidcAuthority: string
  oidcClientId: string
  oidcRedirectUri: string
  oidcPostLogoutRedirectUri: string
  oidcScope: string
  authRequired: boolean
  authProviders: AuthProvider[]
}

let _configPromise: Promise<AuthConfig> | null = null
let _userManager: UserManager | null = null

export function getAuthConfig(): Promise<AuthConfig> {
  if (!_configPromise) {
    _configPromise = Promise.resolve({
      oidcAuthority: process.env.NEXT_PUBLIC_OIDC_AUTHORITY || '',
      oidcClientId: process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || '',
      oidcRedirectUri: process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI || (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : ''),
      oidcPostLogoutRedirectUri: process.env.NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI || (typeof window !== 'undefined' ? `${window.location.origin}/login` : ''),
      oidcScope: process.env.NEXT_PUBLIC_OIDC_SCOPE || 'openid profile email offline_access',
      authRequired: (() => {
        const val = (process.env.NEXT_PUBLIC_AUTH_REQUIRED || '').toLowerCase()
        return val !== 'false' && val !== '0' && val !== 'no' && Boolean(process.env.NEXT_PUBLIC_OIDC_AUTHORITY && process.env.NEXT_PUBLIC_OIDC_CLIENT_ID)
      })(),
      authProviders: (() => {
        const input = process.env.NEXT_PUBLIC_OIDC_PROVIDERS || ''
        if (!input) return [{ key: 'default', label: 'Continue with Liminal', idpHint: undefined }]
        return input.split('##').map(e => e.trim()).filter(Boolean).map(entry => {
          const [rawKey, rawLabel] = entry.split('=').map(p => p?.trim())
          if (!rawKey) return null
          return { key: rawKey, label: rawLabel || rawKey.replace(/_/g, ' '), idpHint: rawKey === 'default' ? undefined : rawKey }
        }).filter((p): p is AuthProvider => Boolean(p))
      })(),
    })
  }
  return _configPromise
}

export async function getUserManager(): Promise<UserManager | null> {
  if (_userManager) return _userManager

  const cfg = await getAuthConfig()
  if (!cfg.oidcAuthority || !cfg.oidcClientId) return null

  _userManager = new UserManager({
    authority: cfg.oidcAuthority,
    client_id: cfg.oidcClientId,
    redirect_uri: cfg.oidcRedirectUri,
    post_logout_redirect_uri: cfg.oidcPostLogoutRedirectUri,
    response_type: 'code',
    scope: cfg.oidcScope,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    automaticSilentRenew: true,
  })

  _userManager.events.addUserLoaded((user) => {
    if (user.access_token) {
        localStorage.setItem('liminal_token', user.access_token)
        window.dispatchEvent(new Event('liminal:token_updated'))
    }
  })

  return _userManager
}

type LoginOptions = {
  idpHint?: string
}

export async function login(options?: LoginOptions): Promise<void> {
  const um = await getUserManager()
  if (!um) throw new Error('OIDC is not configured')
  await um.signinRedirect({
    // Keycloak inspects kc_idp_hint to jump straight into a social provider.
    extraQueryParams: options?.idpHint ? { kc_idp_hint: options.idpHint } : undefined,
    redirectMethod: 'replace',
  })
}

export async function handleLoginCallback(): Promise<void> {
  const um = await getUserManager()
  if (!um) throw new Error('OIDC is not configured')
  const user = await um.signinRedirectCallback()
  console.log("OIDC User:", user)
  if (user?.access_token) {
      console.log("Storing token:", user.access_token.substring(0, 10) + "...")
      localStorage.setItem('liminal_token', user.access_token)
  } else {
      console.warn("No access token in user object")
  }
}

export async function logout(): Promise<void> {
  localStorage.removeItem('liminal_token')
  const um = await getUserManager()
  if (!um) return
  await um.signoutRedirect()
}
