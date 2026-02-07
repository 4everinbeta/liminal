import { useState, useEffect, useRef, useCallback } from 'react'

// TypeScript declarations for SpeechRecognition (browser API not in default types)
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    maxAlternatives: number
    start(): void
    stop(): void
    abort(): void
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string
    message: string
  }

  interface SpeechRecognitionEvent extends Event {
    resultIndex: number
    results: SpeechRecognitionResultList
  }

  interface SpeechRecognitionResultList {
    length: number
    item(index: number): SpeechRecognitionResult
    [index: number]: SpeechRecognitionResult
  }

  interface SpeechRecognitionResult {
    length: number
    item(index: number): SpeechRecognitionAlternative
    [index: number]: SpeechRecognitionAlternative
    isFinal: boolean
  }

  interface SpeechRecognitionAlternative {
    transcript: string
    confidence: number
  }

  var SpeechRecognition: {
    prototype: SpeechRecognition
    new (): SpeechRecognition
  }
}

export interface UseVoiceInputReturn {
  start: () => void
  stop: () => void
  isListening: boolean
  isSupported: boolean
}

/**
 * Wraps Web Speech API for voice-to-text transcription with graceful degradation.
 *
 * Features:
 * - Browser compatibility check (Chrome/Edge supported, Safari partial, Firefox not supported)
 * - Handles webkit prefix for cross-browser support
 * - Real-time interim results for immediate feedback
 * - Error handling for permission denial and no-speech scenarios
 * - Cleanup on unmount to prevent memory leaks
 *
 * @param onResult - Callback fired with transcript (called on interim and final results)
 * @returns {start, stop, isListening, isSupported}
 */
export function useVoiceInput(
  onResult: (transcript: string) => void
): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    // Check for SpeechRecognition support (handle webkit prefix)
    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null

    if (!SpeechRecognitionAPI) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)

    // Initialize recognition instance
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false // Stop automatically after speech ends
    recognition.interimResults = true // Enable real-time transcription
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    // Handle results (interim and final)
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      onResult(transcript)
    }

    // Handle speech end (auto-stop)
    recognition.onspeechend = () => {
      recognition.stop()
      setIsListening(false)
    }

    // Handle errors gracefully
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)

      if (event.error === 'not-allowed') {
        console.warn('Microphone permission denied')
      } else if (event.error === 'no-speech') {
        console.warn('No speech detected')
      }
    }

    recognitionRef.current = recognition

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onResult])

  const start = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (error) {
        console.error('Failed to start speech recognition:', error)
      }
    }
  }, [isListening])

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [isListening])

  return { start, stop, isListening, isSupported }
}
