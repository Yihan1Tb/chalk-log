import { addDays, dateKey, startOfWeek } from './dates'
import {
  emptyDatabase,
  isClimbing,
  type ClimbResult,
  type Database,
  type SessionType,
} from './types'

/** Deterministic IDs make loading the same sample week idempotent. No future sessions. */
export function createExamples(today = new Date()): Database {
  const db = emptyDatabase()
  const current = dateKey(today)
  for (let week = 0; week < 8; week++) {
    const monday = addDays(startOfWeek(today), (week - 7) * 7)
    const plan: [number, SessionType][] = [
      [0, 'boulder'],
      [2, week % 2 ? 'lead' : 'toprope'],
      [5, 'boulder'],
    ]
    if (week % 2 === 0) plan.push([4, week % 4 === 0 ? 'strength' : 'hangboard'])
    if (week === 5) plan.push([6, 'cardio'])
    for (const [offset, type] of plan) {
      const date = dateKey(addDays(monday, offset))
      if (date > current) continue
      const id = `example-${date}-${type}`
      const timestamp = `${date}T12:00:00.000Z`
      db.sessions.push({
        id,
        date,
        type,
        venue: isClimbing(type) ? (offset === 5 ? '山野攀岩馆' : '岩点攀岩馆') : '日常训练',
        rpe: type === 'cardio' ? 4 : 6 + (week % 3),
        durationMinutes: isClimbing(type) ? 75 + (week % 3) * 15 : 30 + (week % 2) * 10,
        source: 'example',
        createdAt: timestamp,
        updatedAt: timestamp,
        notes:
          type === 'boulder'
            ? [
                '先热身，再练脚点。今天的重心转移更顺了。',
                '同一条线路换了一个解法，终于找到发力节奏。',
                '给每次尝试留足休息，动作质量比次数更重要。',
              ][week % 3]
            : type === 'lead'
              ? '练习稳定呼吸和挂绳节奏。'
              : type === 'toprope'
                ? '多做连续攀爬，保持动作流畅。'
                : '轻量辅助训练，记录身体的状态。',
      })
      if (isClimbing(type)) {
        const grades =
          type === 'boulder'
            ? ['V1', 'V2', 'V3', week >= 3 ? 'V4' : 'V3', week >= 5 ? 'V5' : 'V4']
            : type === 'lead'
              ? ['5.8', '5.9', '5.10a', '5.10b']
              : ['5.9', '5.10a', '5.10c', '5.11a', '5.11b']
        grades.forEach((grade, index) => {
          const result: ClimbResult =
            index < 2
              ? 'flash'
              : index === grades.length - 1
                ? week % 2
                  ? 'project'
                  : 'attempt'
                : (grade === 'V4' && week < 5) || (grade === '5.11a' && week < 3)
                  ? 'project'
                  : 'send'
          db.climbs.push({
            id: `${id}-climb-${index}`,
            sessionId: id,
            grade: { system: type === 'boulder' ? 'v' : 'yds', value: grade },
            attempts: result === 'flash' ? 1 : 2 + ((week + index) % 4),
            result,
            notes: result === 'project' ? '下次继续，已经找到关键动作。' : '',
          })
        })
      } else {
        db.training.push({
          id: `${id}-training-0`,
          sessionId: id,
          exercise:
            type === 'strength' ? '辅助引体向上' : type === 'hangboard' ? '双手悬挂' : '轻松慢跑',
          sets: type === 'cardio' ? 1 : 4,
          reps: type === 'strength' ? 6 : 0,
          weightKg: 0,
          durationSeconds: type === 'hangboard' ? 10 : type === 'cardio' ? 2400 : 0,
        })
      }
    }
  }
  return db
}
