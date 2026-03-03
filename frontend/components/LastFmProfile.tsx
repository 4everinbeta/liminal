'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink, User } from 'lucide-react';

export default function LastFmProfile() {
  const [username, setUsername] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lastfm_username');
    if (saved) {
      setUsername(saved);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (username.trim()) {
      localStorage.setItem('lastfm_username', username.trim());
      setIsSaved(true);
    }
  };

  const handleEdit = () => {
    setIsSaved(false);
  };

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
          <User size={12} />
          <span>Last.fm Profile</span>
        </div>
        {isSaved && (
          <button 
            onClick={handleEdit}
            className="text-[10px] text-primary hover:underline font-bold"
          >
            Edit
          </button>
        )}
      </div>

      {!isSaved ? (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Last.fm Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex-1 text-xs px-2 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSave}
            className="bg-primary text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-primary/90"
          >
            Connect
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700">{username}</span>
          <a
            href={`https://www.last.fm/user/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 text-primary hover:underline font-medium"
          >
            View Profile <ExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  );
}
