import { addDays, dateKey, shortDate, startOfWeek, weekKey } from './dates'
import { gradeRank, toYds, V_GRADES, YDS_GRADES } from './grades'
import { isCompleted, type Climb, type Database, type Grade } from './types'

function highest(climbs: Climb[]): Grade | null {
  return climbs.reduce<Grade | null>((best, climb) => !best || gradeRank(climb.grade) > gradeRank(best) ? climb.grade : best, null)
}
export function overview(db: Database, today = new Date()) {
  const start = weekKey(today)
  const end = dateKey(addDays(startOfWeek(today), 7))
  const sessions = db.sessions.filter(s => s.date >= start && s.date < end)
  const ids = new Set(sessions.map(s => s.id))
  const climbs = db.climbs.filter(c => ids.has(c.sessionId))
  const completed = climbs.filter(c => isCompleted(c.result))
  const allCompleted = db.climbs.filter(c => isCompleted(c.result))
  return {
    weeklySessions: sessions.length,
    totalSessions: db.sessions.length,
    weeklyCompleted: completed.length,
    weeklyMinutes: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    weeklyBoulder: highest(completed.filter(c => c.grade.system === 'v')),
    weeklyRope: highest(completed.filter(c => c.grade.system !== 'v')),
    bestBoulder: highest(allCompleted.filter(c => c.grade.system === 'v')),
    bestRope: highest(allCompleted.filter(c => c.grade.system !== 'v')),
    completionRate: db.climbs.length ? Math.round(allCompleted.length / db.climbs.length * 100) : 0,
    totalCompleted: allCompleted.length,
    totalMinutes: db.sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
  }
}
export function weeklyVolume(db: Database, today = new Date(), count = 8) {
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(startOfWeek(today), (i - count + 1) * 7)
    const key = dateKey(start)
    const end = dateKey(addDays(start, 7))
    const sessions = db.sessions.filter(s => s.date >= key && s.date < end)
    const ids = new Set(sessions.map(s => s.id))
    return { key, label: shortDate(key), sessions: sessions.length, minutes: sessions.reduce((sum, s) => sum + s.durationMinutes, 0), completed: db.climbs.filter(c => ids.has(c.sessionId) && isCompleted(c.result)).length }
  })
}
export function difficultyPyramid(db: Database, kind: 'boulder' | 'rope') {
  const counts = new Map<string, number>()
  db.climbs.filter(c => isCompleted(c.result) && (kind === 'boulder' ? c.grade.system === 'v' : c.grade.system !== 'v')).forEach(c => {
    const label = kind === 'boulder' ? c.grade.value : toYds(c.grade)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  })
  const grades = kind === 'boulder' ? V_GRADES : YDS_GRADES
  return [...counts.entries()].sort(([a], [b]) => grades.indexOf(b) - grades.indexOf(a)).map(([grade, count]) => ({ grade, count }))
}

export function weeklyDifficulty(db: Database, type: 'boulder' | 'lead' | 'toprope', today = new Date(), count = 8) {
  return weeklyVolume(db, today, count).map(week => {
    const end = dateKey(addDays(new Date(`${week.key}T12:00:00`), 7))
    const ids = new Set(db.sessions.filter(s => s.type === type && s.date >= week.key && s.date < end).map(s => s.id))
    const best = highest(db.climbs.filter(c => ids.has(c.sessionId) && isCompleted(c.result)))
    return { key: week.key, label: week.label, grade: best, rank: best ? gradeRank(best) : null }
  })
}
