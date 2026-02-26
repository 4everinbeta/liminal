import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NoisePlayer from '@/components/NoisePlayer';

// Mock the Web Audio API
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

describe('NoisePlayer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the noise player with initial state off', () => {
    render(<NoisePlayer />);
    expect(screen.getByText(/Focus Sound/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Play/i })).toBeInTheDocument();
  });

  it('should display options for Pink, Brown, and White noise', () => {
    render(<NoisePlayer />);
    expect(screen.getByRole('button', { name: /Pink/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Brown/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /White/i })).toBeInTheDocument();
  });

  it('should start playing noise when the play button is clicked', () => {
    render(<NoisePlayer />);
    const playButton = screen.getByRole('button', { name: /Play/i });
    
    fireEvent.click(playButton);
    
    expect(screen.getByRole('button', { name: /Pause/i })).toBeInTheDocument();
  });

  it('should change the noise type when a button is selected', () => {
    render(<NoisePlayer />);
    const brownButton = screen.getByRole('button', { name: /Brown/i });
    
    fireEvent.click(brownButton);
    
    // In our implementation, the active button has specific classes
    expect(brownButton).toHaveClass('bg-white');
  });

  it('should update the volume when the slider is moved', () => {
    render(<NoisePlayer />);
    const volumeSlider = screen.getByLabelText(/Volume/i);
    
    fireEvent.change(volumeSlider, { target: { value: '0.5' } });
    
    expect(volumeSlider).toHaveValue('0.5');
  });
});
