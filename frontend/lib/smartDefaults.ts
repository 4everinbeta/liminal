/**
 * Smart defaults calculation for ADHD-friendly task creation
 * Auto-calculates priority/value/effort from urgency signals (NOW/NOT NOW)
 */

import type { TaskCreate } from './api'

/**
 * Calculate smart defaults for task creation based on urgency signals
 *
 * Logic:
 * - Priority: Auto-calculated from due_date urgency (NOW vs NOT NOW)
 * - Value: Auto-calculated from duration (quick wins = high value)
 * - Effort: Equals estimated_duration
 * - Status: Defaults to 'backlog'
 *
 * @param task - Partial task data (only title required)
 * @returns Complete TaskCreate object with smart defaults
 */
export function calculateSmartDefaults(task: Partial<TaskCreate>): TaskCreate {
  const now = new Date()
  const dueDate = task.due_date ? new Date(task.due_date) : null
  const duration = task.estimated_duration ?? 30

  // Auto-calculate priority based on urgency (NOW vs NOT NOW)
  let priority_score = 50 // default: medium
  if (dueDate) {
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursUntilDue < 24) {
      priority_score = 90 // Due TODAY = high priority
    } else if (hoursUntilDue < 72) {
      priority_score = 70 // Due THIS WEEK = medium-high priority
    } else if (hoursUntilDue < 168) {
      priority_score = 50 // Due within 7 days = medium priority
    } else {
      priority_score = 30 // Due LATER = low priority
    }
  }

  // Derive priority label from score
  const priority: 'high' | 'medium' | 'low' =
    priority_score >= 67 ? 'high' :
    priority_score >= 34 ? 'medium' :
    'low'

  // Auto-calculate value based on duration (quick wins = high value)
  let value_score = 50 // default: medium value
  if (duration < 15) {
    value_score = 90 // Quick win (< 15 min)
  } else if (duration < 30) {
    value_score = 70
  } else if (duration < 60) {
    value_score = 50
  } else {
    value_score = 30 // Long task (>= 60 min)
  }

  // Effort equals duration
  const effort_score = duration

  return {
    title: task.title || '',
    description: task.description,
    notes: task.notes,
    priority,
    priority_score,
    status: task.status || 'backlog',
    start_date: task.start_date,
    due_date: task.due_date,
    start_date_natural: task.start_date_natural,
    due_date_natural: task.due_date_natural,
    estimated_duration: duration,
    effort_score,
    value_score,
    theme_id: task.theme_id,
    initiative_id: task.initiative_id,
  }
}
