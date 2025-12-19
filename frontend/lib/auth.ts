'use client'

import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

const authority = process.env.NEXT_PUBLIC_OIDC_AUTHORITY
const clientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID
const redirectUri =
  process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI || 'http://localhost:3000/auth/callback'
const postLogoutRedirectUri =
  process.env.NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000/login'
const scope = process.env.NEXT_PUBLIC_OIDC_SCOPE || 'openid profile email'

export const AUTH_REQUIRED =
  (process.env.NEXT_PUBLIC_AUTH_REQUIRED || 'true').toLowerCase() !== 'false'

export const OIDC_ENABLED = Boolean(authority && clientId)

export const userManager = OIDC_ENABLED
  ? new UserManager({
      authority: authority!,
      client_id: clientId!,
      redirect_uri: redirectUri,
      post_logout_redirect_uri: postLogoutRedirectUri,
      response_type: 'code',
      scope,
      userStore: new WebStorageStateStore({ store: window.localStorage }),
    })
  : null

export async function login(): Promise<void> {
  if (!userManager) throw new Error('OIDC is not configured')
  await userManager.signinRedirect()
}

export async function handleLoginCallback(): Promise<void> {
  if (!userManager) throw new Error('OIDC is not configured')
  const user = await userManager.signinRedirectCallback()
  if (user?.access_token) {
    localStorage.setItem('liminal_token', user.access_token)
  }
}

export async function logout(): Promise<void> {
  localStorage.removeItem('liminal_token')
  if (!userManager) return
  await userManager.signoutRedirect()
}
