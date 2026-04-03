const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const SPOTIFY_API = 'https://api.spotify.com/v1'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('liminal_token')
}

async function backendFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}

// ── Backend calls ──────────────────────────────────────────────────────────────

export async function getSpotifyAuthUrl(): Promise<{ url: string; state: string }> {
  const resp = await backendFetch('/spotify/auth-url')
  if (!resp.ok) throw new Error('Failed to get Spotify auth URL')
  return resp.json()
}

export async function exchangeSpotifyCode(code: string): Promise<{ connected: boolean; display_name: string | null }> {
  const resp = await backendFetch('/spotify/callback', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  if (!resp.ok) throw new Error('Spotify code exchange failed')
  return resp.json()
}

export async function getSpotifyStatus(): Promise<{ connected: boolean; display_name: string | null }> {
  const resp = await backendFetch('/spotify/status')
  if (!resp.ok) throw new Error('Failed to get Spotify status')
  return resp.json()
}

export async function getSpotifyAccessToken(): Promise<string> {
  const resp = await backendFetch('/spotify/token')
  if (resp.status === 404) throw new Error('not_connected')
  if (!resp.ok) throw new Error('Failed to get Spotify token')
  const data = await resp.json()
  return data.access_token
}

export async function disconnectSpotify(): Promise<void> {
  await backendFetch('/spotify/disconnect', { method: 'DELETE' })
}

// ── Spotify Web API calls (using token from backend) ─────────────────────────

export interface SpotifyPlaylist {
  id: string
  name: string
  images: { url: string }[]
  tracks: { total: number }
}

export interface SpotifyCurrentTrack {
  is_playing: boolean
  item: {
    name: string
    artists: { name: string }[]
    album: { name: string; images: { url: string }[] }
    duration_ms: number
  } | null
  progress_ms: number
}

async function spotifyApiFetch(path: string, accessToken: string): Promise<Response> {
  return fetch(`${SPOTIFY_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function getMyPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
  const resp = await spotifyApiFetch('/me/playlists?limit=20', accessToken)
  if (!resp.ok) return []
  const data = await resp.json()
  return data.items ?? []
}

export async function getCurrentlyPlaying(accessToken: string): Promise<SpotifyCurrentTrack | null> {
  const resp = await spotifyApiFetch('/me/player/currently-playing', accessToken)
  if (resp.status === 204 || !resp.ok) return null
  return resp.json()
}
