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
    _configPromise = fetch('/api/config', { cache: 'no-store' }).then(async (r) => {
      if (!r.ok) throw new Error('Failed to load auth config')
      return (await r.json()) as AuthConfig
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
