import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SpotifyPlayer from '@/components/SpotifyPlayer';

describe('SpotifyPlayer Component', () => {
  it('should render the Spotify embedded player placeholder', () => {
    render(<SpotifyPlayer />);
    expect(screen.getByText(/Spotify Player/i)).toBeInTheDocument();
  });

  it('should contain an iframe for the Spotify embed', () => {
    render(<SpotifyPlayer />);
    const iframe = screen.getByTitle(/Spotify Player/i);
    expect(iframe).toBeInTheDocument();
    expect(iframe.tagName).toBe('IFRAME');
  });
});
