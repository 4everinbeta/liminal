import { Task } from '@/lib/api'

const PERSONAL_BEST_KEY = 'liminal-streak-best'

export function getPersonalBest(): number {
  if (typeof window === 'undefined') return 0
  const stored = localStorage.getItem(PERSONAL_BEST_KEY)
  return stored ? parseInt(stored, 10) : 0
}

export function updatePersonalBest(currentStreak: number): number {
  if (typeof window === 'undefined') return currentStreak
  const best = getPersonalBest()
  if (currentStreak > best) {
    localStorage.setItem(PERSONAL_BEST_KEY, String(currentStreak))
    return currentStreak
  }
  return best
}

export function calculateImpactHours(tasks: Task[]): number {
  const todayStr = new Date().toDateString()
  const minutesFreed = tasks
    .filter(t =>
      t.status === 'done' &&
      t.updated_at &&
      new Date(t.updated_at).toDateString() === todayStr &&
      t.estimated_duration // Only count tasks with duration estimates
    )
    .reduce((sum, t) => sum + (t.estimated_duration || 0), 0)

  return minutesFreed / 60
}

export function formatImpactMessage(hours: number): string {
  if (hours === 0) return ''  // Don't show if no estimates available
  if (hours < 0.5) return 'You freed up some time today'
  const rounded = Math.round(hours * 2) / 2  // Round to nearest 0.5
  return `You freed up ${rounded === 1 ? '1 hour' : `${rounded} hours`} today`
}
