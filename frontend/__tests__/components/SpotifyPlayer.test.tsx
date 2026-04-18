import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SpotifyPlayer from '@/components/SpotifyPlayer';

vi.mock('@/lib/spotify', () => ({
  getSpotifyStatus: vi.fn().mockResolvedValue({ connected: true, display_name: 'Test User' }),
  getSpotifyAccessToken: vi.fn().mockResolvedValue('fake-token'),
  getMyPlaylists: vi.fn().mockResolvedValue([]),
  getCurrentlyPlaying: vi.fn().mockResolvedValue({ is_playing: false }),
  disconnectSpotify: vi.fn().mockResolvedValue(undefined),
  getSpotifyAuthUrl: vi.fn().mockResolvedValue({ url: 'http://fake-auth', state: 'fake-state' }),
}));

describe('SpotifyPlayer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the Spotify embedded player placeholder', async () => {
    render(<SpotifyPlayer />);
    await waitFor(() => {
      expect(screen.getByTitle(/Spotify Player/i)).toBeInTheDocument();
    });
  });

  it('should contain an iframe for the Spotify embed', async () => {
    render(<SpotifyPlayer />);
    await waitFor(() => {
      const iframe = screen.getByTitle(/Spotify Player/i);
      expect(iframe).toBeInTheDocument();
      expect(iframe.tagName).toBe('IFRAME');
    });
  });
});
