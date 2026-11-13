import { dateKey, parseDate } from './dates'
import type { Session } from './types'

/** Monday-first local dates; null cells keep adjacent months out of this month's grid. */
export function monthCells(selectedDate: string): (string | null)[] {
  const selected = parseDate(selectedDate)
  const first = new Date(selected.getFullYear(), selected.getMonth(), 1, 12)
  const count = new Date(selected.getFullYear(), selected.getMonth() + 1, 0, 12).getDate()
  const offset = (first.getDay() + 6) % 7
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1
    return day >= 1 && day <= count
      ? dateKey(new Date(first.getFullYear(), first.getMonth(), day, 12))
      : null
  })
}
/** Preserve the chosen day where possible, clamping e.g. Jan 31 to Feb 28. */
export function shiftMonth(selectedDate: string, amount: number): string {
  const selected = parseDate(selectedDate)
  const target = new Date(selected.getFullYear(), selected.getMonth() + amount, 1, 12)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate()
  target.setDate(Math.min(selected.getDate(), lastDay))
  return dateKey(target)
}
export function countSessionsByDate(sessions: Session[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const session of sessions) counts.set(session.date, (counts.get(session.date) ?? 0) + 1)
  return counts
}
