'use client';

import React from 'react';

export default function SpotifyPlayer() {
  // Using a generic Lo-Fi focus playlist as default
  const playlistUri = 'spotify:playlist:37i9dQZF1DWWQRwovXQM9n';
  const embedUrl = `https://open.spotify.com/embed/playlist/${playlistUri.split(':').pop()}?utm_source=generator&theme=0`;

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Spotify Player</h3>
      </div>
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
        ></iframe>
      </div>
    </div>
  );
}
