import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('oidc-client-ts', () => {
  const signinRedirect = vi.fn();
  const signinRedirectCallback = vi.fn();
  const signoutRedirect = vi.fn();
  const UserManager = vi.fn().mockImplementation(() => ({
    signinRedirect,
    signinRedirectCallback,
    signoutRedirect,
    events: {
      addUserLoaded: vi.fn(),
    },
  }));
  const WebStorageStateStore = vi.fn();
  return {
    UserManager,
    WebStorageStateStore,
    __mock: {
      signinRedirect,
      signinRedirectCallback,
      signoutRedirect,
    },
  };
});

describe('auth helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('throws when login is attempted without OIDC config', async () => {
    vi.stubEnv('NEXT_PUBLIC_OIDC_AUTHORITY', '');
    vi.stubEnv('NEXT_PUBLIC_OIDC_CLIENT_ID', '');

    const { login } = await import('@/lib/auth');

    await expect(login()).rejects.toThrow('OIDC is not configured');
  });

  it('passes idp hint into signinRedirect', async () => {
    vi.stubEnv('NEXT_PUBLIC_OIDC_AUTHORITY', 'https://auth.example.com');
    vi.stubEnv('NEXT_PUBLIC_OIDC_CLIENT_ID', 'liminal-client');

    const { login } = await import('@/lib/auth');
    const { __mock } = await import('oidc-client-ts');

    await login({ idpHint: 'google' });

    expect(__mock.signinRedirect).toHaveBeenCalledWith({
      extraQueryParams: { kc_idp_hint: 'google' },
      redirectMethod: 'replace',
    });
  });

  it('stores access token after login callback', async () => {
    vi.stubEnv('NEXT_PUBLIC_OIDC_AUTHORITY', 'https://auth.example.com');
    vi.stubEnv('NEXT_PUBLIC_OIDC_CLIENT_ID', 'liminal-client');

    const { handleLoginCallback } = await import('@/lib/auth');
    const { __mock } = await import('oidc-client-ts');

    __mock.signinRedirectCallback.mockResolvedValue({ access_token: 'token-123' });

    await handleLoginCallback();

    expect(localStorage.getItem('liminal_token')).toBe('token-123');
  });

  it('clears the token and signs out when logging out', async () => {
    vi.stubEnv('NEXT_PUBLIC_OIDC_AUTHORITY', 'https://auth.example.com');
    vi.stubEnv('NEXT_PUBLIC_OIDC_CLIENT_ID', 'liminal-client');

    const { logout } = await import('@/lib/auth');
    const { __mock } = await import('oidc-client-ts');

    localStorage.setItem('liminal_token', 'token-123');

    await logout();

    expect(localStorage.getItem('liminal_token')).toBeNull();
    expect(__mock.signoutRedirect).toHaveBeenCalledTimes(1);
  });
});
