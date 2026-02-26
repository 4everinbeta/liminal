'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Activity, Volume2 } from 'lucide-react';

type NoiseType = 'white' | 'pink' | 'brown';

export default function NoisePlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [noiseType, setNoiseType] = useState<NoiseType>('pink');
  const [volume, setVolume] = useState(0.1);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const createNoiseNode = (ctx: AudioContext, type: NoiseType) => {
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      let b0, b1, b2, b3, b4, b5, b6;
      b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11; // (roughly) compensate for gain
        b6 = white * 0.115926;
      }
    } else if (type === 'brown') {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        const out = (lastOut + (0.02 * white)) / 1.02;
        output[i] = out * 3.5; // (roughly) compensate for gain
        lastOut = out;
      }
    }

    const node = ctx.createBufferSource();
    node.buffer = noiseBuffer;
    node.loop = true;
    return node;
  };

  const startNoise = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const noiseNode = createNoiseNode(ctx, noiseType) as AudioBufferSourceNode;
    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    noiseNode.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseNode.start();
    
    noiseNodeRef.current = noiseNode;
    gainNodeRef.current = gainNode;
    setIsPlaying(true);
  };

  const stopNoise = () => {
    if (noiseNodeRef.current) {
      (noiseNodeRef.current as AudioBufferSourceNode).stop();
      noiseNodeRef.current.disconnect();
      noiseNodeRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  useEffect(() => {
    if (isPlaying) {
      stopNoise();
      startNoise();
    }
  }, [noiseType]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(volume, audioContextRef.current!.currentTime, 0.1);
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      stopNoise();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      stopNoise();
    } else {
      startNoise();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-primary">
          <Activity size={18} />
          <h3 className="font-semibold text-sm">Focus Sound</h3>
        </div>
        <button
          onClick={togglePlay}
          className={`p-2 rounded-full transition-colors ${
            isPlaying ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
          }`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(['white', 'pink', 'brown'] as NoiseType[]).map((type) => (
            <button
              key={type}
              onClick={() => setNoiseType(type)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                noiseType === type
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Volume2 size={14} className="text-gray-400" />
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
