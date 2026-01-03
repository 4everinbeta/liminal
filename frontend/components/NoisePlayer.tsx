'use client'

import { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX, Play, Pause, Activity } from 'lucide-react'

type NoiseType = 'white' | 'pink' | 'brown'

export default function NoisePlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.1)
  const [type, setType] = useState<NoiseType>('pink')
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume
    }
  }, [volume])

  useEffect(() => {
    if (isPlaying) {
      stopNoise()
      playNoise()
    }
  }, [type])

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      gainNodeRef.current = audioContextRef.current.createGain()
      gainNodeRef.current.connect(audioContextRef.current.destination)
      gainNodeRef.current.gain.value = volume
    }
  }

  const createNoiseBuffer = () => {
    if (!audioContextRef.current) return null
    
    const bufferSize = audioContextRef.current.sampleRate * 2 // 2 seconds buffer
    const buffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate)
    const data = buffer.getChannelData(0)

    if (type === 'white') {
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1
        }
    } else if (type === 'pink') {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1
            b0 = 0.99886 * b0 + white * 0.0555179
            b1 = 0.99332 * b1 + white * 0.075076
            b2 = 0.96900 * b2 + white * 0.1538520
            b3 = 0.86650 * b3 + white * 0.3104856
            b4 = 0.55000 * b4 + white * 0.5329522
            b5 = -0.7616 * b5 - white * 0.0168980
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
            data[i] *= 0.11 // (roughly) compensate for gain
            b6 = white * 0.115926
        }
    } else if (type === 'brown') {
        let lastOut = 0
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1
            data[i] = (lastOut + (0.02 * white)) / 1.02
            lastOut = data[i]
            data[i] *= 3.5 // (roughly) compensate for gain
        }
    }
    return buffer
  }

  const playNoise = () => {
    initAudio()
    if (!audioContextRef.current || !gainNodeRef.current) return

    // Resume if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume()
    }

    const buffer = createNoiseBuffer()
    if (!buffer) return

    const source = audioContextRef.current.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(gainNodeRef.current)
    source.start()
    
    sourceNodeRef.current = source
    setIsPlaying(true)
  }

  const stopNoise = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }
    setIsPlaying(false)
  }

  const togglePlay = () => {
    if (isPlaying) stopNoise()
    else playNoise()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-primary">
            <Activity size={18} />
            <h3 className="font-semibold text-sm">Focus Sound</h3>
        </div>
        <button
            onClick={togglePlay}
            className={`p-2 rounded-full transition-colors ${isPlaying ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'}`}
        >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['white', 'pink', 'brown'] as NoiseType[]).map((t) => (
                <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                        type === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    {t}
                </button>
            ))}
        </div>

        <div className="flex items-center gap-3">
            <Volume2 size={14} className="text-gray-400" />
            <input 
                type="range" 
                min="0" max="0.5" step="0.01" 
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
        </div>
      </div>
    </div>
  )
}
