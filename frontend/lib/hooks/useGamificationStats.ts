import { useMemo } from 'react'
import { Task } from '@/lib/api'
import { updatePersonalBest, calculateImpactHours } from '@/lib/gamification'

export interface GamificationStats {
  doneToday: number
  currentStreak: number
  personalBest: number
  impactHours: number
}

export function useGamificationStats(tasks: Task[]): GamificationStats {
  return useMemo(() => {
    const today = new Date()
    const todayStr = today.toDateString()

    // Done Today
    const doneToday = tasks.filter(t => 
      t.status === 'done' && 
      t.updated_at && 
      new Date(t.updated_at).toDateString() === todayStr
    ).length

    // Streak Calculation
    const completedDates = new Set(
      tasks
        .filter(t => t.status === 'done' && t.updated_at)
        .map(t => new Date(t.updated_at!).toDateString())
    )

    let currentStreak = 0
    // Check up to 365 days back
    for (let i = 0; i < 365; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dStr = d.toDateString()

      if (completedDates.has(dStr)) {
        currentStreak++
      } else if (i === 0 && !completedDates.has(dStr)) {
        // Today with no completions yet doesn't break streak
        continue
      } else {
        break
      }
    }

    // Personal best — read + update if improved
    const personalBest = updatePersonalBest(currentStreak)

    // Impact hours from estimated_duration of done-today tasks
    const impactHours = calculateImpactHours(tasks)

    return { doneToday, currentStreak, personalBest, impactHours }
  }, [tasks])
}
