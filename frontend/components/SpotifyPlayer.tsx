'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import LastFmProfile from './LastFmProfile'
import {
  getSpotifyStatus,
  getSpotifyAuthUrl,
  getSpotifyAccessToken,
  getMyPlaylists,
  getCurrentlyPlaying,
  disconnectSpotify,
  type SpotifyPlaylist,
  type SpotifyCurrentTrack,
} from '@/lib/spotify'

type ConnectionState = 'loading' | 'disconnected' | 'connected'

export default function SpotifyPlayer() {
  const { isNoisePlaying, setIsNoisePlaying } = useAppStore()

  const [connectionState, setConnectionState] = useState<ConnectionState>('loading')
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [currentTrack, setCurrentTrack] = useState<SpotifyCurrentTrack | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Check connection status on mount
  useEffect(() => {
    getSpotifyStatus()
      .then(({ connected, display_name }) => {
        setConnectionState(connected ? 'connected' : 'disconnected')
        setDisplayName(display_name)
      })
      .catch(() => setConnectionState('disconnected'))
  }, [])

  // Load playlists and current track when connected
  const loadSpotifyData = useCallback(async () => {
    try {
      const token = await getSpotifyAccessToken()
      const [lists, track] = await Promise.all([
        getMyPlaylists(token),
        getCurrentlyPlaying(token),
      ])
      setPlaylists(lists)
      setCurrentTrack(track)
      // Default to first playlist if nothing selected
      if (!selectedPlaylistId && lists.length > 0) {
        setSelectedPlaylistId(lists[0].id)
      }
    } catch {
      // Token fetch failed — treat as disconnected
      setConnectionState('disconnected')
    }
  }, [selectedPlaylistId])

  useEffect(() => {
    if (connectionState === 'connected') {
      loadSpotifyData()
    }
  }, [connectionState, loadSpotifyData])

  // Pause ambient noise when user clicks into Spotify iframe
  useEffect(() => {
    const handleBlur = () => {
      if (
        document.activeElement?.tagName === 'IFRAME' &&
        (document.activeElement as HTMLIFrameElement).title === 'Spotify Player'
      ) {
        if (isNoisePlaying) setIsNoisePlaying(false)
      }
    }
    window.addEventListener('blur', handleBlur)
    return () => window.removeEventListener('blur', handleBlur)
  }, [isNoisePlaying, setIsNoisePlaying])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const { url, state } = await getSpotifyAuthUrl()
      sessionStorage.setItem('spotify_oauth_state', state)
      window.location.href = url
    } catch {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    await disconnectSpotify()
    setConnectionState('disconnected')
    setDisplayName(null)
    setPlaylists([])
    setCurrentTrack(null)
    setSelectedPlaylistId(null)
  }

  const embedUrl = selectedPlaylistId
    ? `https://open.spotify.com/embed/playlist/${selectedPlaylistId}?utm_source=generator&theme=0`
    : `https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwovXQM9n?utm_source=generator&theme=0`

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Spotify</h3>
        {connectionState === 'connected' && displayName && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{displayName}</span>
            <button
              onClick={handleDisconnect}
              className="text-xs text-gray-300 hover:text-gray-500 transition-colors"
              title="Disconnect Spotify"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {connectionState === 'loading' && (
        <div className="h-24 flex items-center justify-center">
          <span className="text-xs text-gray-400">Loading…</span>
        </div>
      )}

      {/* Disconnected — connect prompt */}
      {connectionState === 'disconnected' && (
        <div className="p-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-gray-500">Connect your Spotify account to play your own playlists.</p>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex items-center gap-2 bg-[#1DB954] hover:bg-[#1aa34a] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
          >
            {/* Spotify logo mark */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            {isConnecting ? 'Redirecting…' : 'Connect Spotify'}
          </button>
        </div>
      )}

      {/* Connected — playlist picker + embed */}
      {connectionState === 'connected' && (
        <>
          {/* Album-art playlist selector */}
          {playlists.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-hide">
              {playlists.map((playlist) => {
                const cover = playlist.images[0]?.url
                const isSelected = playlist.id === selectedPlaylistId
                return (
                  <button
                    key={playlist.id}
                    onClick={() => setSelectedPlaylistId(playlist.id)}
                    title={playlist.name}
                    className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all focus:outline-none ${
                      isSelected
                        ? 'ring-2 ring-[#1DB954] ring-offset-1 scale-105'
                        : 'opacity-60 hover:opacity-90'
                    }`}
                  >
                    {cover ? (
                      <img src={cover} alt={playlist.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-lg">
                        ♪
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <span className="text-white text-xs">▶</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Currently playing strip */}
          {currentTrack?.is_playing && currentTrack.item && (
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              {currentTrack.item.album.images[2] && (
                <img
                  src={currentTrack.item.album.images[2].url}
                  alt=""
                  className="w-6 h-6 rounded"
                />
              )}
              <span className="text-xs text-gray-600 truncate">
                {currentTrack.item.name} · {currentTrack.item.artists[0]?.name}
              </span>
              <span className="ml-auto text-[10px] text-green-500 font-medium shrink-0">▶ Now Playing</span>
            </div>
          )}

          {/* Spotify embed for selected playlist */}
          <div className="relative" style={{ minHeight: '80px' }}>
            <iframe
              title="Spotify Player"
              src={embedUrl}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-b-xl"
            />
          </div>
        </>
      )}

      <div className="px-3 pb-3">
        <LastFmProfile />
      </div>
    </div>
  )
}
