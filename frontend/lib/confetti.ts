import confetti from 'canvas-confetti'

// Check for reduced motion preference
const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Generic confetti trigger with options
export function triggerConfetti(options?: confetti.Options): void {
  if (prefersReducedMotion()) return

  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    ...options
  })
}

// Preset for task completion - celebratory burst
export function triggerTaskComplete(): void {
  if (prefersReducedMotion()) return

  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'], // Green, blue, amber, purple
    ticks: 200,
    gravity: 1.2,
    scalar: 1.1
  })
}

// Preset for quick capture success - subtle confirmation
export function triggerQuickCapture(): void {
  if (prefersReducedMotion()) return

  confetti({
    particleCount: 30,
    spread: 40,
    origin: { y: 0.5 },
    colors: ['#10b981', '#3b82f6'],
    ticks: 100,
    gravity: 1.5
  })
}
