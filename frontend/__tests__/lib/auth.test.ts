import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('oidc-client-ts', () => {
  const signinRedirect = vi.fn();
  const signinRedirectCallback = vi.fn();
  const signoutRedirect = vi.fn();
  const UserManager = vi.fn().mockImplementation(() => ({
    signinRedirect,
    signinRedirectCallback,
    signoutRedirect,
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

type AuthConfig = {
  oidcAuthority: string;
  oidcClientId: string;
  oidcRedirectUri: string;
  oidcPostLogoutRedirectUri: string;
  oidcScope: string;
  authRequired: boolean;
  authProviders: { key: string; label: string; idpHint?: string }[];
};

const baseConfig: AuthConfig = {
  oidcAuthority: 'https://auth.example.com',
  oidcClientId: 'liminal-client',
  oidcRedirectUri: 'http://localhost/auth/callback',
  oidcPostLogoutRedirectUri: 'http://localhost/login',
  oidcScope: 'openid profile email',
  authRequired: true,
  authProviders: [],
};

const mockConfigFetch = (config: AuthConfig) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => config,
  }));
};

describe('auth helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws when login is attempted without OIDC config', async () => {
    mockConfigFetch({
      ...baseConfig,
      oidcAuthority: '',
      oidcClientId: '',
    });

    const { login } = await import('@/lib/auth');

    await expect(login()).rejects.toThrow('OIDC is not configured');
  });

  it('passes idp hint into signinRedirect', async () => {
    mockConfigFetch(baseConfig);

    const { login } = await import('@/lib/auth');
    const { __mock } = await import('oidc-client-ts');

    await login({ idpHint: 'google' });

    expect(__mock.signinRedirect).toHaveBeenCalledWith({
      extraQueryParams: { kc_idp_hint: 'google' },
      redirectMethod: 'replace',
    });
  });

  it('stores access token after login callback', async () => {
    mockConfigFetch(baseConfig);

    const { handleLoginCallback } = await import('@/lib/auth');
    const { __mock } = await import('oidc-client-ts');

    __mock.signinRedirectCallback.mockResolvedValue({ access_token: 'token-123' });

    await handleLoginCallback();

    expect(localStorage.getItem('liminal_token')).toBe('token-123');
  });

  it('clears the token and signs out when logging out', async () => {
    mockConfigFetch(baseConfig);

    const { logout } = await import('@/lib/auth');
    const { __mock } = await import('oidc-client-ts');

    localStorage.setItem('liminal_token', 'token-123');

    await logout();

    expect(localStorage.getItem('liminal_token')).toBeNull();
    expect(__mock.signoutRedirect).toHaveBeenCalledTimes(1);
  });
});
