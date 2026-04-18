import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SpotifyPlayer from '@/components/SpotifyPlayer';
import NoisePlayer from '@/components/NoisePlayer';
import { useAppStore } from '@/lib/store';

// Mock Web Audio API
const mockAudioContext = {
  createBuffer: vi.fn().mockReturnValue({
    getChannelData: vi.fn().mockReturnValue(new Float32Array(44100)),
  }),
  createBufferSource: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    loop: false,
    buffer: null,
  }),
  createGain: vi.fn().mockReturnValue({
    gain: { value: 1, setTargetAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  state: 'suspended',
  currentTime: 0,
  destination: {},
};

global.AudioContext = vi.fn().mockImplementation(() => mockAudioContext);

vi.mock('@/lib/spotify', () => ({
  getSpotifyStatus: vi.fn().mockResolvedValue({ connected: true, display_name: 'Test User' }),
  getSpotifyAccessToken: vi.fn().mockResolvedValue('fake-token'),
  getMyPlaylists: vi.fn().mockResolvedValue([]),
  getCurrentlyPlaying: vi.fn().mockResolvedValue({ is_playing: false }),
  disconnectSpotify: vi.fn().mockResolvedValue(undefined),
  getSpotifyAuthUrl: vi.fn().mockResolvedValue({ url: 'http://fake-auth', state: 'fake-state' }),
}));

describe('Smart Audio Interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ isNoisePlaying: false });
  });

  it('should pause noise when user interacts with Spotify iframe', async () => {
    // 1. Start noise
    useAppStore.setState({ isNoisePlaying: true });
    
    render(
      <div>
        <NoisePlayer />
        <SpotifyPlayer />
      </div>
    );

    expect(useAppStore.getState().isNoisePlaying).toBe(true);

    // 2. Simulate user clicking into Spotify iframe (blur event)
    const iframe = await screen.findByTitle(/Spotify Player/i);
    
    // We need to mock document.activeElement
    Object.defineProperty(document, 'activeElement', {
      value: iframe,
      writable: true,
      configurable: true,
    });

    fireEvent(window, new Event('blur'));

    // 3. Noise should be paused
    expect(useAppStore.getState().isNoisePlaying).toBe(false);
  });
});
