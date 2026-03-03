import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LastFmProfile from '@/components/LastFmProfile';

describe('LastFmProfile Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should allow entering and saving a username', () => {
    render(<LastFmProfile />);
    
    const input = screen.getByPlaceholderText(/Last.fm Username/i);
    const button = screen.getByRole('button', { name: /Connect/i });

    fireEvent.change(input, { target: { value: 'testuser' } });
    fireEvent.click(button);

    expect(localStorage.getItem('lastfm_username')).toBe('testuser');
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText(/View Profile/i)).toBeInTheDocument();
  });

  it('should load saved username from localStorage', () => {
    localStorage.setItem('lastfm_username', 'saveduser');
    
    render(<LastFmProfile />);
    
    expect(screen.getByText('saveduser')).toBeInTheDocument();
  });

  it('should allow editing the username', () => {
    localStorage.setItem('lastfm_username', 'saveduser');
    
    render(<LastFmProfile />);
    
    const editButton = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editButton);

    const input = screen.getByPlaceholderText(/Last.fm Username/i);
    expect(input).toHaveValue('saveduser');
  });
});
